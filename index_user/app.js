// app.js - Version: Full Update with Admin Trade Settings

// --- 0. Path Helper ---
function getPathConfig() {
    const path = window.location.pathname;
    const isInSubfolder = path.includes("index_user");
    return {
        homeLink: isInSubfolder ? "../index.html" : "index.html",
        prefix: isInSubfolder ? "" : "index_user/",
        isInSubfolder: isInSubfolder
    };
}

// --- 1. Security Check ---
(function() {
    const pathConfig = getPathConfig();
    const page = window.location.pathname.split("/").pop();
    const publicPages = ['login.html', 'register.html'];
    const isHomePage = page === 'index.html' || page === ''; 

    const user = localStorage.getItem('currentUser');
    
    if (!user) {
        if (!publicPages.includes(page) && !isHomePage) {
             window.location.href = pathConfig.prefix + 'login.html';
        }
        if (isHomePage) {
             window.location.href = pathConfig.prefix + 'login.html';
        }
    } else {
        if (publicPages.includes(page)) {
            window.location.href = pathConfig.homeLink;
        }
    }
})();

// --- 2. Global Variables ---
var userData = localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')) : null;
var currentBalance = userData ? parseFloat(userData.balance || 0) : 0;
var realDocId = userData ? (userData.docId || userData.id) : null;
var currentLevelConfig = null;
var currentMatchedOrder = null;
var withdrawInfo = { bankName: '', accName: '', accNo: '', frozen: 0, feeRate: 5, available: 0, pendingWithdraw: 0, minWithdraw: 0 };
var totalFrozenAmount = localStorage.getItem('frozenAmount') ? parseFloat(localStorage.getItem('frozenAmount')) : 0;
var notifStore = { general: [], withdraw: [], recharge: [] };
var unsubscribeUser = null;
var unsubscribeFrozen = null;
var lastRandomIndex = -1; 
var heartbeatInterval = null;

// --- 3. Helper Functions ---

// ✅ ฟังก์ชันดึงค่าตั้งค่า (เลือกใช้ระหว่าง VIP หรือ ค่าที่ Admin ตั้งให้ส่วนตัว)
function getEffectiveConfig() {
    // 1. เอาค่ามาตรฐานจากระดับ VIP มาตั้งต้น
    let cfg = currentLevelConfig ? { ...currentLevelConfig } : { rate: 0, orders: 0, min_withdraw: 0, withdraw_limit: 0 };

    if (userData) {
        // 2. เช็คว่ามีค่า "เป้าหมายคำสั่งซื้อ" พิเศษไหม
        if (userData.req_orders && parseInt(userData.req_orders) > 0) {
            cfg.orders = parseInt(userData.req_orders);
        }
        
        // 3. เช็คว่ามี "เรทคอมมิชชั่น" พิเศษไหม
        if (userData.custom_rate && parseFloat(userData.custom_rate) > 0) {
            cfg.rate = parseFloat(userData.custom_rate);
        }

        // 4. เช็ค "จำกัดจำนวนครั้งถอน"
        if (userData.withdraw_limit && parseInt(userData.withdraw_limit) > 0) {
            cfg.withdraw_limit = parseInt(userData.withdraw_limit);
        }

        // 5. เช็ค "ถอนขั้นต่ำ"
        if (userData.min_withdraw && parseFloat(userData.min_withdraw) > 0) {
            cfg.min_withdraw_amount = parseFloat(userData.min_withdraw);
        }
    }
    return cfg;
}

function setTxt(id, txt) { const el = document.getElementById(id); if (el) el.innerText = txt; }
function formatMoney(amount) { return '฿' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 }); }
function showModal(id) { const el = document.getElementById(id); if(el) { el.classList.remove('hidden'); el.classList.add('flex'); } }
function hideModal(id) { const el = document.getElementById(id); if(el) { el.classList.add('hidden'); el.classList.remove('flex'); } }
function closeAllModals() { document.querySelectorAll('[id^="modal-"]').forEach(el => { el.classList.add('hidden'); el.classList.remove('flex'); }); }

// ✅ ฟังก์ชันกดดาว
window.setStars = (n) => {
    const stars = document.querySelectorAll('#star-container i');
    stars.forEach((s, index) => {
        if(index < n) {
            s.classList.remove('text-gray-300');
            s.classList.add('text-yellow-400');
        } else {
            s.classList.remove('text-yellow-400');
            s.classList.add('text-gray-300');
        }
    });
    const container = document.getElementById('star-container');
    if (container) container.setAttribute('data-rating', n);
}

// Timeout Wrapper
const withTimeout = (promise, ms = 20000) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("การเชื่อมต่อล่าช้า (Timeout)")), ms))
]);

function showCustomAlert(title, message, isSuccess = false) {
    const el = document.getElementById('modal-custom-alert');
    if(el) {
        document.getElementById('alert-title').innerText = title;
        document.getElementById('alert-msg').innerHTML = message.replace(/\n/g, '<br>');
        const iconEl = document.getElementById('alert-icon-container');
        if (isSuccess) {
            iconEl.innerHTML = '<i class="fa-solid fa-circle-check text-3xl text-green-500"></i>';
            iconEl.className = 'w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3';
        } else {
            iconEl.innerHTML = '<i class="fa-solid fa-circle-exclamation text-3xl text-red-500"></i>';
            iconEl.className = 'w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3';
        }
        showModal('modal-custom-alert');
    } else { alert(`${title}\n${message}`); }
}

// --- 4. Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    injectUniversalModals();
    injectBottomNav();
    calculateAndShowBalance(); 

    let attempts = 0;
    const checkDB = setInterval(() => {
        attempts++;
        if(window.db) {
            clearInterval(checkDB);
            startSystem();
        } else if (attempts > 30) { 
            clearInterval(checkDB);
            console.error("Firebase DB connection failed.");
        }
    }, 500);
});

function startSystem() {
    setupRealtimeUser();
    setupNoIndexNotifications(); 
    fetchLevelConfig();
    setupPendingWithdrawalMonitor();
    setupFrozenMonitor();
    startHeartbeat();
}

function startHeartbeat() {
    if (!realDocId || !window.db) return;
    if (heartbeatInterval) return;
    
    updateStatus();
    heartbeatInterval = setInterval(updateStatus, 120000); 
    
    function updateStatus() {
        window.db.collection("users").doc(realDocId).update({
            last_active: new Date().toISOString(),
            online: true 
        }).catch(err => console.warn("Heartbeat skipped:", err.code));
    }
}

// --- 5. Navbar ---
function injectBottomNav() {
    const navContainer = document.getElementById('bottom-nav');
    if (!navContainer) return;

    const pathConfig = getPathConfig();
    const currentPage = window.location.pathname.split("/").pop() || 'index.html';

    const menuItems = [
        { name: 'Home', link: pathConfig.homeLink, icon: 'fa-house', id: 'index.html' },
        { name: 'Order', link: pathConfig.prefix + 'index_order.html', icon: 'fa-file-invoice', id: 'index_order.html' },
        { name: 'Task', link: pathConfig.prefix + 'work.html', icon: 'fa-list-check', id: 'work.html' },
        { name: 'Service', link: pathConfig.prefix + 'service.html', icon: 'fa-headset', id: 'service.html' },
        { name: 'My', link: pathConfig.prefix + 'profile.html', icon: 'fa-user', id: 'profile.html' }
    ];

    let html = `<nav class="bg-[#DC2626] text-white sticky bottom-0 w-full z-50 h-16 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] flex justify-around items-center px-2">`;
    menuItems.forEach(item => {
        const isActive = currentPage === item.id; 
        const activeClass = isActive ? 'opacity-100 scale-105 font-bold' : 'opacity-60 hover:opacity-100';
        html += `<a href="${item.link}" class="flex flex-col items-center justify-center w-14 transition duration-200 ${activeClass}"><i class="fa-solid ${item.icon} text-xl mb-1"></i><span class="text-[10px] uppercase tracking-wide">${item.name}</span></a>`;
    });
    html += `</nav>`;
    navContainer.innerHTML = html;
}

