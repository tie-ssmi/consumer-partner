// app.js - Version: Full Update with Admin Trade Settings

// --- Global Configuration ---
// 🔴 เปลี่ยนลิงก์โลโก้ตรงนี้ที่เดียว เปลี่ยนทุกหน้าครับ 🔴
const SITE_LOGO_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAaCAMAAACTisy7AAAAKlBMVEVHcEx4GUR3GkV3IUd4GER4HkZ4OFJ3Ikh4IUh4GUV3Ikd4G0V3GUV4F0Q+WLQcAAAADXRSTlMAq88+9WYMKk/nG4q7F5KB4wAAAJ9JREFUKJGVkksShCAMRAmCQID7X3eCUuZDNtMr24cJ3WUI/+iClhpcLovzVbxPluang0Zms9l9U6pqCAqO510Z67HoqXtu3iY7kBeVcywfj1XBTFBYGZNcCLe0RZinQXW2aCbCwbJ9jU59J+e51GbN9AWKXvC9RsKd2NSWIQJdvKp1RrIaK5TLrTgGnpATezv7Zt2DYXAXjipl8v/KUz+skhAyQOCYWgAAAABJRU5ErkJggg=="; 
// ✅ กำหนด Line ID ที่นี่ที่เดียว (เปลี่ยนตรงนี้ เปลี่ยนทุกปุ่ม)
const SITE_LINE_MAIN = "@YOUR_MAIN_ID";   // ใส่ไอดีไลน์หลัก
const SITE_LINE_BACKUP = "@YOUR_BACKUP_ID"; // ใส่ไอดีไลน์สำรอง

// ฟังก์ชันตั้งค่า Logo อัตโนมัติ
(function setupFavicon() {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    link.href = SITE_LOGO_URL;
})();