// --- 6. Modal Injection ---
function injectUniversalModals() {
    const container = document.getElementById('modal-container');
    if(!container) return;
    // (เนื้อหา Modal เหมือนเดิม ตัดทอนเพื่อประหยัดพื้นที่ แต่คุณใช้ของเดิมที่มีอยู่แล้วได้เลย)
    // หมายเหตุ: โค้ดนี้จะใช้ Modal ชุดเดิมที่คุณมีในไฟล์เก่าได้
    // ผมใส่แบบย่อไว้ให้ ถ้าคุณก๊อปไปแล้ว Modal หาย ให้ใช้โค้ด Modal เดิมนะครับ
    
    // ... (เพื่อให้โค้ดไม่ยาวเกินไป ผมใช้ HTML เดิมของคุณ)
    // ตรงนี้ผมขออนุญาตใช้ innerHTML แบบเดิมที่คุณมีนะครับ
    // ******************************************************
    
    container.innerHTML = `
    <div id="modal-custom-alert" class="fixed inset-0 z-[100] bg-black/60 hidden items-center justify-center p-6 font-sans backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"><div class="bg-white rounded-2xl w-full max-w-xs p-6 text-center shadow-2xl"><div id="alert-icon-container" class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">...</div><h3 id="alert-title" class="text-lg font-bold text-gray-800 mb-2">...</h3><div id="alert-msg" class="text-sm text-gray-500 mb-6 leading-relaxed">...</div><button onclick="hideModal('modal-custom-alert')" class="w-full bg-[#DC2626] text-white py-3 rounded-xl font-bold shadow-lg hover:bg-red-700 active:scale-95 transition text-sm">ตกลง</button></div></div>
    
    <div id="modal-matched-order" class="fixed inset-0 z-[90] bg-black/60 hidden items-center justify-center p-4 font-sans backdrop-blur-sm">
        <div class="w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden relative animate-[scaleIn_0.2s_ease-out] flex flex-col max-h-[90vh]">
            <div class="bg-[#DC2626] text-white p-3 flex justify-between items-center shadow-md shrink-0">
                <span class="font-bold text-sm"><i class="fa-solid fa-circle-check mr-2"></i>Order Matched!</span>
                <button onclick="hideModal('modal-matched-order')" class="text-white hover:text-gray-200 transition"><i class="fa-solid fa-xmark text-lg"></i></button>
            </div>
            <div class="p-5 overflow-y-auto custom-scroll">
                <div class="flex justify-between text-[10px] text-gray-400 border-b border-gray-100 pb-2 mb-4">
                    <span id="match-time">...</span><span id="match-id">Order ID: ...</span>
                </div>
                <div class="flex gap-4 items-start mb-4">
                    <div id="match-img" class="w-20 h-20 bg-gray-100 rounded-lg bg-cover bg-center shrink-0 border border-gray-200 shadow-sm"></div>
                    <div class="flex-1 space-y-1">
                        <div id="match-name" class="text-xs font-bold text-gray-800 line-clamp-2 leading-relaxed">...</div>
                        <div class="text-lg font-bold text-[#DC2626]" id="match-price">...</div>
                    </div>
                </div>
                <div class="bg-gray-50 p-3 rounded-lg text-sm border border-gray-100 space-y-2 mb-4">
                    <div class="flex justify-between items-center"><span class="text-gray-500 text-xs">Total Order</span><span id="match-total" class="font-bold text-gray-800">...</span></div>
                    <div class="flex justify-between items-center"><span class="text-gray-500 text-xs">Commission</span><span id="match-comm" class="font-bold text-green-600 text-lg">...</span></div>
                    <div class="flex justify-between items-center pt-2 border-t border-dashed border-gray-200 mt-2"><span class="text-gray-500 text-xs">Return Amount</span><span id="match-return" class="font-bold text-[#DC2626]">...</span></div>
                </div>
                <div class="border-t border-gray-100 pt-4 mb-2">
                    <div class="flex justify-between items-center mb-3">
                        <span class="text-xs font-bold text-gray-600">Order Rating</span>
                        <div class="flex gap-1" id="star-container" data-rating="5">
                            <i class="fa-solid fa-star text-yellow-400 cursor-pointer text-sm" onclick="setStars(1)"></i>
                            <i class="fa-solid fa-star text-yellow-400 cursor-pointer text-sm" onclick="setStars(2)"></i>
                            <i class="fa-solid fa-star text-yellow-400 cursor-pointer text-sm" onclick="setStars(3)"></i>
                            <i class="fa-solid fa-star text-yellow-400 cursor-pointer text-sm" onclick="setStars(4)"></i>
                            <i class="fa-solid fa-star text-yellow-400 cursor-pointer text-sm" onclick="setStars(5)"></i>
                        </div>
                    </div>
                    <div>
                        <span class="text-xs font-bold text-gray-600 mb-1 block">Order Review</span>
                        <select id="submit-review-select" class="w-full border border-gray-200 rounded p-2 text-[10px] text-gray-600 bg-gray-50 focus:border-[#DC2626] outline-none">
                            <option value="The product quality is excellent and exactly matches the description.">The product quality is excellent and exactly matches the description.</option>
                            <option value="I am very satisfied with this product and will purchase again.">I am very satisfied with this product and will purchase again.</option>
                            <option value="I am very pleased with the reasonable price.">I am very pleased with the reasonable price.</option>
                            <option value="This shopping experience is highly satisfactory.">This shopping experience is highly satisfactory.</option>
                            <option value="Fast delivery and good service.">Fast delivery and good service.</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="p-4 pt-0 shrink-0">
                <button id="btn-submit-order" onclick="confirmMatchSubmit()" class="w-full bg-[#DC2626] text-white py-3 rounded-lg font-bold shadow-lg hover:bg-red-700 active:scale-95 transition text-sm uppercase tracking-wide">Submit Order Now</button>
            </div>
        </div>
    </div>

    <div id="modal-deposit-step1" class="fixed inset-0 bg-black/70 hidden items-center justify-center z-[60] p-4 font-sans backdrop-blur-sm" onclick="if(event.target===this) hideModal('modal-deposit-step1')"><div class="bg-white rounded-xl w-full max-w-xs p-6 text-center relative animate-[scaleIn_0.2s_ease-out]"><button onclick="hideModal('modal-deposit-step1')" class="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"><i class="fa-solid fa-xmark text-lg"></i></button><div class="w-12 h-12 bg-red-50 text-[#DC2626] rounded-full flex items-center justify-center mx-auto mb-3"><i class="fa-solid fa-lock text-xl"></i></div><h3 class="font-bold mb-2 text-gray-800">ยืนยันตัวตน</h3><p class="text-xs text-gray-500 mb-4">กรุณากรอกรหัสผ่านเพื่อดำเนินการต่อ</p><input type="password" id="deposit-password" class="w-full border border-gray-200 bg-gray-50 p-3 mb-4 rounded-lg text-center outline-none focus:border-[#DC2626] transition text-sm" placeholder="รหัสผ่านของคุณ"><button onclick="verifyDepositPassword()" class="w-full bg-[#DC2626] text-white py-2.5 rounded-lg font-bold shadow-md hover:bg-red-700 transition text-sm">ยืนยัน</button></div></div>
    <div id="modal-deposit-step2" class="fixed inset-0 bg-black/70 hidden items-center justify-center z-[60] p-4 font-sans backdrop-blur-sm" onclick="if(event.target===this) closeAllModals()"><div class="bg-white rounded-xl w-full max-w-xs p-5 relative animate-[scaleIn_0.2s_ease-out]"><button onclick="closeAllModals()" class="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"><i class="fa-solid fa-xmark text-lg"></i></button><h3 class="font-bold text-center mb-2 text-lg">ระบุยอดเงิน</h3><p class="text-xs text-center text-gray-500 mb-2">ขั้นต่ำ: <span id="dep-min" class="font-bold text-red-500">...</span></p><input type="number" id="deposit-amount" class="w-full border-b-2 border-red-200 text-center text-2xl font-bold p-2 mb-4 outline-none text-[#DC2626] placeholder-gray-300 transition focus:border-red-500" placeholder="0.00"><button id="btn-confirm-deposit" onclick="confirmDepositInput()" class="w-full bg-[#DC2626] text-white py-2.5 rounded-lg font-bold shadow-md hover:bg-red-700 transition text-sm">แจ้งเติมเงิน</button></div></div>
    <div id="modal-deposit-success" class="fixed inset-0 bg-black/60 hidden items-center justify-center z-[90] p-4 font-sans backdrop-blur-sm"><div class="bg-white rounded-xl w-full max-w-xs p-6 text-center animate-[scaleIn_0.2s_ease-out]"><div class="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500 text-3xl"><i class="fa-solid fa-check"></i></div><h3 class="font-bold text-lg text-gray-800">แจ้งเติมเงินสำเร็จ</h3><p class="text-sm text-gray-500 mt-2 mb-4">รายการของคุณถูกส่งแล้ว<br>กรุณาติดต่อ Admin เพื่อยืนยันยอดเงิน</p><button onclick="showAdminQR()" class="w-full bg-[#06C755] text-white py-3 rounded-lg font-bold shadow-md hover:bg-green-600 transition mb-2"><i class="fa-brands fa-line mr-1"></i> ติดต่อ Admin</button><button onclick="closeAllModals()" class="text-xs text-gray-400 hover:text-gray-600 mt-2">ปิดหน้าต่าง</button></div></div>
    
    <div id="modal-low-balance" class="fixed inset-0 bg-black/60 hidden items-center justify-center z-[80] p-4 font-sans" onclick="if(event.target===this) hideModal('modal-low-balance')"><div class="bg-white rounded-xl w-full max-w-xs p-6 text-center"><div class="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3"><i class="fa-solid fa-coins text-xl"></i></div><h3 class="text-lg font-bold text-gray-800">ยอดเงินไม่พอ</h3><p class="text-sm text-gray-500 my-2">ต้องการขั้นต่ำ: <span id="lb-min" class="text-red-600 font-bold">...</span></p><div class="flex gap-2"><button onclick="hideModal('modal-low-balance')" class="flex-1 py-2 bg-gray-100 rounded text-sm font-bold">ยกเลิก</button><button onclick="window.location.href='profile.html'" class="flex-1 py-2 bg-[#DC2626] text-white rounded text-sm font-bold">เติมเงิน</button></div></div></div>
    <div id="modal-withdraw-step1" class="fixed inset-0 bg-black/60 hidden items-center justify-center z-[80] p-4 font-sans backdrop-blur-sm" onclick="if(event.target===this) hideModal('modal-withdraw-step1')"><div class="bg-white rounded-xl w-full max-w-sm p-5 relative animate-[scaleIn_0.2s_ease-out]"><button onclick="hideModal('modal-withdraw-step1')" class="absolute top-2 right-2 text-gray-400"><i class="fa-solid fa-xmark text-lg"></i></button><h3 class="font-bold text-center text-lg mb-4">ข้อมูลบัญชีรับเงิน</h3><div class="space-y-3"><div><label class="text-xs text-gray-500">ธนาคาร</label><input type="text" id="wd-bank-name" class="w-full border rounded p-2 text-sm" placeholder="เช่น กสิกรไทย, KBank"></div><div><label class="text-xs text-gray-500">ชื่อบัญชี</label><input type="text" id="wd-acc-name" class="w-full border rounded p-2 text-sm" placeholder="ชื่อ-นามสกุล"></div><div><label class="text-xs text-gray-500">เลขที่บัญชี</label><input type="number" id="wd-acc-no" class="w-full border rounded p-2 text-sm" placeholder="ไม่ต้องมีขีด"></div></div><button onclick="goToWithdrawStep2()" class="w-full bg-[#DC2626] text-white py-3 rounded-lg font-bold shadow-md hover:bg-red-700 active:scale-95 transition mt-5 text-sm">ถัดไป</button></div></div>
    
    <div id="modal-withdraw-step2" class="fixed inset-0 bg-black/60 hidden items-center justify-center z-[80] p-4 font-sans backdrop-blur-sm" onclick="if(event.target===this) hideModal('modal-withdraw-step2')">
        <div class="bg-white rounded-xl w-full max-w-sm p-5 relative animate-[scaleIn_0.2s_ease-out]">
            <button onclick="hideModal('modal-withdraw-step2')" class="absolute top-2 right-2 text-gray-400"><i class="fa-solid fa-xmark text-lg"></i></button>
            <h3 class="font-bold text-center text-lg mb-2">รายละเอียดการถอน</h3>
            
            <div class="bg-gray-50 p-3 rounded-lg text-xs space-y-2 mb-4 border border-gray-100">
                <div class="flex justify-between"><span>ยอดเงินสุทธิ (Net):</span> <span id="wd-total" class="font-bold text-black">...</span></div>
                <div class="flex justify-between text-red-500"><span>ถูกแช่แข็ง (Frozen):</span> <span id="wd-frozen-show">...</span></div>
                <div class="border-t border-dashed border-gray-300 my-1"></div>
                <div class="flex justify-between text-base font-bold text-[#DC2626]"><span>ถอนได้จริง:</span> <span id="wd-available">...</span></div>
            </div>

            <div class="relative mb-2">
                <input type="number" id="withdraw-amount" class="w-full border-2 border-red-100 rounded-lg p-3 pr-16 text-xl font-bold text-[#DC2626] outline-none focus:border-[#DC2626] transition" placeholder="0.00" oninput="calculateRealTimeFee(this.value)">
                <button onclick="fillMaxWithdraw()" class="absolute right-2 top-2 bottom-2 px-3 bg-red-100 text-[#DC2626] text-xs font-bold rounded hover:bg-red-200">MAX</button>
            </div>

            <div class="flex justify-between text-xs text-gray-500 mt-2 mb-1">
                <span>หักค่าธรรมเนียม (<span id="wd-fee-rate">5</span>%):</span>
                <span id="wd-fee-actual" class="font-medium text-red-500">฿0.00</span>
            </div>
            <div class="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4">
                <span class="text-xs font-bold text-gray-600">ยอดเงินที่จะได้รับ:</span>
                <span id="wd-net-amount" class="text-2xl font-bold text-green-600">฿0.00</span>
            </div>

            <input type="password" id="withdraw-password" class="w-full border border-gray-200 rounded-lg p-2 text-center text-sm mb-4" placeholder="รหัสผ่านยืนยัน">
            <button onclick="confirmWithdrawal()" class="w-full bg-[#DC2626] text-white py-3 rounded-lg font-bold shadow-md hover:bg-red-700 active:scale-95 transition text-sm">ยืนยันการถอน</button>
        </div>
    </div>

    <div id="modal-withdraw-success" class="fixed inset-0 bg-black/60 hidden items-center justify-center z-[90] p-4 font-sans backdrop-blur-sm"><div class="bg-white rounded-xl w-full max-w-xs p-6 text-center animate-[scaleIn_0.2s_ease-out]"><div class="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500 text-3xl"><i class="fa-solid fa-check"></i></div><h3 class="font-bold text-lg text-gray-800">ดำเนินการแล้ว</h3><p class="text-sm text-gray-500 mt-2 mb-4">รายการถอนของคุณถูกส่งแล้ว<br>กรุณาติดต่อ Admin เพื่ออนุมัติยอดเงิน</p><button onclick="showAdminQR()" class="w-full bg-[#06C755] text-white py-3 rounded-lg font-bold shadow-md hover:bg-green-600 transition mb-2"><i class="fa-brands fa-line mr-1"></i> ติดต่อ Admin</button><button onclick="closeAllModals()" class="text-xs text-gray-400 hover:text-gray-600 mt-2">ปิดหน้าต่าง</button></div></div>
    <div id="modal-admin-qr" class="fixed inset-0 bg-black/80 hidden items-center justify-center z-[100] p-4 font-sans backdrop-blur-sm"><div class="bg-white rounded-xl w-full max-w-xs p-5 relative text-center"><button onclick="hideModal('modal-admin-qr')" class="absolute top-2 right-2 text-gray-400"><i class="fa-solid fa-xmark text-lg"></i></button><h3 class="font-bold text-gray-800 mb-4">Scan to Contact Admin</h3><div class="bg-gray-100 w-48 h-48 mx-auto rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 mb-4 overflow-hidden"><img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://line.me/ti/p/~admin_id" class="w-full h-full object-cover"></div><p class="text-xs text-gray-500">แคปหน้าจอเพื่อสแกนในไลน์</p></div></div>
    
    <div id="floating-notif" class="fixed top-14 right-2 w-72 bg-white shadow-xl rounded-xl border border-gray-100 z-[100] hidden flex-col max-h-[400px] overflow-y-auto mr-auto max-w-xl" style="right: max(0.5rem, calc(50% - 280px));"><div class="p-3 border-b border-gray-100 bg-gray-50 font-bold text-xs text-gray-600 flex justify-between items-center"><span>การแจ้งเตือน</span><span class="text-[10px] text-gray-400 cursor-pointer" onclick="toggleFloatingNotif()">ปิด</span></div><div id="notif-list" class="divide-y divide-gray-50"><div class="p-4 text-center text-xs text-gray-400">กำลังโหลด...</div></div></div>
    
    <div id="about-us" class="fixed inset-0 z-[150] bg-[#f3f4f6] hidden flex-col w-full h-full font-sans max-w-xl mx-auto left-0 right-0"><div class="bg-[#DC2626] text-white h-14 flex items-center px-4 shadow-md shrink-0 sticky top-0 z-50 justify-between"><button onclick="toggleAboutUs()" class="hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition"><i class="fa-solid fa-chevron-left text-lg"></i></button><h1 class="text-lg font-bold">เกี่ยวกับเรา</h1><div class="w-8"></div></div><div class="flex-1 overflow-y-auto p-4 custom-scroll pb-20"><div class="bg-white rounded-xl shadow-sm p-5 mb-6">
    <div class="text-right text-xs text-gray-400 mb-4">About Us</div>
   <p>We are global consumer industry experts, with over fifty years of experience both as a consultant and as a client.
Recent projects and assignments completed by our Directors include:</p>
                        <p>Head of Procurement - Global Cosmetics Business, UK</p>
                        <p>Director of Supply Chain EMEA - Global Personal Care Business, Geneva</p>
                        <p>Completed eCommerce Transformation Project - International Consumer Brand, UK</p>
                        <p>Director of Distribution Center - International Retailer - North Carolina, USA</p>
                        <p>VP of HR Supply Chain - Global Beauty Business, Paris</p>
                        <p>Market Map - Senior CFO Map - Consumer Goods Business, Germany</p>
                        <p>Senior Brand Director - Food & Agribusiness, Netherlands</p>
                        <p>How we do it</p>
                        <p>Five core values underpin everything we do.</p>
						
						 <p>First and foremost, we are experts in our chosen sector and ensure that we remain at the forefront of industry change and trends.</p>
                        <p>We work with clients believing that working with clients rather than representing them will consistently produce the right results.</p>
                        <p>We are agile, fully aware of and understanding the business needs that drive demand, and offer flexible and rapid solutions.</p>
                        <p>We are 100% dedicated to successful results and pride ourselves on our ability to deliver on time and repeatedly.</p>
                        <p>Above all, we are committed to delivering services that set us apart and build long-term, mutually beneficial relationships.</p>
                        <p>What We Do</p>
                        <p>Consumer Search Partners specializes in identifying and attracting the industry's top talent who can drive performance across the global consumer industry. Our expertise is built on our experience and understanding of industry trends and
						shifts.</p>
						<p>Trends and Markets CSPs partner with companies in the consumer sector, constantly seeking to identify trends and capitalize on growth in emerging markets. They also seek to acquire or partner with companies to reach consumers.
						Innovation CSPs partner with consumer companies through their innovation as a strategy for growth. Many of these companies use agile workflows to guide the development of new ideas, as opposed to the more structured and time-consuming traditional testing approach. Today's consumer goods businesses are innovating heavily through venture capital and consumer partnerships, while maintaining a focus on health and wellness products.
						M&A CSP partners with companies in the consumer goods industry looking to expand across geographies and reach markets that can drive both sales and profits.
						Digital Transformation CSP partners with companies in the consumer goods industry that are creatively and effectively deploying technology to enhance customer engagement and influence the consumer journey.
						Change is an ever-present part of business. In just a few years, we have moved from e-commerce to multi-channel and centralized commerce, creating new technologies, disciplines and expertise. But what has remained constant is the
						need for top talent in a rapidly changing landscape.</p>
                    </div>
    </div></div></div>

    <div id="modal-news" class="fixed inset-0 z-[150] bg-[#f3f4f6] hidden flex-col w-full h-full font-sans max-w-xl mx-auto left-0 right-0"><div class="bg-[#DC2626] text-white h-14 flex items-center px-4 shadow-md shrink-0 sticky top-0 z-50 justify-between"><button onclick="toggleNewsModal()" class="hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition"><i class="fa-solid fa-chevron-left text-lg"></i></button><h1 class="text-lg font-bold">ข่าวสาร</h1><div class="w-8"></div></div><div class="flex-1 overflow-y-auto p-4 custom-scroll pb-20"><div class="bg-white rounded-xl shadow-sm p-5 mb-6">
    <div class="text-right text-xs text-gray-400 mb-4">2023-11-04 18:54:28</div>
    
    <p class="leading-relaxed">
                        เนื่องในโอกาสฉลองครบรอบ 24 ปี CONSUMER PARTNER ได้เปิดตัวกิจกรรมดังต่อไปนี้เพื่อขอบคุณผู้ใช้ใหม่และผู้ใช้เก่าที่ให้การสนับสนุน CONSUMER PARTNER ของเราเป็นอย่างดี
                    </p>
                    
                    <p class="font-bold text-gray-800">กิจกรรมมีดั่งนี้ :</p>
                    
                    <div class="space-y-2 pl-2">
                        <p>เติมเงิน 5,000 บาท, รับโบนัส 666 บาท</p>
                        <p>เติมเงิน 10,000 บาท, รับโบนัส 1,688 บาท</p>
                        <p>เติมเงิน 50,000 บาท, รับโบนัส 8,888 บาท</p>
                        <p>เติมเงิน 100,000 บาท, รับโบนัส 18,888 บาท</p>
                        <p>เติมเงิน 200,000 บาท, รับโบนัส 28,888 บาท</p>
                        <p>เติมเงิน 300,000 บาท, รับโบนัส 38,888 บาท</p>
                        <p>เติมเงิน 500,000 บาท, รับโบนัส 58,888 บาท</p>
                        <p>เติมเงิน 1,000,000 บาท, รับโบนัส 88,888 บาท</p>
                        <p>เติมเงิน 3,000,000 บาท, รับโบนัส 188,888 บาท</p>
                        <p>เติมเงิน 5,000,000 บาท, รับโบนัส 388,888 บาท</p>
                        <p>เติมเงิน 10,000,000 บาท, รับโบนัส 588,888 บาท</p>
                    </div>

                    <p class="leading-relaxed pt-2">
                        หรือรางวัลมากกว่านี้สามารถติดต่อฝ่ายบริการลูกค้าร่วงหน้าเพื่อสอบถามเพิ่มเติม!
                    </p>
                    
                    <p class="pt-4 text-center font-semibold text-[#902A4F]">
                        พวกเราทีมงาน CONSUMER PARTNER ขออวยพรให้ทุกท่านมีความสุข！
                    </p>

                    <div class="text-center text-xs text-gray-400 mt-8">โหลดเสร็จสมบูรณ์</div></div></div></div>
    `;
}

// --- 7. Toggle Functions ---
function toggleAboutUs() { const p=document.getElementById('about-us'); if(p) { p.classList.toggle('hidden'); p.classList.toggle('flex'); } }
function toggleNewsModal() { const p=document.getElementById('modal-news'); if(p) { p.classList.toggle('hidden'); p.classList.toggle('flex'); } }
function toggleFloatingNotif() { const p=document.getElementById('floating-notif'); if(p) { p.classList.toggle('hidden'); p.classList.toggle('flex'); } }

// --- 8. Core Logic ---
function setupRealtimeUser() {
    if (!window.db || !userData) return;
    if (!realDocId || String(realDocId).length < 10) {
        window.db.collection("users").where("username", "==", userData.username).get().then(snap => {
            if(!snap.empty) { realDocId = snap.docs[0].id; userData.docId = realDocId; listenToUserDoc(realDocId); }
        });
    } else { listenToUserDoc(realDocId); }
}

function listenToUserDoc(docId) {
    unsubscribeUser = window.db.collection("users").doc(docId).onSnapshot(doc => {
        if (doc.exists) {
            userData = { docId: doc.id, ...doc.data() };
            localStorage.setItem('currentUser', JSON.stringify(userData));
            currentBalance = parseFloat(userData.balance || 0);
            calculateAndShowBalance(); 
            if(!currentLevelConfig || (currentLevelConfig.name !== userData.level)) fetchLevelConfig();
        }
    });
}