// ... (ตามด้วยโค้ดเดิมของคุณ) ...

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
// --- 5. Navbar (แก้ไขให้เปลี่ยนภาษาได้) ---
function injectBottomNav() {
    const navContainer = document.getElementById('bottom-nav');
    if (!navContainer) return;

    const pathConfig = getPathConfig();
    const currentPage = window.location.pathname.split("/").pop() || 'index.html';

    // ✅ เพิ่ม key: 'nav_...' สำหรับดึงคำแปล
    const menuItems = [
        { name: 'Home', key: 'nav_home', link: pathConfig.homeLink, icon: 'fa-house', id: 'index.html' },
        { name: 'Order', key: 'nav_order', link: pathConfig.prefix + 'index_order.html', icon: 'fa-file-invoice', id: 'index_order.html' },
        { name: 'Task', key: 'nav_task', link: pathConfig.prefix + 'work.html', icon: 'fa-list-check', id: 'work.html' },
        { name: 'Service', key: 'nav_service', link: pathConfig.prefix + 'service.html', icon: 'fa-headset', id: 'service.html' },
        { name: 'My', key: 'nav_my', link: pathConfig.prefix + 'profile.html', icon: 'fa-user', id: 'profile.html' }
    ];

    let html = `<nav class="bg-[#DC2626] text-white sticky bottom-0 w-full z-50 h-16 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] flex justify-around items-center px-2">`;
    
    menuItems.forEach(item => {
        const isActive = currentPage === item.id; 
        const activeClass = isActive ? 'opacity-100 scale-105 font-bold' : 'opacity-60 hover:opacity-100';
        
        // ✅ เพิ่ม data-i18n="${item.key}" ลงใน span
        html += `
        <a href="${item.link}" class="flex flex-col items-center justify-center w-14 transition duration-200 ${activeClass}">
            <i class="fa-solid ${item.icon} text-xl mb-1"></i>
            <span class="text-[10px] uppercase tracking-wide" data-i18n="${item.key}">${item.name}</span>
        </a>`;
    });
    
    html += `</nav>`;
    navContainer.innerHTML = html;

    // ✅ สั่งให้เปลี่ยนภาษาทันทีที่สร้างเมนูเสร็จ (ถ้ามีฟังก์ชันนี้อยู่)
    if(typeof initLanguage === 'function') {
        initLanguage();
    }
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
    <div id="modal-custom-alert" class="fixed inset-0 z-[100] bg-black/60 hidden items-center justify-center p-6 font-sans backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"><div class="bg-white rounded-2xl w-full max-w-xs p-6 text-center shadow-2xl"><div id="alert-icon-container" class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">...</div><h3 id="alert-title" class="text-lg font-bold text-gray-800 mb-2">...</h3><div id="alert-msg" class="text-sm text-gray-500 mb-6 leading-relaxed">...</div><button onclick="hideModal('modal-custom-alert')" class="w-full bg-[#DC2626] text-white py-3 rounded-xl font-bold shadow-lg hover:bg-red-700 active:scale-95 transition text-sm" data-i18n="confirm">ตกลง</button></div></div>
    
    <div id="modal-matched-order" class="fixed inset-0 z-[90] bg-black/60 hidden items-center justify-center p-4 font-sans backdrop-blur-sm">
        <div class="w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden relative animate-[scaleIn_0.2s_ease-out] flex flex-col max-h-[90vh]">
            <div class="bg-[#DC2626] text-white p-3 flex justify-between items-center shadow-md shrink-0">
                <span class="font-bold text-sm"><i class="fa-solid fa-circle-check mr-2"></i><span data-i18n="modal_matched_title">Order Matched!</span></span>
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
                    <div class="flex justify-between items-center"><span class="text-gray-500 text-xs" data-i18n="modal_total_order">Total Order</span><span id="match-total" class="font-bold text-gray-800">...</span></div>
                    <div class="flex justify-between items-center"><span class="text-gray-500 text-xs" data-i18n="modal_commission">Commission</span><span id="match-comm" class="font-bold text-green-600 text-lg">...</span></div>
                    <div class="flex justify-between items-center pt-2 border-t border-dashed border-gray-200 mt-2"><span class="text-gray-500 text-xs" data-i18n="modal_return">Return Amount</span><span id="match-return" class="font-bold text-[#DC2626]">...</span></div>
                </div>
                <div class="border-t border-gray-100 pt-4 mb-2">
                    <div class="flex justify-between items-center mb-3">
                        <span class="text-xs font-bold text-gray-600" data-i18n="modal_rating">Order Rating</span>
                        <div class="flex gap-1" id="star-container" data-rating="5">
                            <i class="fa-solid fa-star text-yellow-400 cursor-pointer text-sm" onclick="setStars(1)"></i>
                            <i class="fa-solid fa-star text-yellow-400 cursor-pointer text-sm" onclick="setStars(2)"></i>
                            <i class="fa-solid fa-star text-yellow-400 cursor-pointer text-sm" onclick="setStars(3)"></i>
                            <i class="fa-solid fa-star text-yellow-400 cursor-pointer text-sm" onclick="setStars(4)"></i>
                            <i class="fa-solid fa-star text-yellow-400 cursor-pointer text-sm" onclick="setStars(5)"></i>
                        </div>
                    </div>
                    <div>
                        <span class="text-xs font-bold text-gray-600 mb-1 block" data-i18n="modal_review_label">Order Review</span>
                        <select id="submit-review-select" class="w-full border border-gray-200 rounded p-2 text-[10px] text-gray-600 bg-gray-50 focus:border-[#DC2626] outline-none">
                            <option value="Excellent quality" data-i18n="rev_opt_1">The product quality is excellent...</option>
                            <option value="Very satisfied" data-i18n="rev_opt_2">I am very satisfied...</option>
                            <option value="Reasonable price" data-i18n="rev_opt_3">I am very pleased with the reasonable price.</option>
                            <option value="Good experience" data-i18n="rev_opt_4">This shopping experience is highly satisfactory.</option>
                            <option value="Fast delivery" data-i18n="rev_opt_5">Fast delivery and good service.</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="p-4 pt-0 shrink-0">
                <button id="btn-submit-order" onclick="confirmMatchSubmit()" class="w-full bg-[#DC2626] text-white py-3 rounded-lg font-bold shadow-lg hover:bg-red-700 active:scale-95 transition text-sm uppercase tracking-wide" data-i18n="btn_submit_now">Submit Order Now</button>
            </div>
        </div>
    </div>

<div id="modal-deposit-step1" class="fixed inset-0 bg-black/70 hidden items-center justify-center z-[60] p-4 font-sans backdrop-blur-sm" onclick="if(event.target===this) hideModal('modal-deposit-step1')">
        <div class="bg-white rounded-xl w-full max-w-xs p-6 text-center relative animate-[scaleIn_0.2s_ease-out]">
            <button onclick="hideModal('modal-deposit-step1')" class="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"><i class="fa-solid fa-xmark text-lg"></i></button>
            <div class="w-12 h-12 bg-red-50 text-[#DC2626] rounded-full flex items-center justify-center mx-auto mb-3"><i class="fa-solid fa-lock text-xl"></i></div>
            <h3 class="font-bold mb-2 text-gray-800" data-i18n="modal_verify_title">Verify Identity</h3>
            <p class="text-xs text-gray-500 mb-4" data-i18n="modal_verify_desc">Please enter password</p>
            <input type="password" id="deposit-password" class="w-full border border-gray-200 bg-gray-50 p-3 mb-4 rounded-lg text-center outline-none focus:border-[#DC2626] transition text-sm" placeholder="Password" data-i18n="ph_verify_pwd">
            <button onclick="verifyDepositPassword()" class="w-full bg-[#DC2626] text-white py-2.5 rounded-lg font-bold shadow-md hover:bg-red-700 transition text-sm" data-i18n="btn_confirm">Confirm</button>
        </div>
    </div>

    <div id="modal-deposit-step2" class="fixed inset-0 bg-black/70 hidden items-center justify-center z-[60] p-4 font-sans backdrop-blur-sm" onclick="if(event.target===this) closeAllModals()">
        <div class="bg-white rounded-xl w-full max-w-xs p-5 relative animate-[scaleIn_0.2s_ease-out]">
            <button onclick="closeAllModals()" class="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"><i class="fa-solid fa-xmark text-lg"></i></button>
            <h3 class="font-bold text-center mb-2 text-lg" data-i18n="modal_amount_title">Enter Amount</h3>
            <p class="text-xs text-center text-gray-500 mb-2"><span data-i18n="txt_min_amount">Minimum:</span> <span id="dep-min" class="font-bold text-red-500">...</span></p>
            <input type="number" id="deposit-amount" class="w-full border-b-2 border-red-200 text-center text-2xl font-bold p-2 mb-4 outline-none text-[#DC2626] placeholder-gray-300 transition focus:border-red-500" placeholder="0.00">
            <button id="btn-confirm-deposit" onclick="confirmDepositInput()" class="w-full bg-[#DC2626] text-white py-2.5 rounded-lg font-bold shadow-md hover:bg-red-700 transition text-sm" data-i18n="btn_deposit_submit">Submit Recharge</button>
        </div>
    </div>

    <div id="modal-deposit-success" class="fixed inset-0 bg-black/60 hidden items-center justify-center z-[90] p-4 font-sans backdrop-blur-sm">
        <div class="bg-white rounded-xl w-full max-w-xs p-6 text-center animate-[scaleIn_0.2s_ease-out]">
            <div class="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500 text-3xl"><i class="fa-solid fa-check"></i></div>
            <h3 class="font-bold text-lg text-gray-800" data-i18n="modal_dep_success_title">Recharge Successful</h3>
            <p class="text-sm text-gray-500 mt-2 mb-4" data-i18n="modal_dep_success_msg">Request sent. Contact Admin.</p>
            <button onclick="openServiceContact(SITE_LINE_MAIN)" class="w-full bg-[#06C755] text-white py-3 rounded-lg font-bold shadow-md hover:bg-green-600 transition mb-2">
                <i class="fa-brands fa-line mr-1"></i> <span data-i18n="btn_contact_admin">Contact Admin</span>
            </button>
            <button onclick="closeAllModals()" class="text-xs text-gray-400 hover:text-gray-600 mt-2" data-i18n="btn_close_window">Close Window</button>
        </div>
    </div>
    <div id="modal-low-balance" class="fixed inset-0 bg-black/60 hidden items-center justify-center z-[80] p-4 font-sans" onclick="if(event.target===this) hideModal('modal-low-balance')"><div class="bg-white rounded-xl w-full max-w-xs p-6 text-center"><div class="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3"><i class="fa-solid fa-coins text-xl"></i></div><h3 class="text-lg font-bold text-gray-800">ยอดเงินไม่พอ</h3><p class="text-sm text-gray-500 my-2">ต้องการขั้นต่ำ: <span id="lb-min" class="text-red-600 font-bold">...</span></p><div class="flex gap-2"><button onclick="hideModal('modal-low-balance')" class="flex-1 py-2 bg-gray-100 rounded text-sm font-bold">ยกเลิก</button><button onclick="window.location.href='profile.html'" class="flex-1 py-2 bg-[#DC2626] text-white rounded text-sm font-bold">เติมเงิน</button></div></div></div>
   <div id="modal-withdraw-step1" class="fixed inset-0 bg-black/60 hidden items-center justify-center z-[80] p-4 font-sans backdrop-blur-sm" onclick="if(event.target===this) hideModal('modal-withdraw-step1')">
        <div class="bg-white rounded-xl w-full max-w-sm p-5 relative animate-[scaleIn_0.2s_ease-out]">
            <button onclick="hideModal('modal-withdraw-step1')" class="absolute top-2 right-2 text-gray-400"><i class="fa-solid fa-xmark text-lg"></i></button>
            <h3 class="font-bold text-center text-lg mb-4" data-i18n="modal_wd_title_1">Bank Account Info</h3>
            <div class="space-y-3">
                <div><label class="text-xs text-gray-500" data-i18n="lbl_bank">Bank</label><input type="text" id="wd-bank-name" class="w-full border rounded p-2 text-sm" placeholder="Bank Name" data-i18n="ph_bank"></div>
                <div><label class="text-xs text-gray-500" data-i18n="lbl_acc_name">Account Name</label><input type="text" id="wd-acc-name" class="w-full border rounded p-2 text-sm" placeholder="Name" data-i18n="ph_acc_name"></div>
                <div><label class="text-xs text-gray-500" data-i18n="lbl_acc_no">Account No.</label><input type="number" id="wd-acc-no" class="w-full border rounded p-2 text-sm" placeholder="No dashes" data-i18n="ph_acc_no"></div>
            </div>
            <button onclick="goToWithdrawStep2()" class="w-full bg-[#DC2626] text-white py-3 rounded-lg font-bold shadow-md hover:bg-red-700 active:scale-95 transition mt-5 text-sm" data-i18n="btn_next">Next</button>
        </div>
    </div>
    
    <div id="modal-withdraw-step2" class="fixed inset-0 bg-black/60 hidden items-center justify-center z-[80] p-4 font-sans backdrop-blur-sm" onclick="if(event.target===this) hideModal('modal-withdraw-step2')">
        <div class="bg-white rounded-xl w-full max-w-sm p-5 relative animate-[scaleIn_0.2s_ease-out]">
            <button onclick="hideModal('modal-withdraw-step2')" class="absolute top-2 right-2 text-gray-400"><i class="fa-solid fa-xmark text-lg"></i></button>
            <h3 class="font-bold text-center text-lg mb-2" data-i18n="modal_wd_title_2">Withdrawal Details</h3>
            
            <div class="bg-gray-50 p-3 rounded-lg text-xs space-y-2 mb-4 border border-gray-100">
                <div class="flex justify-between"><span data-i18n="lbl_net_balance">Net Balance:</span> <span id="wd-total" class="font-bold text-black">...</span></div>
                <div class="flex justify-between text-red-500"><span data-i18n="lbl_frozen">Frozen:</span> <span id="wd-frozen-show">...</span></div>
                <div class="border-t border-dashed border-gray-300 my-1"></div>
                <div class="flex justify-between text-base font-bold text-[#DC2626]"><span data-i18n="lbl_actual_withdraw">Available:</span> <span id="wd-available">...</span></div>
            </div>

            <div class="relative mb-2">
                <input type="number" id="withdraw-amount" class="w-full border-2 border-red-100 rounded-lg p-3 pr-16 text-xl font-bold text-[#DC2626] outline-none focus:border-[#DC2626] transition" placeholder="0.00" oninput="calculateRealTimeFee(this.value)">
                <button onclick="fillMaxWithdraw()" class="absolute right-2 top-2 bottom-2 px-3 bg-red-100 text-[#DC2626] text-xs font-bold rounded hover:bg-red-200">MAX</button>
            </div>

            <div class="flex justify-between text-xs text-gray-500 mt-2 mb-1">
                <span><span data-i18n="lbl_fee">Fee</span> (<span id="wd-fee-rate">5</span>%):</span>
                <span id="wd-fee-actual" class="font-medium text-red-500">฿0.00</span>
            </div>
            <div class="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4">
                <span class="text-xs font-bold text-gray-600" data-i18n="lbl_receive_amount">Net Receive:</span>
                <span id="wd-net-amount" class="text-2xl font-bold text-green-600">฿0.00</span>
            </div>

            <input type="password" id="withdraw-password" class="w-full border border-gray-200 rounded-lg p-2 text-center text-sm mb-4" placeholder="Password" data-i18n="ph_wd_pwd">
            <button id="btn-confirm-wd" onclick="confirmWithdrawal()" class="w-full bg-[#DC2626] text-white py-3 rounded-lg font-bold shadow-md hover:bg-red-700 active:scale-95 transition text-sm" data-i18n="btn_confirm_wd">Confirm Withdrawal</button>
        </div>
    </div>

    <div id="modal-withdraw-success" class="fixed inset-0 bg-black/60 hidden items-center justify-center z-[90] p-4 font-sans backdrop-blur-sm">
        <div class="bg-white rounded-xl w-full max-w-xs p-6 text-center animate-[scaleIn_0.2s_ease-out]">
            <div class="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500 text-3xl"><i class="fa-solid fa-check"></i></div>
            <h3 class="font-bold text-lg text-gray-800" data-i18n="alert_wd_success_title">Processed</h3>
            <p class="text-sm text-gray-500 mt-2 mb-4" data-i18n="alert_wd_success_msg">Request sent.</p>
            <button onclick="showAdminQR()" class="w-full bg-[#06C755] text-white py-3 rounded-lg font-bold shadow-md hover:bg-green-600 transition mb-2">
                <i class="fa-brands fa-line mr-1"></i> <span data-i18n="btn_contact_admin">Contact Admin</span>
            </button>
            <button onclick="closeAllModals()" class="text-xs text-gray-400 hover:text-gray-600 mt-2" data-i18n="btn_close_window">Close Window</button>
        </div>
    </div>
    <div id="modal-admin-qr" class="fixed inset-0 bg-black/80 hidden items-center justify-center z-[100] p-4 font-sans backdrop-blur-sm"><div class="bg-white rounded-xl w-full max-w-xs p-5 relative text-center"><button onclick="hideModal('modal-admin-qr')" class="absolute top-2 right-2 text-gray-400"><i class="fa-solid fa-xmark text-lg"></i></button><h3 class="font-bold text-gray-800 mb-4">Scan to Contact Admin</h3><div class="bg-gray-100 w-48 h-48 mx-auto rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 mb-4 overflow-hidden"><img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://line.me/ti/p/~admin_id" class="w-full h-full object-cover"></div><p class="text-xs text-gray-500">แคปหน้าจอเพื่อสแกนในไลน์</p></div></div>
    
    <div id="floating-notif" class="fixed top-14 right-2 w-72 bg-white shadow-xl rounded-xl border border-gray-100 z-[100] hidden flex-col max-h-[400px] overflow-y-auto mr-auto max-w-xl" style="right: max(0.5rem, calc(50% - 280px));"><div class="p-3 border-b border-gray-100 bg-gray-50 font-bold text-xs text-gray-600 flex justify-between items-center"><span>การแจ้งเตือน</span><span class="text-[10px] text-gray-400 cursor-pointer" onclick="toggleFloatingNotif()">ปิด</span></div><div id="notif-list" class="divide-y divide-gray-50"><div class="p-4 text-center text-xs text-gray-400">กำลังโหลด...</div></div></div>
    <div id="about-us" class="fixed inset-0 z-[150] bg-[#f3f4f6] hidden flex-col w-full h-full font-sans max-w-xl mx-auto left-0 right-0"><div class="bg-[#DC2626] text-white h-14 flex items-center px-4 shadow-md shrink-0 sticky top-0 z-50 justify-between"><button onclick="toggleAboutUs()" class="hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition"><i class="fa-solid fa-chevron-left text-lg"></i></button><h1 class="text-lg font-bold">ใบรับรองบริษัท</h1><div class="w-8"></div></div><div class="flex-1 overflow-y-auto p-4 custom-scroll pb-20"><div class="bg-white rounded-xl shadow-sm p-5 mb-6">
    <div class="text-right text-xs text-gray-400 mb-4">COMPANY QUALIFICATION</div>
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

    <div id="modal-service-contact" class="fixed inset-0 bg-black/80 hidden items-center justify-center z-[100] p-4 font-sans backdrop-blur-sm" onclick="if(event.target===this) hideModal('modal-service-contact')">
        <div class="bg-white rounded-xl w-full max-w-xs p-6 relative text-center animate-[scaleIn_0.2s_ease-out]">
            <button onclick="hideModal('modal-service-contact')" class="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><i class="fa-solid fa-xmark text-lg"></i></button>
            
            <h3 class="font-bold text-gray-800 text-lg mb-4" data-i18n="modal_contact_title">Contact Support</h3>
            
            <div class="bg-white p-2 rounded-lg border-2 border-dashed border-green-200 mb-4 inline-block mx-auto">
                <img id="service-qr-img" src="" class="w-40 h-40 object-contain">
            </div>

            <div class="bg-gray-50 rounded-lg p-3 flex items-center justify-between border border-gray-100">
                <div class="text-left">
                    <div class="text-[10px] text-gray-400" data-i18n="modal_line_id">Line ID:</div>
                    <div class="text-sm font-bold text-gray-800" id="service-line-id">...</div>
                </div>
                <button onclick="copyLineID()" class="bg-green-500 text-white text-xs px-3 py-1.5 rounded-md hover:bg-green-600 transition shadow-sm" data-i18n="btn_copy">Copy</button>
            </div>
            
            <a id="service-line-link" href="#" target="_blank" class="block w-full bg-[#06C755] text-white py-2.5 rounded-lg font-bold mt-4 shadow-lg hover:bg-green-600 transition text-sm">
                <i class="fa-brands fa-line mr-2"></i> Open Line App
            </a>
        </div>
    </div>

    <div id="modal-news" class="fixed inset-0 z-[150] bg-[#f3f4f6] hidden flex-col w-full h-full font-sans max-w-xl mx-auto left-0 right-0">
    <div class="bg-[#DC2626] text-white h-14 flex items-center px-4 shadow-md shrink-0 sticky top-0 z-50 justify-between"><button onclick="toggleNewsModal()" class="hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition"><i class="fa-solid fa-chevron-left text-lg"></i></button>
    <h1 class="text-lg font-bold" data-i18n="news_header">News</h1>
            <div class="w-8"></div>
    </div><div class="flex-1 overflow-y-auto p-4 custom-scroll pb-20"><div class="bg-white rounded-xl shadow-sm p-5 mb-6">
    
    <div class="text-right text-xs text-gray-400 mb-4">2023-11-04 18:54:28</div>
    
    <p class="leading-relaxed"data-i18n="news_p1">
                    </p>
                    <p class="font-bold text-gray-800 mb-2" data-i18n="news_p2">Activity Details:</p>
                
                <div class="space-y-2 pl-2 text-sm text-gray-600">
                    <p><span data-i18n="news_topup">Deposit</span> 5,000, <span data-i18n="news_bonus">Get</span> 666</p>
                    <p><span data-i18n="news_topup">Deposit</span> 10,000, <span data-i18n="news_bonus">Get</span> 1,688</p>
                    <p><span data-i18n="news_topup">Deposit</span> 50,000, <span data-i18n="news_bonus">Get</span> 8,888</p>
                    <p><span data-i18n="news_topup">Deposit</span> 100,000, <span data-i18n="news_bonus">Get</span> 18,888</p>
                    <p><span data-i18n="news_topup">Deposit</span> 200,000, <span data-i18n="news_bonus">Get</span> 28,888</p>
                    <p><span data-i18n="news_topup">Deposit</span> 300,000, <span data-i18n="news_bonus">Get</span> 38,888</p>
                    <p><span data-i18n="news_topup">Deposit</span> 500,000, <span data-i18n="news_bonus">Get</span> 58,888</p>
                    <p><span data-i18n="news_topup">Deposit</span> 1,000,000, <span data-i18n="news_bonus">Get</span> 88,888</p>
                    <p><span data-i18n="news_topup">Deposit</span> 3,000,000, <span data-i18n="news_bonus">Get</span> 188,888</p>
                    <p><span data-i18n="news_topup">Deposit</span> 5,000,000, <span data-i18n="news_bonus">Get</span> 388,888</p>
                    <p><span data-i18n="news_topup">Deposit</span> 10,000,000, <span data-i18n="news_bonus">Get</span> 588,888</p>
                </div>

                <p class="leading-relaxed pt-4 text-sm text-gray-700" data-i18n="news_p3">
                    Contact for more info!
                </p>
                
                <p class="pt-4 text-center font-semibold text-[#902A4F]" data-i18n="news_footer">
                    Best Wishes!
                </p>

                   <div class="text-center text-xs text-gray-400 mt-8" data-i18n="news_loading_done">Loading complete</div>
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
// ✅ ฟังก์ชันแสดงรายการแจ้งเตือน (ฉบับรองรับเปลี่ยนภาษา)
// ✅ ฟังก์ชันแสดงรายการแจ้งเตือน (ฉบับแปลภาษาอัตโนมัติ)
function renderMixedNotifications() {
    const list = document.getElementById('notif-list');
    const dots = document.querySelectorAll('.notif-dot-badge');
    
    // อัปเดตหัวข้อและปุ่มปิด (ถ้ามี element)
    const headerTitle = document.querySelector('#floating-notif span:first-child');
    const closeBtn = document.querySelector('#floating-notif span:last-child');
    if(headerTitle) headerTitle.innerText = getTrans('notif_header') || 'การแจ้งเตือน';
    if(closeBtn) closeBtn.innerText = getTrans('notif_close') || 'ปิด';

    if(!list) return;
    
    // รวมการแจ้งเตือนทั้งหมด
    let all = [...notifStore.general, ...notifStore.withdraw, ...notifStore.recharge];
    all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if(all.length === 0) { 
        list.innerHTML = `<div class="p-4 text-center text-xs text-gray-400">${getTrans('notif_empty') || 'ไม่มีการแจ้งเตือน'}</div>`; 
        dots.forEach(d => d.classList.add('hidden')); 
        return; 
    }
    
    let html = ''; 
    let hasUnread = false; 
    
    all.forEach(n => {
        let title, msg, colorClass, icon;
        const status = (n.status || '').toLowerCase();
        
        // คำเชื่อม "ยอด"
        const amtTxt = getTrans('n_amt') || 'ยอด';

        // --- กรณีที่ 1: แจ้งเตือนการถอนเงิน (ระบบ) ---
        if (n.notifType === 'withdraw') {
            if(status === 'pending' || status === 'รอตรวจสอบ') { 
                title = getTrans('n_wd_wait') || 'แจ้งถอนเงิน'; 
                msg = `${amtTxt} ${formatMoney(n.amount)} ${getTrans('n_msg_wait') || 'กำลังรอการตรวจสอบ'}`; 
                colorClass = 'text-orange-500'; icon = 'fa-clock'; 
            }
            else if (status.includes('approved') || status.includes('อนุมัติ')) { 
                title = getTrans('n_wd_ok') || 'ถอนเงินสำเร็จ'; 
                msg = `${amtTxt} ${formatMoney(n.amount)} ${getTrans('n_msg_ok_wd') || 'อนุมัติแล้ว เงินเข้าบัญชี'}`; 
                colorClass = 'text-green-600'; icon = 'fa-check-circle'; hasUnread = true; 
            }
            else { 
                title = getTrans('n_wd_fail') || 'ถอนเงินถูกปฏิเสธ'; 
                msg = `${amtTxt} ${formatMoney(n.amount)} ${getTrans('n_msg_fail') || 'ถูกยกเลิก'}`; 
                colorClass = 'text-red-600'; icon = 'fa-times-circle'; hasUnread = true; 
            }
        } 
        // --- กรณีที่ 2: แจ้งเตือนการเติมเงิน (ระบบ) ---
        else if (n.notifType === 'recharge') {
             if(status === 'pending') { 
                 title = getTrans('n_rc_wait') || 'แจ้งเติมเงิน'; 
                 msg = `${amtTxt} ${formatMoney(n.amount)} ${getTrans('n_msg_wait') || 'กำลังรอการตรวจสอบ'}`; 
                 colorClass = 'text-orange-500'; icon = 'fa-clock'; 
            }
            else if (status.includes('approved') || status.includes('อนุมัติ')) { 
                title = getTrans('n_rc_ok') || 'เติมเงินสำเร็จ'; 
                msg = `${amtTxt} ${formatMoney(n.amount)} ${getTrans('n_msg_ok_rc') || 'เข้ากระเป๋าแล้ว'}`; 
                colorClass = 'text-green-600'; icon = 'fa-check-circle'; hasUnread = true; 
            }
            else { 
                title = getTrans('n_rc_fail') || 'เติมเงินล้มเหลว'; 
                msg = `${amtTxt} ${formatMoney(n.amount)} ${getTrans('n_msg_fail') || 'ไม่ผ่านการอนุมัติ'}`; 
                colorClass = 'text-red-600'; icon = 'fa-times-circle'; hasUnread = true; 
            }
        } 
        // --- กรณีที่ 3: แจ้งเตือนทั่วไป (กระดิ่งแดง) ---
        else {
            title = n.title; 
            msg = n.message; 
            
            // 🔥 ดักจับคำแปลอัตโนมัติ (เพิ่มส่วนนี้) 🔥
            if (title.includes('ถอนเงินสำเร็จ') || title.includes('Withdraw Success')) {
                title = getTrans('n_wd_ok');
                const amt = n.message.match(/[\d,]+\.?\d*/); // หาตัวเลขยอดเงิน
                if(amt) msg = `${getTrans('n_amt')} ฿${amt[0]} ${getTrans('n_msg_ok_wd')}`;
            } 
            else if (title.includes('เติมเงินสำเร็จ') || title.includes('Recharge Success')) {
                title = getTrans('n_rc_ok');
                const amt = n.message.match(/[\d,]+\.?\d*/);
                if(amt) msg = `${getTrans('n_amt')} ฿${amt[0]} ${getTrans('n_msg_ok_rc')}`;
            }
            else if (title.includes('แจ้งเติมเงิน') || title.includes('Recharge Request')) {
                title = getTrans('n_rc_wait');
                msg = getTrans('n_msg_wait');
            }

            colorClass = n.read ? 'text-gray-700' : 'text-[#DC2626]'; 
            icon = 'fa-bell'; 
            if(!n.read) hasUnread = true;
        }
        
        html += `
        <div class="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 bg-white group">
            <div class="flex justify-between mb-1">
                <div class="flex items-center gap-2">
                    <i class="fa-solid ${icon} ${colorClass} text-xs"></i>
                    <span class="text-xs font-bold ${colorClass}">${title}</span>
                </div>
                <span class="text-[9px] text-gray-400">${n.timestamp ? new Date(n.timestamp).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
            </div>
            <div class="text-[10px] text-gray-500 line-clamp-2 pl-5">${msg}</div>
        </div>`;
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
// ✅ 1. ฟังก์ชันกดเริ่มงาน (ฉบับสมบูรณ์ + แก้ภาษา + แก้บั๊ก)
async function startGrabbing() {
    const btn = document.getElementById('start-work-btn');
    if(btn.disabled) return; 

    // เก็บข้อความเดิมของปุ่มไว้
    const originalText = btn.innerHTML;

    // เตรียมคำแปลสำหรับสถานะปุ่ม
    const txtCheck = getTrans('work_checking') || 'Checking...';
    const txtLoad = getTrans('work_loading_products') || 'Loading Products...';
    const txtMatch = getTrans('work_matching') || 'Matching...';
    const txtNoProduct = getTrans('no_products') || 'No products';
    
    // โหลด Config ถ้ายังไม่มี
    if(!currentLevelConfig) { 
        await fetchLevelConfig(); 
        if(!currentLevelConfig) return showCustomAlert('Loading', 'Please wait...'); 
    }
    
    const effective = getEffectiveConfig();
    const netAvailable = currentBalance - totalFrozenAmount;
    const minReq = parseFloat(currentLevelConfig.min_bal || 0);

    // เช็คยอดเงินขั้นต่ำ
    if(netAvailable < minReq) { 
        setTxt('lb-min', formatMoney(minReq)); 
        if(totalFrozenAmount > 0) {
            showCustomAlert(getTrans('alert_error') || 'Error', `Balance insufficient (Frozen: ${formatMoney(totalFrozenAmount)})`);
        } else {
            showModal('modal-low-balance'); 
        }
        return; 
    }

    // เช็คจำนวนงานต่อวัน
    if((userData.todayCount||0) >= (effective.orders||0)) {
        return showCustomAlert(getTrans('alert_success') || 'Success', 'Mission Completed!', true);
    }

    // --- เริ่มกระบวนการ ---
    btn.disabled = true;
    
    try {
        // 1. เช็คออเดอร์ค้าง (Checking Pending...)
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${txtCheck}`;
        
        const pendingSnap = await withTimeout(
            window.db.collection("orders")
                .where("username", "==", userData.username)
                .where("status", "==", "pending")
                .limit(1).get()
        );
            
        if (!pendingSnap.empty) {
            throw new Error("PENDING_ORDER");
        }

        // 2. โหลดสินค้า (Loading Products...)
        btn.innerHTML = `<i class="fa-solid fa-box-open fa-bounce"></i> ${txtLoad}`;
        await new Promise(r => setTimeout(r, 800)); // หน่วงเวลาเล็กน้อยให้ดูสมจริง

        const snap = await withTimeout(window.db.collection("products").get());
        if(snap.empty) throw new Error("NO_PRODUCTS");
        
        // 3. จับคู่สินค้า (Matching...)
        btn.innerHTML = `<i class="fa-solid fa-magnifying-glass fa-beat-fade"></i> ${txtMatch}`;
        await new Promise(r => setTimeout(r, 1000));

        // สุ่มสินค้า
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
        
        // คำนวณคอมมิชชั่น
        const commRate = parseFloat(effective.rate || 0);
        const commission = price * commRate;
        const totalReturn = price + commission;
        const orderId = "ORD" + Date.now() + Math.floor(Math.random() * 1000);

        // สร้างข้อมูลออเดอร์
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
        
        // บันทึกลง Database
        const docRef = await withTimeout(window.db.collection("orders").add(newOrderData));
        window.currentMatchedOrder = { ...newOrderData, docId: docRef.id };

        // อัปเดตหน้า Modal จับคู่สำเร็จ
        setTxt('match-id', `${getTrans('txt_order_id') || 'ID'}: ${orderId}`); 
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
            showCustomAlert('Alert', txtNoProduct);
        } else {
            console.error(e);
            if (e.code === "resource-exhausted") {
                showCustomAlert('Quota Exceeded', 'ระบบใช้งานเกินขีดจำกัดของวันแล้ว');
            } else {
                showCustomAlert('Error', e.message);
            }
        }
    } finally {
        // คืนค่าปุ่มกลับสู่สภาพเดิม
        btn.innerHTML = originalText; 
        btn.disabled = false; 
        
        // ถ้าภาษาเปลี่ยน ให้แปลปุ่มกลับด้วย
        const startBtnTxt = getTrans('work_start_btn');
        if(startBtnTxt) btn.innerText = startBtnTxt;
    }
}

// ✅ 2. ฟังก์ชันยืนยันส่งงาน (ฉบับสมบูรณ์ + แก้ภาษา)
async function confirmMatchSubmit() {
    if(!window.currentMatchedOrder || !window.currentMatchedOrder.docId) {
        hideModal('modal-matched-order');
        return;
    }

    if(!realDocId) {
        let stored = localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')) : null;
        if(stored && stored.docId) realDocId = stored.docId;
    }

    const submitBtn = document.getElementById('btn-submit-order');
    if(submitBtn.disabled) return;

    const originalBtnText = submitBtn.innerHTML;
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

        // ข้อความแจ้งเตือนสำเร็จ (เปลี่ยนภาษาได้)
        const successTitle = getTrans('alert_submit_success') || 'สำเร็จ!';
        const successMsg = getTrans('alert_submit_msg') || 'เงินรางวัลเข้าบัญชีแล้ว';
        
        showCustomAlert(successTitle, successMsg, true);
        hideModal('modal-matched-order');
        window.currentMatchedOrder = null;

    } catch(e) { 
        console.error(e);
        if (e.code === "resource-exhausted") {
            showCustomAlert('Quota Exceeded', 'ระบบใช้งานเกินขีดจำกัดของวันแล้ว');
        } else {
            showCustomAlert('Error', 'ไม่สามารถส่งงานได้: ' + e.message); 
        }
    } finally {
        submitBtn.innerHTML = originalBtnText; 
        submitBtn.disabled = false; 
    }
}

function startDeposit() { document.getElementById('deposit-password').value=''; showModal('modal-deposit-step1'); }
function verifyDepositPassword() { 
    if(document.getElementById('deposit-password').value === (userData.password||'123456')) { 
        hideModal('modal-deposit-step1'); 
        showDepositInput(); 
    } else { 
        // ✅ ใช้ getTrans ตรงนี้
        const title = getTrans('alert_wrong_pwd_title') || 'Wrong Password';
        const msg = getTrans('alert_wrong_pwd_msg') || 'Incorrect password';
        showCustomAlert(title, msg); 
    } 
}
async function showDepositInput() { 
    showModal('modal-deposit-step2'); 
    setTxt('dep-min', getTrans('work_loading_products') || 'Loading...'); // ใช้คำว่า Loading ที่มีอยู่แล้วก็ได้
    
    const netBalance = currentBalance - totalFrozenAmount; 
    let requiredAmount = 0; 
    
    try { 
        const s = await window.db.collection("levels").where("name", "==", userData.level || "VIP 1").get(); 
        let minDB = !s.empty ? (s.docs[0].data().min_bal || 100) : 100; 
        
        if (netBalance < 0) { 
            requiredAmount = Math.abs(netBalance); 
            document.getElementById('deposit-amount').value = requiredAmount; 
            
            // ✅ ใช้ getTrans ตรงนี้ (ชำระยอดติดลบ)
            const txtNegative = getTrans('txt_pay_negative') || 'Pay Negative Balance';
            setTxt('dep-min', `${formatMoney(requiredAmount)} (${txtNegative})`); 
        } else { 
            requiredAmount = minDB; 
            document.getElementById('deposit-amount').value = ''; 
            setTxt('dep-min', formatMoney(requiredAmount)); 
        } 
    } catch(e) { 
        setTxt('dep-min', '฿100.00'); 
    } 
}
async function confirmDepositInput() { 
    if (!window.db) { showCustomAlert('Error', 'Connection failed'); return; } 
    
    const amtInput = document.getElementById('deposit-amount'); 
    const amt = parseFloat(amtInput.value); 
    
    // ดึงข้อมูล User อีกรอบกันพลาด
    if (!realDocId) { 
        let stored = localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')) : null; 
        if(stored && stored.docId) { realDocId = stored.docId; userData = stored; } 
    } 
    if (!realDocId) { showCustomAlert('Error', 'Session Expired'); return; } 
    
    const netBalance = currentBalance - totalFrozenAmount; 
    let minRequired = (netBalance < 0) ? Math.abs(netBalance) : 0; 
    
    // ✅ แจ้งเตือนยอดเงินไม่ถูกต้อง
    if(!amt || amt <= 0) return showCustomAlert(getTrans('alert_amount_title'), getTrans('alert_invalid_amount')); 
    
    // ✅ แจ้งเตือนยอดขั้นต่ำ (กรณีติดลบ)
    if (netBalance < 0 && amt < minRequired) { 
        return showCustomAlert(getTrans('alert_amount_title'), `${getTrans('alert_need_min')} ${formatMoney(minRequired)}`); 
    } 
    
    const btn = document.getElementById('btn-confirm-deposit'); 
    const oldText = btn.innerHTML; 
    
    // ✅ สถานะปุ่มกำลังส่ง
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${getTrans('alert_sending') || 'Sending...'}`; 
    btn.disabled = true; 
    
    try { 
        const payload = { 
            user_id: String(realDocId), 
            username: userData.username || 'Unknown', 
            amount: Number(amt), 
            status: 'pending', 
            timestamp: new Date().toISOString() 
        }; 
        
        await withTimeout(window.db.collection("recharges").add(payload), 10000); 
        
        hideModal('modal-deposit-step2'); 
        showModal('modal-deposit-success'); 
        amtInput.value = ''; 
    } catch(e) { 
        console.error("Deposit Error:", e); 
        showCustomAlert('Error', `Failed: ${e.message}`); 
    } finally { 
        btn.innerHTML = oldText; 
        btn.disabled = false; 
    } 
}
function startWithdrawal() { if(!userData) return; document.getElementById('wd-bank-name').value = ''; document.getElementById('wd-acc-name').value = ''; document.getElementById('wd-acc-no').value = ''; showModal('modal-withdraw-step1'); }

// ✅ FIXED: goToWithdrawStep2 (เพิ่มเช็ค Trade Settings)
async function goToWithdrawStep2() { 
    const bank = document.getElementById('wd-bank-name').value.trim(); 
    const accName = document.getElementById('wd-acc-name').value.trim(); 
    const accNo = document.getElementById('wd-acc-no').value.trim(); 
    
    // ✅ แจ้งเตือนข้อมูลไม่ครบ
    if(!bank || !accName || !accNo) {
        return showCustomAlert(getTrans('alert_incomplete_info'), getTrans('alert_fill_bank'));}
    
    // ✅ เริ่มเช็คเงื่อนไขการถอน
    const btn = document.querySelector('#modal-withdraw-step1 button'); 
    const oldText = btn.innerHTML; 
    
   btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${getTrans('alert_checking_limit') || 'Checking...'}`; 
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
                throw new Error(getTrans('alert_quota_msg'));
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
        // ✅ ถ้าเป็น Error โควต้า ให้ใช้หัวข้อเฉพาะ
        const title = e.message === getTrans('alert_quota_msg') ? getTrans('alert_quota_exceeded') : 'Error';
        showCustomAlert(title, e.message);
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
    
    if(!amount || amount <= 0) return showCustomAlert(getTrans('alert_amount_title'), getTrans('alert_invalid_amount')); 
    
    // ✅ แจ้งเตือนยอดขั้นต่ำ
    if(withdrawInfo.minWithdraw && amount < withdrawInfo.minWithdraw) {
        return showCustomAlert(getTrans('alert_wd_min'), `${getTrans('alert_wd_min_msg')} ${formatMoney(withdrawInfo.minWithdraw)}`);
    }

    // ✅ แจ้งเตือนยอดไม่พอ
    if(amount > withdrawInfo.available) return showCustomAlert(getTrans('alert_wd_bal_low'), getTrans('alert_wd_frozen_msg')); 
    
    // ✅ แจ้งเตือนรหัสผิด
    if(pwd !== (userData.password || '123456')) return showCustomAlert(getTrans('alert_wrong_pwd_title'), getTrans('alert_wrong_pwd_msg')); 
    
    if(!confirm(`Confirm ${formatMoney(amount)}?`)) return; 
    
    const btn = document.getElementById('btn-confirm-wd'); 
    const oldHtml = btn.innerHTML; 
    
    // ✅ สถานะปุ่มกำลังประมวลผล
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${getTrans('alert_sending') || 'Processing...'}`; 
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
        showModal('modal-withdraw-success'); 
    } catch(e) { 
        showCustomAlert('Error', e.message); 
    } finally { 
        btn.innerHTML = oldHtml; 
        btn.disabled = false; 
    } 
}

function showAdminQR() { hideModal('modal-withdraw-success'); hideModal('modal-deposit-success'); showModal('modal-admin-qr'); }
async function markRead(docId) { await window.db.collection("notifications").doc(docId).update({ read: true }); }

function getTrans(key) {
    const lang = localStorage.getItem('selectedLang') || 'th';
    if (typeof translations !== 'undefined' && translations[lang] && translations[lang][key]) {
        return translations[lang][key];
    }
    return null; // คืนค่า null ถ้าหาไม่เจอ
}

function showInviteModal() {
    // ดึงคำแปล ถ้าไม่มีให้ใช้ค่าเดิม (ภาษาไทย)
    const title = getTrans('invite_code_title') || 'Invite Code';
    const msg = getTrans('invite_code_msg') || 'รหัสแนะนำของคุณคือ:';
    
    showCustomAlert(title, `${msg} ${userData.invite_code}`);
}
function logout() { 
    // ดึงคำแปล ถ้าไม่มีให้ใช้ค่าเดิม
    const confirmMsg = getTrans('confirm_logout') || "ออกจากระบบ?";

    if(confirm(confirmMsg)) { 
        if(unsubscribeUser) unsubscribeUser(); 
        if(unsubscribeFrozen) unsubscribeFrozen(); 
        localStorage.removeItem('currentUser'); 
        localStorage.removeItem('frozenAmount'); 
        
        const pathConfig = getPathConfig();
        window.location.href = pathConfig.prefix + 'login.html'; 
    } 
}
// --- Multi-Language System (เพิ่มส่วนนี้ต่อท้ายไฟล์ app.js) ---

function changeLanguage(langCode) {
    if (!translations[langCode]) return;
    localStorage.setItem('selectedLang', langCode);

    // 1. เปลี่ยนข้อความในเว็บ
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[langCode][key]) {
            if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translations[langCode][key];
            } else {
                el.innerHTML = translations[langCode][key];
            }
        }
    });

    // 2. ✅ เปลี่ยนชื่อแท็บ Browser (Title)
    const titleKey = document.title.getAttribute ? document.title.getAttribute('data-i18n') : null;
    // หมายเหตุ: <title> ไม่รองรับ attribute โดยตรงในบาง browser เราจะใช้วิธีค้นหาจาก ID แทน
    const titleTag = document.querySelector('title');
    if(titleTag && titleTag.hasAttribute('data-i18n')) {
        const tKey = titleTag.getAttribute('data-i18n');
        if(translations[langCode][tKey]) {
            document.title = translations[langCode][tKey];
        }
    }

    // ปิด Modal
    const modal = document.getElementById('modal-language');
    if(modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

function initLanguage() {
    const savedLang = localStorage.getItem('selectedLang') || 'th';
    changeLanguage(savedLang);
}

// --- Service Contact Functions ---

// ฟังก์ชันเปิด Modal พร้อมตั้งค่า Line ID
function openServiceContact(lineId) {
    const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://line.me/ti/p/~${lineId}`;
    
    // อัปเดตข้อมูลใน Modal
    document.getElementById('service-qr-img').src = qrApi;
    document.getElementById('service-line-id').innerText = lineId;
    document.getElementById('service-line-link').href = `https://line.me/ti/p/~${lineId}`;
    
    // แปลภาษาใน Modal ให้เรียบร้อยก่อนแสดง
    if(typeof changeLanguage === 'function') {
        const currentLang = localStorage.getItem('selectedLang') || 'th';
        changeLanguage(currentLang); 
    }

    showModal('modal-service-contact');
}

// ฟังก์ชันคัดลอก Line ID
function copyLineID() {
    const lineId = document.getElementById('service-line-id').innerText;
    navigator.clipboard.writeText(lineId).then(() => {
        const msg = getTrans('alert_copied') || 'Copied!';
        showCustomAlert(getTrans('alert_success') || 'Success', msg, true);
    }).catch(err => {
        console.error('Copy failed', err);
    });
}

function openLangModal() {
    if (!document.getElementById('modal-language')) {
        const modalHtml = `
        <div id="modal-language" class="fixed inset-0 z-[200] bg-black/60 hidden items-center justify-center p-4 font-sans backdrop-blur-sm">
            <div class="bg-white rounded-xl w-full max-w-xs overflow-hidden animate-[scaleIn_0.2s_ease-out]">
                <div class="bg-[#DC2626] text-white p-4 flex justify-between items-center">
                    <h3 class="font-bold text-lg" data-i18n="lang_select">Select Language</h3>
                    <button onclick="document.getElementById('modal-language').classList.add('hidden');document.getElementById('modal-language').classList.remove('flex')" class="text-white hover:text-gray-200">
                        <i class="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>
                <div class="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto custom-scroll">
                    <div onclick="changeLanguage('th')" class="p-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer"><span class="text-2xl">🇹🇭</span> <span class="text-gray-700 font-bold text-sm">ภาษาไทย</span></div>
                    <div onclick="changeLanguage('en')" class="p-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer"><span class="text-2xl">🇬🇧</span> <span class="text-gray-700 font-bold text-sm">English</span></div>
                    <div onclick="changeLanguage('mm')" class="p-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer"><span class="text-2xl">🇲🇲</span> <span class="text-gray-700 font-bold text-sm">Myanmar</span></div>
                    <div onclick="changeLanguage('zh')" class="p-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer"><span class="text-2xl">🇨🇳</span> <span class="text-gray-700 font-bold text-sm">Chinese (中文)</span></div>
                    <div onclick="changeLanguage('jp')" class="p-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer"><span class="text-2xl">🇯🇵</span> <span class="text-gray-700 font-bold text-sm">Japanese (日本語)</span></div>
                    <div onclick="changeLanguage('vn')" class="p-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer"><span class="text-2xl">🇻🇳</span> <span class="text-gray-700 font-bold text-sm">Vietnamese (Tiếng Việt)</span></div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    const modal = document.getElementById('modal-language');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// เริ่มทำงานเมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
    // รอสักนิดให้ DOM โหลดเสร็จแล้วค่อยเปลี่ยนภาษา
    setTimeout(initLanguage, 100); 
});