function calculateAndShowBalance() {
    let netAvailable = currentBalance - totalFrozenAmount;
    const txt = formatMoney(netAvailable);
    setTxt('balance-display-1', txt);
    setTxt('balance-display-2', txt);
    setTxt('balance-display-work', txt); 
    setTxt('balance-display-profile', txt);
    try {
        setTxt('profile-name', userData.username); 
        setTxt('work-username', userData.username);
        setTxt('profile-code-display', userData.invite_code); 
        setTxt('profile-level-display', userData.level || 'VIP 1');
        setTxt('work-level-display', userData.level || 'VIP 1');
        setTxt('work-frozen-amount', formatMoney(totalFrozenAmount)); 
        setTxt('wd-frozen-show', formatMoney(totalFrozenAmount));
    } catch(e) {}
}

function updateUI() { if (!userData) return; calculateAndShowBalance(); }

function setupFrozenMonitor() {
    if(!window.db || !userData) return;
    unsubscribeFrozen = window.db.collection("orders").where("username", "==", userData.username).where("status", "==", "frozen").onSnapshot(snap => {
        let frozen = 0;
        snap.forEach(doc => { frozen += parseFloat(doc.data().amount || 0); });
        totalFrozenAmount = frozen;
        localStorage.setItem('frozenAmount', frozen); 
        calculateAndShowBalance();
    });
}

function setupPendingWithdrawalMonitor() {
    if(!window.db || !userData) return;
    window.db.collection("withdrawals").where("username", "==", userData.username).where("status", "==", "pending").onSnapshot(snap => {
        let totalPending = 0;
        snap.forEach(doc => { totalPending += parseFloat(doc.data().amount || 0); });
        withdrawInfo.pendingWithdraw = totalPending;
        setTxt('pending-withdraw-display', formatMoney(totalPending));
        setTxt('wd-pending-show', formatMoney(totalPending));
    });
}

// --- Notifications Logic ---
function setupNoIndexNotifications() {
    if(!window.db || !userData) return;
    window.db.collection("notifications").where("user_id", "==", realDocId).limit(20).onSnapshot(snap => { handleNotifUpdate('general', snap); });
    window.db.collection("withdrawals").where("user_id", "==", realDocId).limit(20).onSnapshot(snap => { handleNotifUpdate('withdraw', snap); });
    window.db.collection("recharges").where("user_id", "==", realDocId).limit(20).onSnapshot(snap => { handleNotifUpdate('recharge', snap); });
}
function handleNotifUpdate(type, snap) {
    let items = [];
    snap.forEach(doc => { items.push({ id: doc.id, ...doc.data(), notifType: type }); });
    notifStore[type] = items;
    renderMixedNotifications();
}
function renderMixedNotifications() {
    const list = document.getElementById('notif-list');
    const dots = document.querySelectorAll('.notif-dot-badge');
    if(!list) return;
    let all = [...notifStore.general, ...notifStore.withdraw, ...notifStore.recharge];
    all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    if(all.length === 0) { list.innerHTML = '<div class="p-4 text-center text-xs text-gray-400">ไม่มีการแจ้งเตือน</div>'; dots.forEach(d => d.classList.add('hidden')); return; }
    let html = ''; let hasUnread = false; 
    all.forEach(n => {
        let title, msg, colorClass, icon;
        const status = (n.status || '').toLowerCase();
        if (n.notifType === 'withdraw') {
            if(status === 'pending' || status === 'รอตรวจสอบ') { title = 'แจ้งถอนเงิน'; msg = `ยอด ${formatMoney(n.amount)} กำลังรอการตรวจสอบ`; colorClass = 'text-orange-500'; icon = 'fa-clock'; }
            else if (status.includes('approved') || status.includes('อนุมัติ')) { title = 'ถอนเงินสำเร็จ'; msg = `ยอด ${formatMoney(n.amount)} อนุมัติแล้ว เงินเข้าบัญชี`; colorClass = 'text-green-600'; icon = 'fa-check-circle'; hasUnread = true; }
            else { title = 'ถอนเงินถูกปฏิเสธ'; msg = `ยอด ${formatMoney(n.amount)} ถูกยกเลิก/ปฏิเสธ`; colorClass = 'text-red-600'; icon = 'fa-times-circle'; hasUnread = true; }
        } else if (n.notifType === 'recharge') {
             if(status === 'pending') { title = 'แจ้งเติมเงิน'; msg = `ยอด ${formatMoney(n.amount)} กำลังรอการตรวจสอบ`; colorClass = 'text-orange-500'; icon = 'fa-clock'; }
            else if (status.includes('approved') || status.includes('อนุมัติ')) { title = 'เติมเงินสำเร็จ'; msg = `ยอด ${formatMoney(n.amount)} เข้ากระเป๋าแล้ว`; colorClass = 'text-green-600'; icon = 'fa-check-circle'; hasUnread = true; }
            else { title = 'เติมเงินล้มเหลว'; msg = `ยอด ${formatMoney(n.amount)} ไม่ผ่านการอนุมัติ`; colorClass = 'text-red-600'; icon = 'fa-times-circle'; hasUnread = true; }
        } else {
            title = n.title; msg = n.message; colorClass = n.read ? 'text-gray-700' : 'text-[#DC2626]'; icon = 'fa-bell'; if(!n.read) hasUnread = true;
        }
        html += `<div class="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 bg-white group"><div class="flex justify-between mb-1"><div class="flex items-center gap-2"><i class="fa-solid ${icon} ${colorClass} text-xs"></i><span class="text-xs font-bold ${colorClass}">${title}</span></div><span class="text-[9px] text-gray-400">${n.timestamp ? new Date(n.timestamp).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''}</span></div><div class="text-[10px] text-gray-500 line-clamp-2 pl-5">${msg}</div></div>`;
    });
    list.innerHTML = html;
    dots.forEach(d => { if(hasUnread) d.classList.remove('hidden'); else d.classList.add('hidden'); });
}

// ✅ FIXED: ใช้ getEffectiveConfig เพื่อแสดงผลค่าที่ถูกต้อง
async function fetchLevelConfig() {
    if (!userData || !window.db) return;
    try {
        const snap = await window.db.collection("levels").where("name", "==", userData.level || "VIP 1").get();
        if(!snap.empty) {
            currentLevelConfig = snap.docs[0].data();
            
            // ✅ เรียกใช้ฟังก์ชันดึงค่าที่ผสมกับค่าส่วนตัวแล้ว
            const effective = getEffectiveConfig();

            // อัปเดตหน้าจอด้วยค่าใหม่
            setTxt('work-rate', (effective.rate * 100).toFixed(2) + "%"); // โชว์ % คอมมิชชั่น
            if(document.getElementById('work-total-orders')) {
                setTxt('work-total-orders', effective.orders); // โชว์เป้าหมายจำนวนงาน
            }
        }
    } catch(e) { console.error(e); }
}

// ✅ FIXED: startGrabbing ใช้ค่า Effective Config
async function startGrabbing() {
    const btn = document.getElementById('start-work-btn');
    if(btn.disabled) return; 

    const originalText = btn.innerHTML;
    
    if(!currentLevelConfig) { 
        await fetchLevelConfig(); 
        if(!currentLevelConfig) return showCustomAlert('กำลังโหลด', 'กรุณารอสักครู่... (Network Slow)'); 
    }
    
    const effective = getEffectiveConfig();
    const netAvailable = currentBalance - totalFrozenAmount;
    const minReq = parseFloat(currentLevelConfig.min_bal || 0);

    if(netAvailable < minReq) { 
        setTxt('lb-min', formatMoney(minReq)); 
        if(totalFrozenAmount > 0) {
            showCustomAlert('ยอดเงินไม่เพียงพอ', `สถานะ: ติด Frozen\n\nยอดสุทธิที่ใช้ได้: ${formatMoney(netAvailable)}\nต้องการขั้นต่ำ: ${formatMoney(minReq)}\n\nกรุณาเติมเงินหรือปลดล็อคออเดอร์`);
        } else {
            showModal('modal-low-balance'); 
        }
        return; 
    }

    if((userData.todayCount||0) >= (effective.orders||0)) {
        return showCustomAlert('ภารกิจครบแล้ว', 'คุณทำภารกิจครบจำนวนสำหรับวันนี้แล้ว', true);
    }

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking Pending...';
    btn.disabled = true;

    try {
        const pendingSnap = await withTimeout(
            window.db.collection("orders")
                .where("username", "==", userData.username)
                .where("status", "==", "pending")
                .limit(1).get()
        );
            
        if (!pendingSnap.empty) {
            throw new Error("PENDING_ORDER");
        }

        btn.innerHTML = '<i class="fa-solid fa-box-open fa-bounce"></i> Loading Products...';
        const snap = await withTimeout(window.db.collection("products").get());
        if(snap.empty) throw new Error("NO_PRODUCTS");
        
        await new Promise(r => setTimeout(r, 800));

        btn.innerHTML = '<i class="fa-solid fa-magnifying-glass fa-beat-fade"></i> Matching Order...';
        let randIndex;
        let attempts = 0;
        do {
            randIndex = Math.floor(Math.random() * snap.docs.length);
            attempts++;
        } while (randIndex === lastRandomIndex && snap.docs.length > 1 && attempts < 5);
        
        lastRandomIndex = randIndex;

        const product = snap.docs[randIndex].data();
        const productName = product.name || 'สินค้าทั่วไป';
        const productImg = product.image || ''; 
        const price = parseFloat(product.price || 0);
        
        const commRate = parseFloat(effective.rate || 0);
        const commission = price * commRate;
        const totalReturn = price + commission;
        const orderId = "ORD" + Date.now() + Math.floor(Math.random() * 1000);

        const newOrderData = {
            order_id: orderId, 
            product_name: productName, 
            product_img: productImg,
            amount: price, 
            commission: commission, 
            status: 'pending', 
            username: userData.username, 
            timestamp: new Date().toISOString()
        };
        
        const docRef = await withTimeout(window.db.collection("orders").add(newOrderData));
        window.currentMatchedOrder = { ...newOrderData, docId: docRef.id };

        setTxt('match-id', `Order: ${orderId}`); 
        setTxt('match-time', new Date().toLocaleString('th-TH'));
        setTxt('match-name', productName); 
        setTxt('match-price', formatMoney(price));
        setTxt('match-total', formatMoney(price)); 
        setTxt('match-comm', '+' + formatMoney(commission));
        setTxt('match-return', formatMoney(totalReturn));
        
        setStars(5); 
        document.querySelector('#submit-review-select').selectedIndex = 0;

        const imgEl = document.getElementById('match-img');
        if(imgEl) {
            if(productImg && productImg.startsWith('http')) { 
                imgEl.style.backgroundImage = `url('${productImg}')`; 
                imgEl.innerHTML = ''; 
            } else { 
                imgEl.style.backgroundImage = 'none'; 
                imgEl.innerHTML = '<i class="fa-solid fa-box-open text-3xl text-gray-300 flex items-center justify-center h-full"></i>'; 
            }
        }
        
        showModal('modal-matched-order');

    } catch(e) {
        if(e.message === "PENDING_ORDER") {
            const pathConfig = getPathConfig();
            if(confirm("คุณมีออเดอร์ที่ยังไม่เสร็จสิ้น! กรุณาทำรายการให้เสร็จก่อน")) window.location.href = pathConfig.prefix + "index_order.html";
        } else if (e.message === "NO_PRODUCTS") {
            showCustomAlert('ขออภัย', 'ไม่พบสินค้าในระบบ');
        } else {
            console.error(e);
            if (e.code === "resource-exhausted") {
                showCustomAlert('โควต้าเต็ม (Quota Exceeded)', 'ระบบใช้งานเกินขีดจำกัดของวันแล้ว\nกรุณารอระบบรีเซ็ตในวันพรุ่งนี้');
            } else {
                showCustomAlert('เกิดข้อผิดพลาด', e.message);
            }
        }
    } finally {
        btn.innerHTML = originalText; 
        btn.disabled = false; 
    }
}

async function confirmMatchSubmit() {
    if(!window.currentMatchedOrder || !window.currentMatchedOrder.docId) {
        showCustomAlert('ข้อผิดพลาด', 'ไม่พบข้อมูลออเดอร์ กรุณาลองใหม่');
        hideModal('modal-matched-order');
        return;
    }

    if(!realDocId) {
        let stored = localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')) : null;
        if(stored && stored.docId) {
            realDocId = stored.docId;
        } else {
            showCustomAlert('ข้อผิดพลาด', 'ไม่พบข้อมูลผู้ใช้ กรุณาล็อกอินใหม่');
            return;
        }
    }

    const submitBtn = document.getElementById('btn-submit-order');
    if(submitBtn.disabled) return;

    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';
    submitBtn.disabled = true;

    try {
        const container = document.getElementById('star-container');
        const rating = container ? (container.getAttribute('data-rating') || 5) : 5;
        const review = document.getElementById('submit-review-select').value;

        const order = window.currentMatchedOrder;
        const finalBalance = currentBalance + order.commission;
        const nextCount = (userData.todayCount || 0) + 1;

        await withTimeout(Promise.all([
            window.db.collection("orders").doc(order.docId).update({ 
                status: 'completed', 
                pay_time: new Date().toISOString(),
                timestamp: new Date().toISOString(), 
                rating: parseInt(rating),
                review: review
            }),
            window.db.collection("users").doc(realDocId).update({ 
                balance: finalBalance, 
                todayCount: nextCount 
            })
        ]));

        showCustomAlert('สำเร็จ!', 'ส่งงานสำเร็จ เงินรางวัลเข้าบัญชีแล้ว', true);
        hideModal('modal-matched-order');
        window.currentMatchedOrder = null;

    } catch(e) { 
        console.error(e);
        if (e.code === "resource-exhausted") {
            showCustomAlert('โควต้าเต็ม (Quota Exceeded)', 'ระบบใช้งานเกินขีดจำกัดของวันแล้ว\nกรุณารอระบบรีเซ็ตในวันพรุ่งนี้');
        } else {
            showCustomAlert('เกิดข้อผิดพลาด', 'ไม่สามารถส่งงานได้: ' + e.message); 
        }
    } finally {
        submitBtn.innerHTML = 'Submit Order Now'; 
        submitBtn.disabled = false; 
    }
}

function startDeposit() { document.getElementById('deposit-password').value=''; showModal('modal-deposit-step1'); }
function verifyDepositPassword() { if(document.getElementById('deposit-password').value===(userData.password||'123456')) { hideModal('modal-deposit-step1'); showDepositInput(); } else { showCustomAlert('รหัสผิด', 'รหัสผ่านไม่ถูกต้อง'); } }
async function showDepositInput() { showModal('modal-deposit-step2'); setTxt('dep-min', 'กำลังโหลด...'); const netBalance = currentBalance - totalFrozenAmount; let requiredAmount = 0; try { const s = await window.db.collection("levels").where("name", "==", userData.level || "VIP 1").get(); let minDB = !s.empty ? (s.docs[0].data().min_bal || 100) : 100; if (netBalance < 0) { requiredAmount = Math.abs(netBalance); document.getElementById('deposit-amount').value = requiredAmount; setTxt('dep-min', `${formatMoney(requiredAmount)} (ชำระยอดติดลบ)`); } else { requiredAmount = minDB; document.getElementById('deposit-amount').value = ''; setTxt('dep-min', formatMoney(requiredAmount)); } } catch(e) { setTxt('dep-min', '฿100.00'); } }
async function confirmDepositInput() { if (!window.db) { showCustomAlert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้\nกรุณารีเฟรชหน้าจอแล้วลองใหม่'); return; } const amtInput = document.getElementById('deposit-amount'); const amt = parseFloat(amtInput.value); if (!realDocId) { let stored = localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')) : null; if(stored && stored.docId) { realDocId = stored.docId; userData = stored; } } if (!realDocId) { showCustomAlert('หมดเวลาเชื่อมต่อ', 'ไม่พบข้อมูลผู้ใช้ (Session Expired)\nกรุณาล็อกอินใหม่'); return; } const netBalance = currentBalance - totalFrozenAmount; let minRequired = (netBalance < 0) ? Math.abs(netBalance) : 0; if(!amt || amt <= 0) return showCustomAlert('แจ้งเตือน', 'กรุณาระบุจำนวนเงินให้ถูกต้อง'); if (netBalance < 0 && amt < minRequired) { return showCustomAlert('ยอดเงินไม่ถูกต้อง', `บัญชีของคุณติดลบ ${formatMoney(Math.abs(netBalance))}\nต้องเติมขั้นต่ำ ${formatMoney(minRequired)} เพื่อปลดล็อค`); } const btn = document.getElementById('btn-confirm-deposit'); const oldText = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> กำลังส่งข้อมูล...'; btn.disabled = true; try { const payload = { user_id: String(realDocId), username: userData.username || 'Unknown', amount: Number(amt), status: 'pending', timestamp: new Date().toISOString() }; await withTimeout(window.db.collection("recharges").add(payload), 10000); hideModal('modal-deposit-step2'); showModal('modal-deposit-success'); amtInput.value = ''; } catch(e) { console.error("Deposit Error:", e); if (JSON.stringify(e).includes("Quota exceeded") || e.code === "resource-exhausted") { showCustomAlert('ระบบเต็มขีดจำกัด', 'โควต้า Database รายวันเต็มแล้ว (Quota Exceeded)\nกรุณารอระบบรีเซ็ต หรืออัปเกรด Plan'); } else { showCustomAlert('เกิดข้อผิดพลาด', `ส่งข้อมูลไม่สำเร็จ: ${e.message || 'Unknown Error'}`); } } finally { btn.innerHTML = oldText; btn.disabled = false; } }

function startWithdrawal() { if(!userData) return; document.getElementById('wd-bank-name').value = ''; document.getElementById('wd-acc-name').value = ''; document.getElementById('wd-acc-no').value = ''; showModal('modal-withdraw-step1'); }

// ✅ FIXED: goToWithdrawStep2 (เพิ่มเช็ค Trade Settings)
async function goToWithdrawStep2() { 
    const bank = document.getElementById('wd-bank-name').value.trim(); 
    const accName = document.getElementById('wd-acc-name').value.trim(); 
    const accNo = document.getElementById('wd-acc-no').value.trim(); 
    
    if(!bank || !accName || !accNo) return showCustomAlert('ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลบัญชีให้ครบถ้วน'); 
    
    // ✅ เริ่มเช็คเงื่อนไขการถอน
    const btn = document.querySelector('#modal-withdraw-step1 button'); 
    const oldText = btn.innerHTML; 
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking Limit...'; 
    btn.disabled = true; 

    try {
        const effective = getEffectiveConfig();

        // 1. เช็คว่างานครบไหม? (ถ้า Admin ตั้งว่าต้องทำครบกี่งาน)
        if(effective.orders > 0 && (userData.todayCount || 0) < effective.orders) {
            throw new Error(`คุณต้องทำภารกิจให้ครบ ${effective.orders} รายการก่อน จึงจะถอนเงินได้\n(ทำไปแล้ว: ${userData.todayCount})`);
        }

        // 2. เช็คโควต้าถอนต่อเดือน (ถ้ามีการจำกัด)
        if (effective.withdraw_limit > 0) {
            const now = new Date();
            // วันแรกของเดือน (YYYY-MM-01)
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            
            // นับจำนวนครั้งที่ถอน "สำเร็จ" ในเดือนนี้
            const snap = await window.db.collection("withdrawals")
                .where("user_id", "==", realDocId)
                .where("status", "==", "approved") // นับเฉพาะที่อนุมัติแล้ว
                .where("timestamp", ">=", firstDay)
                .get();

            if (snap.size >= effective.withdraw_limit) {
                throw new Error(`คุณใช้โควต้าการถอนเกินกำหนดแล้ว (${effective.withdraw_limit} ครั้ง/เดือน)\nกรุณารอเดือนถัดไป`);
            }
        }

        // เก็บข้อมูลไว้ใช้ตอนกดถอนจริง
        withdrawInfo.bankName = bank; 
        withdrawInfo.accName = accName; 
        withdrawInfo.accNo = accNo; 
        withdrawInfo.minWithdraw = effective.min_withdraw_amount || 0; // เก็บยอดขั้นต่ำไว้เช็ค

        // โค้ดคำนวณเงินคงเหลือ
        let feePercent = 5; 
        if(currentLevelConfig && currentLevelConfig.withdrawal_fee !== undefined) { 
            feePercent = parseFloat(currentLevelConfig.withdrawal_fee); 
        } 
        
        const available = (currentBalance - totalFrozenAmount) > 0 ? (currentBalance - totalFrozenAmount) : 0; 
        withdrawInfo.feeRate = feePercent; 
        withdrawInfo.available = available; 
        
        setTxt('wd-total', formatMoney(currentBalance)); 
        setTxt('wd-pending-show', formatMoney(withdrawInfo.pendingWithdraw)); 
        setTxt('wd-frozen-show', formatMoney(totalFrozenAmount)); 
        setTxt('wd-fee-rate', feePercent); 
        setTxt('wd-fee-amt', '฿0.00'); 
        setTxt('wd-available', formatMoney(withdrawInfo.available)); 
        
        hideModal('modal-withdraw-step1'); 
        showModal('modal-withdraw-step2'); 

    } catch(e) { 
        showCustomAlert('ไม่สามารถถอนได้', e.message); 
    } finally { 
        btn.innerHTML = oldText; 
        btn.disabled = false; 
    } 
}

function calculateRealTimeFee(val) { 
    const amount = parseFloat(val); 
    const updateUI = (fee, net) => {
         const feeEl = document.getElementById('wd-fee-actual');
         if(feeEl) feeEl.innerText = `฿${fee.toLocaleString(undefined, {minimumFractionDigits:2})}`;
         const netEl = document.getElementById('wd-net-amount');
         if(netEl) netEl.innerText = `฿${net.toLocaleString(undefined, {minimumFractionDigits:2})}`;
    };
    if (!amount || amount <= 0) { updateUI(0, 0); return; } 
    const fee = (amount * withdrawInfo.feeRate) / 100; 
    const net = amount - fee;
    updateUI(fee, net);
}

function fillMaxWithdraw() { const amt = Math.floor(withdrawInfo.available); document.getElementById('withdraw-amount').value = amt; calculateRealTimeFee(amt); }

// ✅ FIXED: confirmWithdrawal (เพิ่มเช็คขั้นต่ำ)
async function confirmWithdrawal() { 
    const amount = parseFloat(document.getElementById('withdraw-amount').value); 
    const pwd = document.getElementById('withdraw-password').value; 
    
    if(!amount || amount <= 0) return showCustomAlert('แจ้งเตือน', 'กรุณาระบุจำนวนเงิน'); 
    
    // ✅ เพิ่มเช็คยอดขั้นต่ำ
    if(withdrawInfo.minWithdraw && amount < withdrawInfo.minWithdraw) {
        return showCustomAlert('ยอดเงินต่ำเกินไป', `ระบบกำหนดให้ถอนขั้นต่ำ: ${formatMoney(withdrawInfo.minWithdraw)}`);
    }

    if(amount > withdrawInfo.available) return showCustomAlert('ยอดเงินไม่พอ', 'ยอดเงินที่ถอนได้ไม่เพียงพอ (อาจติด Frozen)'); 
    if(pwd !== (userData.password || '123456')) return showCustomAlert('รหัสผิด', 'รหัสผ่านไม่ถูกต้อง'); 
    if(!confirm(`ยืนยันการถอน ${formatMoney(amount)}?`)) return; 
    
    const btn = document.querySelector('#modal-withdraw-step2 button'); 
    const oldHtml = btn.innerHTML; 
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...'; 
    btn.disabled = true; 
    
    try { 
        const feeAmt = (amount * withdrawInfo.feeRate) / 100; 
        await window.db.collection("withdrawals").add({ 
            user_id: realDocId, 
            username: userData.username, 
            bank_name: withdrawInfo.bankName, 
            account_name: withdrawInfo.accName, 
            account_number: withdrawInfo.accNo, 
            amount: amount, 
            fee: feeAmt, 
            fee_rate: withdrawInfo.feeRate, 
            net_amount: amount - feeAmt, 
            status: 'pending', 
            timestamp: new Date().toISOString() 
        }); 
        
        const newBalance = currentBalance - amount; 
        await window.db.collection("users").doc(realDocId).update({ balance: newBalance }); 
        hideModal('modal-withdraw-step2'); 
        showCustomAlert('สำเร็จ', 'ส่งคำขอถอนเงินแล้ว', true); 
    } catch(e) { 
        showCustomAlert('Error', e.message); 
    } finally { 
        btn.innerHTML = oldHtml; 
        btn.disabled = false; 
    } 
}

function showAdminQR() { hideModal('modal-withdraw-success'); hideModal('modal-deposit-success'); showModal('modal-admin-qr'); }
async function markRead(docId) { await window.db.collection("notifications").doc(docId).update({ read: true }); }
function showInviteModal() { showCustomAlert('Invite Code', `รหัสแนะนำของคุณคือ: ${userData.invite_code}`); }
function logout() { 
    if(confirm("ออกจากระบบ?")) { 
        if(unsubscribeUser) unsubscribeUser(); 
        if(unsubscribeFrozen) unsubscribeFrozen(); 
        localStorage.removeItem('currentUser'); 
        localStorage.removeItem('frozenAmount'); 
        const pathConfig = getPathConfig();
        window.location.href = pathConfig.prefix + 'login.html'; 
    } 
}
