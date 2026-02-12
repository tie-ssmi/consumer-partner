// app.js - Version: Full Update with Admin Trade Settings

// --- Global Configuration ---
// 🔴 เปลี่ยนลิงก์โลโก้ตรงนี้ที่เดียว เปลี่ยนทุกหน้าครับ 🔴
const SITE_LOGO_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAaCAMAAACTisy7AAAAKlBMVEVHcEx4GUR3GkV3IUd4GER4HkZ4OFJ3Ikh4IUh4GUV3Ikd4G0V3GUV4F0Q+WLQcAAAADXRSTlMAq88+9WYMKk/nG4q7F5KB4wAAAJ9JREFUKJGVkksShCAMRAmCQID7X3eCUuZDNtMr24cJ3WUI/+iClhpcLovzVbxPluang0Zms9l9U6pqCAqO510Z67HoqXtu3iY7kBeVcywfj1XBTFBYGZNcCLe0RZinQXW2aCbCwbJ9jU59J+e51GbN9AWKXvC9RsKd2NSWIQJdvKp1RrIaK5TLrTgGnpATezv7Zt2DYXAXjipl8v/KUz+skhAyQOCYWgAAAABJRU5ErkJggg=="; 
// ✅ กำหนด Line ID ที่นี่ที่เดียว (เปลี่ยนตรงนี้ เปลี่ยนทุกปุ่ม)
var SITE_LINE_MAIN = "@DEFAULT_LINE";   // ค่าเริ่มต้น (จะถูกทับด้วยค่าจาก DB)
var SITE_LINE_BACKUP = "@DEFAULT_BACKUP";

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
var systemContentData = { news: {}, cert: {} };
var unsubscribeUser = null;
var unsubscribeFrozen = null;
var lastRandomIndex = -1; 
var heartbeatInterval = null;

// --- 3. Helper Functions ---

// ✅ ฟังก์ชันดึงค่าตั้งค่า (เลือกใช้ระหว่าง VIP หรือ ค่าที่ Admin ตั้งให้ส่วนตัว)
function getEffectiveConfig() {
    // 1. เอาค่ามาตรฐานจากระดับ VIP มาตั้งต้น
    let cfg = currentLevelConfig ? { ...currentLevelConfig } : { rate: 0, orders: 0, min_withdraw_amount: 0, withdraw_limit: 0 };

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
function formatMoney(amount) { 
    return '฿' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); 
}
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
    fetchSystemContent();
    fetchGlobalSettings();
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

    // 1. ประกาศตัวแปร html เริ่มต้น
    let html = `
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
                        
                        <div class="text-[10px] text-gray-500 mt-1">
                            <span data-i18n="lbl_price_per_unit">Price:</span> <span id="match-unit-price" class="font-bold text-black">...</span>
                            x <span id="match-qty" class="font-bold text-blue-600 bg-blue-50 px-1 rounded">...</span>
                        </div>

                        <div class="text-lg font-bold text-[#DC2626]" id="match-total-display">...</div>
                    </div>
                </div>
                
                <div class="bg-gray-50 p-3 rounded-lg text-sm border border-gray-100 space-y-2 mb-4">
                    <div class="flex justify-between items-center">
                        <span class="text-gray-500 text-xs" data-i18n="modal_total_order">Total Order</span>
                        <span id="match-total" class="font-bold text-gray-800">...</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-gray-500 text-xs" data-i18n="modal_commission">Commission</span>
                        <span id="match-comm" class="font-bold text-green-600 text-lg">...</span>
                    </div>
                    <div class="flex justify-between items-center pt-2 border-t border-dashed border-gray-200 mt-2">
                        <span class="text-gray-500 text-xs" data-i18n="modal_return">Return Amount</span>
                        <span id="match-return" class="font-bold text-[#DC2626]">...</span>
                    </div>
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
    <div id="modal-low-balance" class="fixed inset-0 bg-black/60 hidden items-center justify-center z-[80] p-4 font-sans" onclick="if(event.target===this) hideModal('modal-low-balance')"><div class="bg-white rounded-xl w-full max-w-xs p-6 text-center"><div class="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3"><i class="fa-solid fa-coins text-xl"></i></div><h3 class="text-lg font-bold text-gray-800">ยอดเงินไม่พอ</h3><p class="text-sm text-gray-500 my-2">ต้องการขั้นต่ำ: <span id="lb-min" class="text-red-600 font-bold">...</span></p><div class="flex gap-2"><button onclick="hideModal('modal-low-balance')" class="flex-1 py-2 bg-gray-100 rounded text-sm font-bold">ยกเลิก</button><button onclick="window.location.href='index_user/profile.html'" class="flex-1 py-2 bg-[#DC2626] text-white rounded text-sm font-bold">เติมเงิน</button></div></div></div>
   
    <div id="modal-withdraw-step1" class="fixed inset-0 bg-black/60 hidden items-center justify-center z-[80] p-4 font-sans backdrop-blur-sm" onclick="if(event.target===this) hideModal('modal-withdraw-step1')">
        <div class="bg-white rounded-xl w-full max-w-sm p-5 relative animate-[scaleIn_0.2s_ease-out]">
            <button onclick="hideModal('modal-withdraw-step1')" class="absolute top-2 right-2 text-gray-400"><i class="fa-solid fa-xmark text-lg"></i></button>
            <div class="text-center mb-4"><div class="w-12 h-12 bg-red-50 text-[#DC2626] rounded-full flex items-center justify-center mx-auto mb-2"><i class="fa-solid fa-building-columns text-xl"></i></div><h3 class="font-bold text-lg" data-i18n="modal_wd_title_1">ข้อมูลบัญชีรับเงิน</h3><p class="text-xs text-gray-400">กรุณาตรวจสอบข้อมูลก่อนดำเนินการ</p></div>
            <div class="space-y-3">
                <div><label class="text-xs font-bold text-gray-700"><span data-i18n="bank_lbl_holder">ชื่อเจ้าของบัญชี</span> <span class="text-red-500">*</span></label><input type="text" id="wd-acc-name" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm mt-1 focus:border-red-500 outline-none bg-gray-50 focus:bg-white transition" placeholder="Account Name (Required)"></div>
                <div><label class="text-xs font-bold text-gray-700"><span data-i18n="bank_lbl_name">ธนาคาร</span> <span class="text-red-500">*</span></label><input type="text" id="wd-bank-name" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm mt-1 focus:border-red-500 outline-none bg-gray-50 focus:bg-white transition" placeholder="Bank Name (Required)"></div>
                <div><label class="text-xs font-bold text-gray-700"><span data-i18n="bank_lbl_acc">เลขบัญชี</span> <span class="text-red-500">*</span></label><input type="tel" id="wd-acc-no" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm mt-1 focus:border-red-500 outline-none font-bold text-[#DC2626] bg-gray-50 focus:bg-white transition" placeholder="Account Number (Required)"></div>
                <div><label class="text-xs font-bold text-gray-500"><span data-i18n="bank_lbl_digital">บัญชีดิจิทัล / Wallet</span> <span class="text-gray-400 text-[10px]">(Optional/ไม่บังคับ)</span></label><input type="text" id="wd-wallet" class="w-full border border-gray-200 rounded-lg p-2 text-xs mt-1 focus:border-gray-400 outline-none" placeholder="Digital ID / Wallet (ถ้ามี)"></div>
            </div>
            <button onclick="goToWithdrawStep2()" class="w-full bg-[#DC2626] text-white py-3 rounded-lg font-bold shadow-md hover:bg-red-700 active:scale-95 transition mt-6 text-sm"><span data-i18n="btn_next">ถัดไป (Next)</span> <i class="fa-solid fa-arrow-right ml-1"></i></button>
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
    
    <div id="about-us" class="fixed inset-0 z-[150] bg-[#f3f4f6] hidden flex-col w-full h-full font-sans max-w-xl mx-auto left-0 right-0">
        <div class="bg-[#DC2626] text-white h-14 flex items-center px-4 shadow-md shrink-0 sticky top-0 z-50 justify-between">
            <button onclick="toggleAboutUs()" class="hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition"><i class="fa-solid fa-chevron-left text-lg"></i></button>
            <h1 class="text-lg font-bold" data-i18n="cert_header">About Us</h1>
            <div class="w-8"></div>
        </div>
        <div class="flex-1 overflow-y-auto p-4 custom-scroll pb-20">
            <div class="bg-white rounded-xl shadow-sm p-5 mb-6">
                <div id="dynamic-cert-content" class="text-sm text-gray-600 leading-relaxed space-y-4">
                    <div class="text-center text-gray-400 py-10">
                        <i class="fa-solid fa-circle-notch fa-spin"></i> Loading content...
                    </div>
                </div>
            </div>
        </div>
    </div>

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
        <div class="bg-[#DC2626] text-white h-14 flex items-center px-4 shadow-md shrink-0 sticky top-0 z-50 justify-between">
            <button onclick="toggleNewsModal()" class="hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition"><i class="fa-solid fa-chevron-left text-lg"></i></button>
            <h1 class="text-lg font-bold" data-i18n="news_header">News</h1>
            <div class="w-8"></div>
        </div>
        <div class="flex-1 overflow-y-auto p-4 custom-scroll pb-20">
            <div class="bg-white rounded-xl shadow-sm p-5 mb-6">
                <div class="text-right text-xs text-gray-400 mb-4" id="dynamic-news-date">...</div>
                <div id="dynamic-news-content" class="text-sm text-gray-600 leading-relaxed space-y-4">
                    <div class="text-center text-gray-400 py-10">
                        <i class="fa-solid fa-circle-notch fa-spin"></i> Loading News...
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    // 2. ต่อท้ายด้วย Modal แจ้งเตือนออเดอร์ค้าง (ที่เพิ่งทำไป)
  // ✅✅✅ แก้ไข: ใส่ data-i18n เพื่อรองรับหลายภาษา ✅✅✅
    html += `
    <div id="modal-pending-warning" class="fixed inset-0 z-[110] bg-black/60 hidden items-center justify-center p-6 font-sans backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
        <div class="bg-white rounded-2xl w-full max-w-xs p-6 text-center shadow-2xl relative">
            
            <div class="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                <i class="fa-solid fa-clock-rotate-left text-3xl text-orange-500"></i>
            </div>

            <h3 class="text-lg font-bold text-gray-800 mb-2" data-i18n="warn_pending_title">ออเดอร์ค้าง!</h3>
            
            <p class="text-sm text-gray-500 mb-6 leading-relaxed" data-i18n="warn_pending_msg">
                คุณมีออเดอร์ที่ยังไม่เสร็จสิ้น! <br>กรุณาทำรายการให้เสร็จก่อน
            </p>

            <div class="flex gap-3">
                <button onclick="goToPendingOrder()" class="flex-1 bg-[#DC2626] text-white py-2.5 rounded-xl font-bold shadow-md hover:bg-red-700 active:scale-95 transition text-xs" data-i18n="btn_go_order">
                    ไปทำรายการ
                </button>
                
                <button onclick="hideModal('modal-pending-warning')" class="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-bold hover:bg-gray-200 active:scale-95 transition text-xs" data-i18n="btn_cancel">
                    ยกเลิก
                </button>
            </div>
        </div>
    </div>
    `;

    // 3. ยัดเข้า Container ทีเดียว
    container.innerHTML = html;
}
// --- 9. Dynamic Content System ---

async function fetchSystemContent() {
    if (!window.db) return;

    try {
        const doc = await window.db.collection("settings").doc("public_content").get();

        if (doc.exists) {
            const data = doc.data();

            // 1. เก็บข้อมูลลงตัวแปร Global แยกตามภาษา
            systemContentData.news = {
                en: data.news_html_en || data.news_html || "",
                th: data.news_html_th || data.news_html || "",
                mm: data.news_html_mm || "", // พม่า
                zh: data.news_html_zh || "", // จีน
                jp: data.news_html_jp || "", // ญี่ปุ่น
                vn: data.news_html_vn || ""  // เวียดนาม // ถ้าไม่มีไทย ให้ใช้ default
                // เพิ่มภาษาอื่นได้ตรงนี้ เช่น cn: data.news_html_cn
            };

            systemContentData.cert = {
                en: data.certificate_html_en || data.certificate_html || "",
                th: data.certificate_html_th || data.certificate_html || ""
            };

            // 2. อัปเดตวันที่ (ใช้อันเดียวกันทุกภาษา)
            const newsDate = document.getElementById('dynamic-news-date');
            if (newsDate && data.news_date) newsDate.innerText = data.news_date;

            // 3. เรียกแสดงผลทันทีตามภาษาปัจจุบัน
            const currentLang = localStorage.getItem('selectedLang') || 'th';
            renderSystemContent(currentLang);
        }
    } catch (e) {
        console.error("Failed to load content:", e);
    }
}
function renderSystemContent(lang) {
    // ถ้าไม่มีภาษาที่ส่งมา ให้ใช้ th เป็นหลัก
    lang = lang || 'th'; 
    
    // ถ้าภาษาที่เลือกไม่มีข้อมูล ให้ใช้ภาษาอังกฤษแทน (Fallback)
    const newsContent = systemContentData.news[lang] || systemContentData.news['en'];
    const certContent = systemContentData.cert[lang] || systemContentData.cert['en'];

    // อัปเดต News
    const newsEl = document.getElementById('dynamic-news-content');
    if (newsEl && newsContent) {
        newsEl.innerHTML = newsContent;
    }

    // อัปเดต Certificate
    const certEl = document.getElementById('dynamic-cert-content');
    if (certEl && certContent) {
        certEl.innerHTML = certContent;
    }
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
            const data = doc.data();

            // 🔴 [เพิ่มใหม่] เช็คสถานะ: ถ้าโดนบล็อก ให้เด้งออกทันที
            if (data.account_status === 'blocked') {
                // 1. แจ้งเตือน
                alert('⛔ บัญชีของคุณถูกระงับการใช้งาน\nกรุณาติดต่อผู้ดูแลระบบเพื่อตรวจสอบ');
                
                // 2. ล้างข้อมูลในเครื่อง
                localStorage.removeItem('currentUser');
                localStorage.removeItem('frozenAmount');
                
                // 3. ดีดกลับไปหน้า Login (ใช้ Logic หา Path อัตโนมัติ)
                const pathConfig = getPathConfig(); 
                window.location.href = pathConfig.prefix + 'login.html';
                
                return; // จบการทำงาน ไม่ต้องโหลดข้อมูลต่อ
            }
            // ----------------------------------------------------

            userData = { docId: doc.id, ...data };
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
        
        // ✅ เพิ่มบรรทัดนี้: ให้แสดงจำนวนงานจาก DB ทันทีที่มีการเปลี่ยนแปลง
        setTxt('work-completed-orders', userData.todayCount || 0);

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
// ✅ ฟังก์ชันแสดงรายการแจ้งเตือน (ปรับสี: เติม=เขียว, ถอน=แดง)
function renderMixedNotifications() {
    const list = document.getElementById('notif-list');
    const dots = document.querySelectorAll('.notif-dot-badge');
    
    // อัปเดตหัวข้อและปุ่มปิด
    const headerTitle = document.querySelector('#floating-notif span:first-child');
    const closeBtn = document.querySelector('#floating-notif span:last-child');
    if(headerTitle) headerTitle.innerText = getTrans('notif_header') || 'การแจ้งเตือน';
    if(closeBtn) closeBtn.innerText = getTrans('notif_close') || 'ปิด';

    if(!list) return;
    
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
        const amtTxt = getTrans('n_amt') || 'ยอด';

        // --- กรณีที่ 1: แจ้งเตือนการถอนเงิน (Withdraw) ---
        if (n.notifType === 'withdraw') {
            if(status === 'pending' || status === 'รอตรวจสอบ') { 
                title = getTrans('n_wd_wait') || 'แจ้งถอนเงิน'; 
                msg = `${amtTxt} ${formatMoney(n.amount)} ${getTrans('n_msg_wait') || 'กำลังรอการตรวจสอบ'}`; 
                colorClass = 'text-orange-500'; icon = 'fa-clock'; 
            }
            else if (status.includes('approved') || status.includes('อนุมัติ')) { 
                title = getTrans('n_wd_ok') || 'ถอนเงินสำเร็จ'; 
                msg = `${amtTxt} -${formatMoney(n.amount)} ${getTrans('n_msg_ok_wd') || 'อนุมัติแล้ว เงินเข้าบัญชี'}`; 
                
                // 🔴 ถอนเงินสำเร็จ -> ให้เป็นสีแดง (เงินออก)
                colorClass = 'text-red-600'; 
                icon = 'fa-circle-minus'; // เปลี่ยนไอคอนเป็นลบ
                hasUnread = true; 
            }
            else { 
                title = getTrans('n_wd_fail') || 'ถอนเงินถูกปฏิเสธ'; 
                msg = `${amtTxt} ${formatMoney(n.amount)} ${getTrans('n_msg_fail') || 'ถูกยกเลิก'}`; 
                colorClass = 'text-gray-500'; icon = 'fa-circle-xmark'; hasUnread = true; 
            }
        } 
        // --- กรณีที่ 2: แจ้งเตือนการเติมเงิน (Recharge) ---
        else if (n.notifType === 'recharge') {
             if(status === 'pending') { 
                 title = getTrans('n_rc_wait') || 'แจ้งเติมเงิน'; 
                 msg = `${amtTxt} ${formatMoney(n.amount)} ${getTrans('n_msg_wait') || 'กำลังรอการตรวจสอบ'}`; 
                 colorClass = 'text-orange-500'; icon = 'fa-clock'; 
            }
            else if (status.includes('approved') || status.includes('อนุมัติ')) { 
                title = getTrans('n_rc_ok') || 'เติมเงินสำเร็จ'; 
                msg = `${amtTxt} +${formatMoney(n.amount)} ${getTrans('n_msg_ok_rc') || 'เข้ากระเป๋าแล้ว'}`; 
                
                // 🟢 เติมเงินสำเร็จ -> ให้เป็นสีเขียว (เงินเข้า)
                colorClass = 'text-green-600'; 
                icon = 'fa-circle-check'; 
                hasUnread = true; 
            }
            else { 
                title = getTrans('n_rc_fail') || 'เติมเงินล้มเหลว'; 
                msg = `${amtTxt} ${formatMoney(n.amount)} ${getTrans('n_msg_fail') || 'ไม่ผ่านการอนุมัติ'}`; 
                colorClass = 'text-red-600'; icon = 'fa-circle-xmark'; hasUnread = true; 
            }
        } 
        // --- กรณีที่ 3: แจ้งเตือนทั่วไป (Manual/System Notification) ---
        else {
            title = n.title; 
            msg = n.message; 
            
            // ตั้งค่าสีพื้นฐาน
            colorClass = n.read ? 'text-gray-600' : 'text-blue-600';
            icon = 'fa-bell';

            // 🔥 ดักจับคำเพื่อเปลี่ยนสีตามประเภท 🔥
            if (title.includes('ถอนเงินสำเร็จ') || title.includes('Withdraw Success')) {
                // 🔴 ถอน = แดง
                title = getTrans('n_wd_ok') || title;
                colorClass = 'text-red-600';
                icon = 'fa-circle-minus';
                
                // จัดรูปแบบตัวเลขในข้อความ (ถ้ามี)
                const amt = n.message.match(/[\d,]+\.?\d*/); 
                if(amt) msg = `${getTrans('n_amt') || 'ยอด'} -฿${Number(amt[0].replace(/,/g,'')).toLocaleString()} ${getTrans('n_msg_ok_wd') || 'อนุมัติแล้ว'}`;
            } 
            else if (title.includes('เติมเงินสำเร็จ') || title.includes('Recharge Success')) {
                // 🟢 เติม = เขียว
                title = getTrans('n_rc_ok') || title;
                colorClass = 'text-green-600';
                icon = 'fa-circle-check';

                const amt = n.message.match(/[\d,]+\.?\d*/);
                if(amt) msg = `${getTrans('n_amt') || 'ยอด'} +฿${Number(amt[0].replace(/,/g,'')).toLocaleString()} ${getTrans('n_msg_ok_rc') || 'เข้ากระเป๋าแล้ว'}`;
            }
            else if (title.includes('แจ้งเติมเงิน') || title.includes('Recharge Request')) {
                title = getTrans('n_rc_wait') || title;
                colorClass = 'text-orange-500';
                icon = 'fa-clock';
            }

            if(!n.read) hasUnread = true;
        }
        
        html += `
        <div class="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 bg-white group transition">
            <div class="flex justify-between mb-1">
                <div class="flex items-center gap-2">
                    <i class="fa-solid ${icon} ${colorClass} text-sm"></i>
                    <span class="text-xs font-bold ${colorClass}">${title}</span>
                </div>
                <span class="text-[9px] text-gray-400">${n.timestamp ? new Date(n.timestamp).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
            </div>
            <div class="text-[10px] text-gray-500 line-clamp-2 pl-6 leading-relaxed">${msg}</div>
        </div>`;
    });
    
    list.innerHTML = html;
    dots.forEach(d => { if(hasUnread) d.classList.remove('hidden'); else d.classList.add('hidden'); });
}

// ✅ FIXED: ใช้ getEffectiveConfig เพื่อแสดงผลค่าที่ถูกต้อง
// ✅ ฟังก์ชันดึง Config ระดับสมาชิก (แก้ไข: โหลดไวขึ้นด้วย Caching)
async function fetchLevelConfig() {
    if (!userData || !window.db) return;

    // 1. สร้าง Key สำหรับเก็บ Cache ตามระดับ VIP (เช่น config_VIP 1)
    const cacheKey = `level_config_${userData.level || "VIP 1"}`;

    // 2. ลองดึงจาก LocalStorage มาโชว์ก่อนทันที (ไม่ต้องรอเน็ต)
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
        currentLevelConfig = JSON.parse(cachedData);
        updateLevelUI(); // อัปเดตหน้าจอทันที
    }

    try {
        // 3. ดึงข้อมูลจริงจาก Firebase (เบื้องหลัง)
        const snap = await window.db.collection("levels").where("name", "==", userData.level || "VIP 1").get();
        
        if(!snap.empty) {
            currentLevelConfig = snap.docs[0].data();
            
            // 4. บันทึกลงเครื่องไว้ใช้ครั้งหน้า
            localStorage.setItem(cacheKey, JSON.stringify(currentLevelConfig));

            // 5. อัปเดตหน้าจออีกครั้ง (เพื่อให้ข้อมูลชัวร์ที่สุด)
            updateLevelUI();
        }
    } catch(e) { 
        console.error("Fetch Level Error:", e); 
    }
}

// ฟังก์ชันช่วยอัปเดตหน้าจอ (แยกออกมาเพื่อเรียกใช้ซ้ำ)
function updateLevelUI() {
    const effective = getEffectiveConfig();

    // อัปเดต % ค่าคอมมิชชั่น
    setTxt('work-rate', (effective.rate * 100).toFixed(2) + "%"); 
    
    // อัปเดตจำนวนงานเป้าหมาย (ตัวที่เป็นปัญหาดีเลย์)
    if(document.getElementById('work-total-orders')) {
        setTxt('work-total-orders', effective.orders); 
    }
}

// ✅ FIXED: startGrabbing ใช้ค่า Effective Config
// ✅ 1. ฟังก์ชันกดเริ่มงาน (ฉบับสมบูรณ์ + แก้ภาษา + แก้บั๊ก)
// ✅ 1. ฟังก์ชันกดเริ่มงาน (เพิ่มระบบ Trap / กับดัก)
// ✅ แก้ไขฟังก์ชัน startGrabbing ในไฟล์ app.js
// ✅ 1. ฟังก์ชันกดเริ่มงาน (แก้ไข: กรองสินค้าตามยอดเงินที่มี)
// ✅ 1. ฟังก์ชันกดเริ่มงาน (แก้ไข: สุ่มจำนวนตาม Min-Max และคุมยอดเงิน)
// ✅ 1. ฟังก์ชันกดเริ่มงาน (เวอร์ชันอัปเกรด: คุมราคารวมให้ได้ 70-90% ของเงินที่มี)
// ✅ ฟังก์ชันกดเริ่มงาน (แก้ไข: คืนค่าระบบกับดัก + ระบบสุ่มยอด 70-90%)
// ✅ ฟังก์ชันกดเริ่มงาน (แก้ไข: ดึงข้อมูลล่าสุดก่อนเริ่ม + ปรับปรุง Logic กับดัก)
// ✅ ฟังก์ชันกดเริ่มงาน (เวอร์ชัน: ดันยอดให้สูงที่สุด ถ้าไม่ถึงเป้า 70-90% ก็เอาแพงสุดเท่าที่ไหว)
async function startGrabbing() {
    const btn = document.getElementById('start-work-btn');
    if(btn.disabled) return; 
    
    // Check Suspended
    if (userData && userData.order_status === 'suspended') {
        showCustomAlert(getTrans('alert_error') || 'Error', "บัญชีของคุณถูกระงับการทำภารกิจชั่วคราว");
        return; 
    }

    const originalText = btn.innerHTML;
    
    // โหลด Config
    if(!currentLevelConfig) { await fetchLevelConfig(); if(!currentLevelConfig) return showCustomAlert('Loading', 'Please wait...'); }
    const effective = getEffectiveConfig();
    const netAvailable = currentBalance - totalFrozenAmount; 
    const minReq = 1000;

    // เช็คขั้นต่ำ
    if(netAvailable < minReq) { 
        setTxt('lb-min', formatMoney(minReq)); 
        if(totalFrozenAmount > 0) showCustomAlert(getTrans('alert_error') || 'Error', `ยอดเงินไม่เพียงพอ (ถูกแช่แข็ง: ${formatMoney(totalFrozenAmount)})`);
        else showModal('modal-low-balance'); 
        return; 
    }

    // เช็คจำนวนงาน
    if((userData.todayCount||0) >= (effective.orders||0)) {
        return showCustomAlert(getTrans('alert_success') || 'Success', 'ภารกิจวันนี้ครบแล้ว!', true);
    }

    btn.disabled = true;

    try {
        // Force Refresh User Data
        if (userData && userData.docId) {
            const freshSnap = await window.db.collection("users").doc(userData.docId).get();
            if (freshSnap.exists) {
                userData = { ...userData, ...freshSnap.data() };
                currentBalance = parseFloat(userData.balance || 0);
            }
        }

        // 1. Check Pending
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${getTrans('work_checking') || 'Checking...'}`;
        const pendingSnap = await withTimeout(window.db.collection("orders").where("username", "==", userData.username).where("status", "==", "pending").limit(1).get());
        if (!pendingSnap.empty) throw new Error("PENDING_ORDER");
        
        // Check Frozen
        const frozenSnap = await withTimeout(window.db.collection("orders").where("username", "==", userData.username).where("status", "==", "frozen").limit(1).get());
        if (!frozenSnap.empty) {
            throw new Error("คุณมีรายการที่ถูกระงับ (Frozen) กรุณาติดต่อฝ่ายบริการลูกค้า");
        }

        // 2. Load Products
        btn.innerHTML = `<i class="fa-solid fa-box-open fa-bounce"></i> ${getTrans('work_loading_products') || 'Loading...'}`;
        await new Promise(r => setTimeout(r, 800));

        const snap = await withTimeout(window.db.collection("products").get());
        if(snap.empty) throw new Error("NO_PRODUCTS");

        // 3. Match Product
        btn.innerHTML = `<i class="fa-solid fa-magnifying-glass fa-beat-fade"></i> ${getTrans('work_matching') || 'Matching...'}`;
        await new Promise(r => setTimeout(r, 1000));


        // 🔥 [ส่วนที่ 1] Trap Logic (กับดัก) 🔥
        let isTrap = false;
        let trapOrderData = null;
        const trapCfg = userData.trap_config;
        const isActive = trapCfg && (trapCfg.active === true || trapCfg.active === 'true');
        const isNotTriggered = trapCfg && !trapCfg.is_triggered;

        if (isActive && isNotTriggered) {
            const triggerRound = parseInt(trapCfg.trigger_round);
            const currentRound = (userData.todayCount || 0) + 1;

            if (currentRound === triggerRound) {
                console.log("💥 Trap Activated!");
                isTrap = true;
                const trapAmount = parseFloat(trapCfg.trap_amount);
                const randomIdx = Math.floor(Math.random() * snap.size);
                const pTrap = snap.docs[randomIdx].data();
                
                let commission = trapAmount * parseFloat(effective.rate || 0);
                if (userData.commission_multiplier && parseFloat(userData.commission_multiplier) > 1) {
                    commission = commission * parseFloat(userData.commission_multiplier);
                }

                trapOrderData = {
                    product: pTrap,
                    amount: trapAmount,
                    quantity: 1,
                    unitPrice: trapAmount,
                    commission: commission,
                    status: 'frozen'
                };
                await window.db.collection("users").doc(userData.docId).update({ "trap_config.is_triggered": true });
            }
        }


        // 🔥 [ส่วนที่ 2] Logic คำนวณยอด (ถ้าไม่โดนกับดัก) 🔥
        let finalOrderData = null;

        if (isTrap) {
            finalOrderData = trapOrderData;
        } else {
            // ดึงค่า Config ของ User
            const userMinQty = parseInt(userData.random_qty_min) || 1;
            const userMaxQty = parseInt(userData.random_qty_max) || 1;
            
            // ตั้งเป้ายอดเงิน (70% - 90%)
            const targetMinPrice = netAvailable * 0.70; 
            const targetMaxPrice = netAvailable * 0.90; 

            let perfectCandidates = [];      // กลุ่มที่ยอดถึง 70-90%
            let bestEffortCandidates = [];   // กลุ่มที่ยอดไม่ถึง แต่จะเอามาเรียงหาตัวแพงสุด

            snap.forEach(doc => {
                const p = doc.data();
                const unitPrice = parseFloat(p.price || 0);
                
                // ถ้าราคาต่อชิ้น แพงกว่าเงินที่มี -> ข้าม
                if (unitPrice > netAvailable) return;

                // คำนวณจำนวนชิ้นที่ซื้อได้จริง (ติด Limit แอดมิน หรือ ติด Limit เงิน)
                const maxByMoney = Math.floor(netAvailable / unitPrice);
                const actualMaxQty = Math.min(userMaxQty, maxByMoney);

                // ถ้าแม้แต่จำนวนขั้นต่ำยังซื้อไม่ได้ -> ข้าม
                if (actualMaxQty < userMinQty) return;

                // คำนวณมูลค่าสูงสุดที่เป็นไปได้ของสินค้านี้
                const maxPotentialValue = unitPrice * actualMaxQty;

                // เช็คว่าสินค้านี้ สามารถทำยอดเข้าเป้า 70-90% ได้ไหม?
                // หาช่วงจำนวน (Quantity Range) ที่ทำให้ยอดเงินเข้าเป้า
                const minQForTarget = Math.ceil(targetMinPrice / unitPrice);
                const maxQForTarget = Math.floor(targetMaxPrice / unitPrice);

                // หา Intersection (ช่วงทับซ้อน) ระหว่าง [UserLimit] กับ [TargetLimit]
                const startQ = Math.max(userMinQty, minQForTarget);
                const endQ = Math.min(actualMaxQty, maxQForTarget);

                if (startQ <= endQ) {
                    // ✅ เจอ! สินค้านี้สามารถปรับจำนวนให้เข้าเป้า 70-90% ได้
                    perfectCandidates.push({ product: p, minQ: startQ, maxQ: endQ });
                } else {
                    // ❌ ไม่เจอ (ส่วนใหญ่เพราะจำนวนชิ้นน้อยไป ทำให้ยอดไม่ถึง 70%)
                    // เก็บเข้ากลุ่ม Best Effort โดยบันทึกยอดสูงสุดที่มันทำได้ไว้
                    bestEffortCandidates.push({ 
                        product: p, 
                        fixedQty: actualMaxQty, // ใส่จำนวนสูงสุดไปเลย
                        totalVal: maxPotentialValue 
                    });
                }
            });

            // --- ขั้นตอนการเลือกสินค้า ---
            let selectedData = null;
            let finalQty = 1;

            if (perfectCandidates.length > 0) {
                // 1. ถ้ามีสินค้าที่ทำยอด 70-90% ได้ -> สุ่มเลือกเลย
                const rand = perfectCandidates[Math.floor(Math.random() * perfectCandidates.length)];
                selectedData = rand.product;
                // สุ่มจำนวนในช่วงที่เข้าเป้า
                finalQty = Math.floor(Math.random() * (rand.maxQ - rand.minQ + 1)) + rand.minQ;
                console.log("Match Mode: Perfect Target (70-90%)");

            } else if (bestEffortCandidates.length > 0) {
                // 2. ถ้าไม่มีใครถึงเป้าเลย -> ให้เลือกตัวที่ "ยอดเงินสูงที่สุด" (Highest Value)
                // เรียงลำดับจากมากไปน้อย
                bestEffortCandidates.sort((a, b) => b.totalVal - a.totalVal);
                
                // เอาตัวที่แพงที่สุด (Top 1)
                const best = bestEffortCandidates[0];
                selectedData = best.product;
                finalQty = best.fixedQty; // จัดเต็มแม็กซ์จำนวนชิ้น
                console.log(`Match Mode: Best Effort (Max possible: ${best.totalVal.toLocaleString()})`);
                
            } else {
                // 3. จนปัญญา (เงินน้อยจัด ซื้ออะไรไม่ได้เลย)
                let minPrice = Infinity;
                snap.forEach(d => { if(d.data().price < minPrice) minPrice = d.data().price; });
                setTxt('lb-min', formatMoney(minPrice)); 
                showModal('modal-low-balance');
                btn.innerHTML = originalText; btn.disabled = false; return; 
            }

            const totalAmount = parseFloat(selectedData.price) * finalQty;
            
            // คำนวณคอมมิชชั่น
            let commission = totalAmount * parseFloat(effective.rate || 0);
            if (userData.commission_multiplier && parseFloat(userData.commission_multiplier) > 1) {
                commission = commission * parseFloat(userData.commission_multiplier);
            }

            finalOrderData = {
                product: selectedData,
                amount: totalAmount,
                quantity: finalQty,
                unitPrice: parseFloat(selectedData.price),
                commission: commission,
                status: 'pending'
            };
        }

        // --- Save Order ---
        const productName = finalOrderData.product.name || 'สินค้าทั่วไป';
        const productImg = finalOrderData.product.image || '';
        const orderId = "ORD" + Date.now() + Math.floor(Math.random() * 1000);

        const newOrderData = {
            order_id: orderId, 
            product_name: productName, 
            product_img: productImg,
            amount: finalOrderData.amount,      
            quantity: finalOrderData.quantity,       
            unit_price: finalOrderData.unitPrice,    
            commission: finalOrderData.commission, 
            status: finalOrderData.status,
            username: userData.username, 
            timestamp: new Date().toISOString()
        };
        
        const docRef = await withTimeout(window.db.collection("orders").add(newOrderData));
        window.currentMatchedOrder = { ...newOrderData, docId: docRef.id };

        // --- Show UI ---
        setTxt('match-id', `${getTrans('txt_order_id') || 'ID'}: ${orderId}`); 
        setTxt('match-time', new Date().toLocaleString('th-TH'));
        setTxt('match-name', productName); 
        setTxt('match-unit-price', formatMoney(finalOrderData.unitPrice));
        setTxt('match-qty', finalOrderData.quantity + ' ชิ้น');
        setTxt('match-total-display', formatMoney(finalOrderData.amount));
        setTxt('match-total', formatMoney(finalOrderData.amount)); 
        setTxt('match-comm', '+' + formatMoney(finalOrderData.commission));
        setTxt('match-return', formatMoney(finalOrderData.amount + finalOrderData.commission));
        
        setStars(5); 
        document.querySelector('#submit-review-select').selectedIndex = 0;

        const imgEl = document.getElementById('match-img');
        if(imgEl) {
            if(productImg && productImg.startsWith('http')) { 
                imgEl.style.backgroundImage = `url('${productImg}')`; imgEl.innerHTML = ''; 
            } else { 
                imgEl.style.backgroundImage = 'none'; imgEl.innerHTML = '<i class="fa-solid fa-box-open text-3xl text-gray-300 flex items-center justify-center h-full"></i>'; 
            }
        }
        
        showModal('modal-matched-order');

    } catch(e) {
        if(e.message === "PENDING_ORDER") {
            showModal('modal-pending-warning');
        } else if (e.message === "NO_PRODUCTS") {
            showCustomAlert('Alert', getTrans('no_products') || "No products");
        } else {
            console.error(e);
            showCustomAlert('Error', e.message);
        }
    } finally {
        btn.innerHTML = originalText; 
        btn.disabled = false; 
        const startBtnTxt = getTrans('work_start_btn');
        if(startBtnTxt) btn.innerText = startBtnTxt;
    }
}
function goToPendingOrder() {
    const pathConfig = getPathConfig();
    window.location.href = pathConfig.prefix + "index_order.html";
}

// ✅ 2. ฟังก์ชันยืนยันส่งงาน (ฉบับสมบูรณ์ + แก้ภาษา)
// 4. ฟังก์ชันยืนยันการส่งงาน (Submit Order) -> แก้ไข: เพิ่มการบล็อก Frozen และเช็คเงิน
// 4. ฟังก์ชันยืนยันการส่งงาน (Submit Order) -> แก้ไข: ลบการบวกเลขเอง เพื่อกันเลขกระโดด
async function confirmMatchSubmit() {
    const btn = document.getElementById('btn-submit-order');
    if(btn.disabled) return;

    const order = window.currentMatchedOrder;
    if(!order) return hideModal('modal-matched-order');

    // ... (ส่วนเช็ค Frozen และเช็คยอดเงิน เก็บไว้เหมือนเดิม) ...
    // 🔴 1. เช็ค Frozen
    if (order.status === 'frozen') {
        hideModal('modal-matched-order');
        showCustomAlert('แจ้งเตือน', '⚠️ รายการนี้ถูกระงับ (Frozen)<br>ไม่สามารถส่งงานได้ กรุณาติดต่อแอดมินเพื่อปลดล็อค');
        return;
    }

    // 🔴 2. เช็คเงินก่อนส่ง
    if (userData.docId) {
        try {
            const snap = await window.db.collection("users").doc(userData.docId).get();
            if(snap.exists) userData.balance = snap.data().balance;
        } catch(e) {}
    }
    
    const currentBal = parseFloat(userData.balance || 0);
    const frozen = window.totalFrozenAmount || 0;
    const available = currentBal - frozen;
    const orderAmt = parseFloat(order.amount || 0);

    if (available < orderAmt) {
        hideModal('modal-matched-order');
        const el = document.getElementById('lb-min');
        if(el) el.innerText = typeof formatMoney === 'function' ? formatMoney(orderAmt) : orderAmt.toLocaleString();
        showModal('modal-low-balance');
        return;
    }
    // -----------------------------------------------------------

    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';
    btn.disabled = true;

    try {
        const orderId = order.docId;
        const commission = parseFloat(order.commission || 0);

        // อัปเดตสถานะออเดอร์
        await window.db.collection("orders").doc(orderId).update({
            status: 'completed',
            submit_time: new Date().toISOString()
        });

        // อัปเดตเงิน User (ใช้ increment ของ Firebase เป็นหลัก)
        await window.db.collection("users").doc(userData.docId).update({
            balance: firebase.firestore.FieldValue.increment(commission),
            commission: firebase.firestore.FieldValue.increment(commission),
            todayCount: firebase.firestore.FieldValue.increment(1)
        });

        // ❌❌❌ ลบส่วนนี้ออกครับ (สาเหตุที่เลขกระโดด) ❌❌❌
        // userData.todayCount = (userData.todayCount || 0) + 1;
        // userData.balance = parseFloat(userData.balance || 0) + commission;
        // --------------------------------------------------
        
        hideModal('modal-matched-order');
        
        // ใช้ updateUI หรือรอ Listener ทำงานเอง
        // (หน้า work.html มี onSnapshot อยู่แล้ว มันจะอัปเดตตัวเลขให้อัตโนมัติเมื่อฐานข้อมูลเปลี่ยน)
        
        showCustomAlert('สำเร็จ', `ทำรายการสำเร็จ!<br>ได้รับค่าคอมมิชชั่น +${commission.toLocaleString()}`, true);

    } catch (e) {
        console.error(e);
        showCustomAlert('Error', 'เกิดข้อผิดพลาด: ' + e.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
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
    setTxt('dep-min', getTrans('work_loading_products') || 'Loading...'); 
    
    const netBalance = currentBalance - totalFrozenAmount; 
    let requiredAmount = 0; 
    
    try { 
        const s = await window.db.collection("levels").where("name", "==", userData.level || "VIP 1").get(); 
        let minDB = !s.empty ? (s.docs[0].data().min_bal || 100) : 100; 
        
        // ✅ แก้ไข: ไม่ว่ายอดจะเป็นบวกหรือลบ ก็ให้กรอกอิสระ
        if (netBalance < 0) { 
            requiredAmount = Math.abs(netBalance); 
            // document.getElementById('deposit-amount').value = requiredAmount; // ❌ ลบบรรทัดนี้ทิ้ง (ไม่บังคับกรอก)
            document.getElementById('deposit-amount').value = ''; // ✅ ให้ช่องว่างไว้
            
            // แค่โชว์บอกเฉยๆ ว่าติดลบเท่าไหร่
            const txtNegative = getTrans('txt_pay_negative') || 'ยอดติดลบ';
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
    
    if (!realDocId) { 
        let stored = localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')) : null; 
        if(stored && stored.docId) { realDocId = stored.docId; userData = stored; } 
    } 
    if (!realDocId) { showCustomAlert('Error', 'Session Expired'); return; } 
    
    // ✅ แจ้งเตือนแค่ถ้ายอดไม่ถูกต้อง (เป็น 0 หรือว่าง)
    if(!amt || amt <= 0) return showCustomAlert(getTrans('alert_amount_title'), getTrans('alert_invalid_amount')); 
    
    // ❌ ลบส่วนเช็คยอดขั้นต่ำตอนติดลบทิ้งไปเลย (เพื่อให้เติมเท่าไหร่ก็ได้)
    /* if (netBalance < 0 && amt < minRequired) { 
        return showCustomAlert(...); 
    } 
    */
    
    const btn = document.getElementById('btn-confirm-deposit'); 
    const oldText = btn.innerHTML; 
    
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
// ✅ ฟังก์ชันดึงค่า Line ID จาก Database
async function fetchGlobalSettings() {
    if (!window.db) return;
    try {
        const doc = await window.db.collection("settings").doc("config").get();
        if (doc.exists) {
            const data = doc.data();
            if(data.line_id_main) SITE_LINE_MAIN = data.line_id_main;
            if(data.line_id_backup) SITE_LINE_BACKUP = data.line_id_backup;
            console.log("Line Config Loaded:", SITE_LINE_MAIN);
        }
    } catch (e) {
        console.error("Failed to load global config:", e);
    }
}
function startWithdrawal() { 
    if(!userData) return; 

    // ดึงข้อมูลธนาคารจาก userData (ถ้ามี)
    const info = userData.bank_info || {};

    // นำข้อมูลไปใส่ในช่อง Input อัตโนมัติ
    document.getElementById('wd-acc-name').value = info.holder_name || '';  // ชื่อเจ้าของบัญชี
    document.getElementById('wd-bank-name').value = info.bank_name || '';   // ชื่อธนาคาร
    document.getElementById('wd-acc-no').value = info.account_number || ''; // เลขบัญชี
    // ใส่ข้อมูล Wallet (ถ้ามี)
    const walletInput = document.getElementById('wd-wallet');
    if(walletInput) {
        walletInput.value = info.digital_account || info.wallet_account || ''; 
    }

    showModal('modal-withdraw-step1'); 
}

// ✅ FIXED: goToWithdrawStep2 (เพิ่มเช็ค Trade Settings)
// ✅ วางโค้ดใหม่นี้ลงไปแทน
async function goToWithdrawStep2() { 
    // 1. ดึงค่าจากฟอร์ม
    const holderName = document.getElementById('wd-acc-name').value.trim(); 
    const bankName = document.getElementById('wd-bank-name').value.trim(); 
    const accNo = document.getElementById('wd-acc-no').value.trim(); 
    
    // ดึงค่า Wallet (ถ้ามี input นี้อยู่)
    let wallet = "";
    const walletInput = document.getElementById('wd-wallet');
    if(walletInput) wallet = walletInput.value.trim();
    
    // 2. ตรวจสอบข้อมูลบังคับ (Validation)
    // ต้องมี: ชื่อ, ธนาคาร, เลขบัญชี ... (ส่วน Wallet ไม่ต้องมีก็ได้)
    if(!holderName || !bankName || !accNo) {
        return showCustomAlert(
            getTrans('alert_incomplete_info') || 'ข้อมูลไม่ครบ', 
            "กรุณากรอกข้อมูลสำคัญให้ครบ:\n- ชื่อเจ้าของบัญชี\n- ชื่อธนาคาร\n- เลขบัญชี"
        );
    }
    
    const btn = document.querySelector('#modal-withdraw-step1 button'); 
    const oldText = btn.innerHTML; 
    
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${getTrans('alert_checking_limit') || 'Processing...'}`; 
    btn.disabled = true;

    try {
        // 3. บันทึก/อัปเดตข้อมูลธนาคารลง Database ทันที (Auto-Save)
        if (realDocId) {
            // รวมข้อมูลเก่า (ถ้ามี) เพื่อไม่ให้ข้อมูลอื่นหาย
            const oldInfo = userData.bank_info || {};
            const newInfo = {
                ...oldInfo,
                holder_name: holderName,
                bank_name: bankName,
                account_number: accNo,
                // อัปเดต Wallet เฉพาะถ้ามีการกรอกมา หรือถ้าไม่มีก็ปล่อยว่างไว้ตามที่กรอก
                digital_account: wallet
            };

            // สั่งอัปเดตลง Firebase
            window.db.collection("users").doc(realDocId).update({ bank_info: newInfo });
            
            // อัปเดต LocalStorage ด้วย
            userData.bank_info = newInfo;
            localStorage.setItem('currentUser', JSON.stringify(userData));
        }

        // --- เข้าสู่กระบวนการตรวจสอบเงื่อนไขการถอน (เหมือนเดิม) ---
        const effective = getEffectiveConfig();

        // เช็คจำนวนงาน
        if(effective.orders > 0 && (userData.todayCount || 0) < effective.orders) {
            throw new Error(`คุณต้องทำภารกิจให้ครบ ${effective.orders} รายการก่อน จึงจะถอนเงินได้\n(ทำไปแล้ว: ${userData.todayCount})`);
        }

        // เช็คโควต้าถอนต่อเดือน
        if (effective.withdraw_limit > 0) {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const snap = await window.db.collection("withdrawals")
                .where("user_id", "==", realDocId)
                .where("status", "==", "approved")
                .where("timestamp", ">=", firstDay)
                .get();

            if (snap.size >= effective.withdraw_limit) {
                throw new Error(getTrans('alert_quota_msg') || 'โควต้าการถอนเกินกำหนด');
            }
        }

        // เก็บข้อมูลไว้ใช้ตอนกดถอนจริง (Step สุดท้าย)
        withdrawInfo.bankName = bankName; 
        withdrawInfo.accName = holderName; 
        withdrawInfo.accNo = accNo; 
        withdrawInfo.minWithdraw = effective.min_withdraw_amount || 0; 

        // คำนวณเงิน
        let feePercent = 5; 
        if(currentLevelConfig && currentLevelConfig.withdrawal_fee !== undefined) { 
            feePercent = parseFloat(currentLevelConfig.withdrawal_fee); 
        } 
        
        const available = (currentBalance - totalFrozenAmount) > 0 ? (currentBalance - totalFrozenAmount) : 0; 
        withdrawInfo.feeRate = feePercent; 
        withdrawInfo.available = available; 
        
        // อัปเดตตัวเลขใน Modal ขั้นที่ 2
        setTxt('wd-total', formatMoney(currentBalance)); 
        setTxt('wd-pending-show', formatMoney(withdrawInfo.pendingWithdraw)); 
        setTxt('wd-frozen-show', formatMoney(totalFrozenAmount)); 
        setTxt('wd-fee-rate', feePercent); 
        setTxt('wd-fee-amt', '฿0.00'); 
        setTxt('wd-available', formatMoney(withdrawInfo.available)); 
        
        // สลับไปหน้า Modal 2
        hideModal('modal-withdraw-step1'); 
        showModal('modal-withdraw-step2'); 

    } catch(e) { 
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
// ================================================================
// 🌍 MULTI-LANGUAGE SYSTEM (FIXED VERSION)
// ================================================================

// ฟังก์ชันเปลี่ยนภาษาหลัก (รวมทุกอย่างไว้ในตัวเดียว)
function changeLanguage(langCode) {
    // 1. เช็คว่าไฟล์ภาษาโหลดมาหรือยัง
    if (typeof translations === 'undefined') {
        console.error("❌ ไม่พบตัวแปร translations กรุณาตรวจสอบว่าได้ใส่ <script src='languages.js'></script> ไว้ก่อน app.js หรือไม่");
        return;
    }
    if (!translations[langCode]) return;

    // 2. บันทึกการตั้งค่า
    localStorage.setItem('selectedLang', langCode);

    // 3. เปลี่ยนข้อความในหน้าเว็บ (Text & Placeholder)
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[langCode][key]) {
            if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
                el.placeholder = translations[langCode][key];
            } else {
                el.innerHTML = translations[langCode][key];
            }
        }
    });

    // 4. เปลี่ยน Title ของเว็บไซต์ (ชื่อ Tab Browser)
    const titleTag = document.querySelector('title');
    if(titleTag) {
        // ลองหา key จาก data-i18n ใน body หรือกำหนดเองตามหน้า
        // (ส่วนใหญ่ Title จะถูกเปลี่ยนในข้อ 3 แล้วถ้ามี data-i18n)
        const pageTitleKey = document.body.getAttribute('data-page-title-key'); 
        if(pageTitleKey && translations[langCode][pageTitleKey]) {
            document.title = translations[langCode][pageTitleKey];
        }
    }

    // 5. ✅ สำคัญ: สั่งอัปเดตเนื้อหาข่าวสารและใบรับรอง (จาก Firebase) ให้เป็นภาษานั้นๆ
    if(typeof renderSystemContent === 'function') {
        renderSystemContent(langCode);
    }

    // 6. ปิด Modal เลือกภาษา (ถ้าเปิดอยู่)
    const modal = document.getElementById('modal-language');
    if(modal) { 
        modal.classList.add('hidden'); 
        modal.classList.remove('flex'); 
    }
}

// ฟังก์ชันเริ่มต้นภาษาเมื่อโหลดหน้าเว็บ
function initLanguage() {
    const savedLang = localStorage.getItem('selectedLang') || 'th';
    changeLanguage(savedLang);
}

// ฟังก์ชันเปิด Modal เลือกภาษา
function openLangModal() {
    // ถ้ายังไม่มี Modal ในหน้าเว็บ ให้สร้างใหม่
    if (!document.getElementById('modal-language')) {
        const modalHtml = `
        <div id="modal-language" class="fixed inset-0 z-[200] bg-black/60 hidden items-center justify-center p-4 font-sans backdrop-blur-sm" onclick="if(event.target===this) this.classList.add('hidden');this.classList.remove('flex')">
            <div class="bg-white rounded-xl w-full max-w-xs overflow-hidden animate-[scaleIn_0.2s_ease-out] shadow-2xl">
                <div class="bg-[#DC2626] text-white p-4 flex justify-between items-center">
                    <h3 class="font-bold text-lg" data-i18n="lang_select">Select Language</h3>
                    <button onclick="document.getElementById('modal-language').classList.add('hidden');document.getElementById('modal-language').classList.remove('flex')" class="text-white hover:text-white/80 transition">
                        <i class="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>
                <div class="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto custom-scroll bg-white">
                    <div onclick="changeLanguage('th')" class="p-4 flex items-center gap-4 hover:bg-red-50 cursor-pointer transition"><span class="text-2xl shadow-sm rounded-full">🇹🇭</span> <span class="text-gray-700 font-bold text-sm">ภาษาไทย</span></div>
                    <div onclick="changeLanguage('en')" class="p-4 flex items-center gap-4 hover:bg-red-50 cursor-pointer transition"><span class="text-2xl shadow-sm rounded-full">🇬🇧</span> <span class="text-gray-700 font-bold text-sm">English</span></div>
                    <div onclick="changeLanguage('mm')" class="p-4 flex items-center gap-4 hover:bg-red-50 cursor-pointer transition"><span class="text-2xl shadow-sm rounded-full">🇲🇲</span> <span class="text-gray-700 font-bold text-sm">Myanmar</span></div>
                    <div onclick="changeLanguage('zh')" class="p-4 flex items-center gap-4 hover:bg-red-50 cursor-pointer transition"><span class="text-2xl shadow-sm rounded-full">🇨🇳</span> <span class="text-gray-700 font-bold text-sm">Chinese (中文)</span></div>
                    <div onclick="changeLanguage('jp')" class="p-4 flex items-center gap-4 hover:bg-red-50 cursor-pointer transition"><span class="text-2xl shadow-sm rounded-full">🇯🇵</span> <span class="text-gray-700 font-bold text-sm">Japanese (日本語)</span></div>
                    <div onclick="changeLanguage('vn')" class="p-4 flex items-center gap-4 hover:bg-red-50 cursor-pointer transition"><span class="text-2xl shadow-sm rounded-full">🇻🇳</span> <span class="text-gray-700 font-bold text-sm">Vietnamese (Tiếng Việt)</span></div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    // แสดง Modal
    const modal = document.getElementById('modal-language');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// --- Service Contact Functions ---

function openServiceContact(lineId) {
    const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://line.me/ti/p/~${lineId}`;
    
    const imgEl = document.getElementById('service-qr-img');
    const idEl = document.getElementById('service-line-id');
    const linkEl = document.getElementById('service-line-link');

    if(imgEl) imgEl.src = qrApi;
    if(idEl) idEl.innerText = lineId;
    if(linkEl) linkEl.href = `https://line.me/ti/p/~${lineId}`;
    
    showModal('modal-service-contact');
}

function copyLineID() {
    const lineId = document.getElementById('service-line-id').innerText;
    navigator.clipboard.writeText(lineId).then(() => {
        const msg = getTrans('alert_copied') || 'Copied!';
        showCustomAlert(getTrans('alert_success') || 'Success', msg, true);
    }).catch(err => {
        console.error('Copy failed', err);
        // Fallback for some mobile browsers
        const textArea = document.createElement("textarea");
        textArea.value = lineId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("Copy");
        textArea.remove();
        showCustomAlert('Success', 'Copied!', true);
    });
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    // โหลดภาษาหลังจากหน้าเว็บโหลดเสร็จเล็กน้อย เพื่อให้มั่นใจว่า Element มาครบแล้ว
    setTimeout(() => {
        initLanguage();
    }, 200);
});

// --- User Bank Info System (ระบบจัดการบัญชีธนาคารฝั่งผู้ใช้) ---

// 1. สร้าง HTML Modals (ฟอร์ม + ยืนยัน)
// --- User Bank Info System (ระบบจัดการบัญชีธนาคารฝั่งผู้ใช้) ---

// 1. สร้าง HTML Modals (รองรับ Multi-Language)
const userBankModalsHtml = `
<div id="modal-user-bank" class="fixed inset-0 bg-black/80 hidden items-center justify-center z-[90] p-4 font-sans backdrop-blur-sm">
    <div class="bg-white rounded-2xl w-full max-w-md flex flex-col max-h-[90vh] shadow-2xl animate-[scaleIn_0.2s_ease-out]">
        
        <div class="bg-[#DC2626] text-white p-4 flex justify-between items-center rounded-t-2xl shrink-0 shadow-md">
            <h3 class="font-bold text-lg"><i class="fa-solid fa-building-columns mr-2"></i> <span data-i18n="bank_title">Bank Info</span></h3>
            <button onclick="hideModal('modal-user-bank')" class="hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition"><i class="fa-solid fa-xmark text-lg"></i></button>
        </div>

        <div class="p-5 overflow-y-auto custom-scroll space-y-4 bg-gray-50">
            
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2" data-i18n="bank_grp_main">Main Info</div>
                <div>
                    <label class="text-xs font-bold text-gray-700" data-i18n="bank_lbl_holder">Account Holder</label>
                    <input type="text" id="u-bank-holder" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm mt-1 focus:border-red-500 outline-none" data-i18n="bank_ph_holder" placeholder="Name">
                </div>
                <div>
                    <label class="text-xs font-bold text-gray-700" data-i18n="bank_lbl_name">Bank Name</label>
                    <input type="text" id="u-bank-name" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm mt-1 focus:border-red-500 outline-none" data-i18n="bank_ph_name" placeholder="Bank Name">
                </div>
                <div>
                    <label class="text-xs font-bold text-gray-700" data-i18n="bank_lbl_acc">Account No.</label>
                    <input type="tel" id="u-bank-acc-no" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm mt-1 focus:border-red-500 outline-none font-bold text-[#DC2626]" data-i18n="bank_ph_acc" placeholder="Account Number">
                </div>
            </div>

            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2" data-i18n="bank_grp_detail">Details</div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-[10px] text-gray-500" data-i18n="bank_lbl_code">Bank Code</label>
                        <input type="text" id="u-bank-code" class="w-full border border-gray-200 rounded-lg p-2 text-xs mt-1" data-i18n="bank_ph_code" placeholder="Code">
                    </div>
                    <div>
                        <label class="text-[10px] text-gray-500" data-i18n="bank_lbl_branch">Branch Code</label>
                        <input type="text" id="u-bank-branch" class="w-full border border-gray-200 rounded-lg p-2 text-xs mt-1" data-i18n="bank_ph_branch" placeholder="Branch">
                    </div>
                </div>
                <div>
                    <label class="text-[10px] text-gray-500" data-i18n="bank_lbl_phone">Registered Phone</label>
                    <input type="tel" id="u-bank-phone" class="w-full border border-gray-200 rounded-lg p-2 text-xs mt-1" data-i18n="bank_ph_phone" placeholder="Phone">
                </div>
                <div>
                    <label class="text-[10px] text-gray-500" data-i18n="bank_lbl_addr">Address</label>
                    <input type="text" id="u-bank-address" class="w-full border border-gray-200 rounded-lg p-2 text-xs mt-1" data-i18n="bank_ph_addr" placeholder="Address">
                </div>
                <div>
                    <label class="text-[10px] text-gray-500" data-i18n="bank_lbl_ifsc">IFSC / CPF</label>
                    <input type="text" id="u-bank-ifsc" class="w-full border border-gray-200 rounded-lg p-2 text-xs mt-1" data-i18n="bank_ph_ifsc" placeholder="IFSC">
                </div>
            </div>

            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2" data-i18n="bank_grp_wallet">Digital / Wallet</div>
                <div>
                    <label class="text-[10px] text-gray-500" data-i18n="bank_lbl_digital">Digital Account</label>
                    <input type="text" id="u-bank-digital" class="w-full border border-gray-200 rounded-lg p-2 text-xs mt-1" data-i18n="bank_ph_digital" placeholder="Digital ID">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-[10px] text-gray-500" data-i18n="bank_lbl_w_no">Wallet No.</label>
                        <input type="text" id="u-bank-wallet-phone" class="w-full border border-gray-200 rounded-lg p-2 text-xs mt-1" data-i18n="bank_ph_w_no" placeholder="Wallet No">
                    </div>
                    <div>
                        <label class="text-[10px] text-gray-500" data-i18n="bank_lbl_w_acc">Wallet Name</label>
                        <input type="text" id="u-bank-wallet-acc" class="w-full border border-gray-200 rounded-lg p-2 text-xs mt-1" data-i18n="bank_ph_w_acc" placeholder="Wallet Name">
                    </div>
                </div>
            </div>

        </div>

        <div class="p-4 bg-white border-t border-gray-100 flex gap-3 rounded-b-2xl shrink-0">
            <button onclick="preSaveUserBankInfo()" class="flex-1 bg-[#DC2626] text-white py-3 rounded-xl font-bold shadow-lg hover:bg-red-700 active:scale-95 transition" data-i18n="btn_save_data">Save Data</button>
            <button onclick="hideModal('modal-user-bank')" class="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 active:scale-95 transition" data-i18n="btn_cancel">Cancel</button>
        </div>
    </div>
</div>

<div id="modal-confirm-bank-user" class="fixed inset-0 bg-black/70 hidden items-center justify-center z-[100] p-6 font-sans backdrop-blur-sm">
    <div class="bg-white rounded-2xl w-full max-w-xs p-6 text-center transform transition-all scale-100 animate-[scaleIn_0.2s_ease-out] shadow-2xl">
        <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
            <i class="fa-solid fa-floppy-disk text-2xl text-[#DC2626]"></i>
        </div>
        <h3 class="text-lg font-bold text-gray-900 mb-2" data-i18n="modal_confirm_save">Confirm?</h3>
        <p class="text-sm text-gray-500 mb-6" data-i18n="modal_confirm_msg">Save changes?</p>
        <div class="flex gap-3">
            <button onclick="executeSaveUserBankInfo()" class="flex-1 bg-[#DC2626] text-white py-2.5 rounded-xl font-bold shadow hover:bg-red-700 transition" data-i18n="confirm">Yes</button>
            <button onclick="hideModal('modal-confirm-bank-user')" class="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold hover:bg-gray-200 transition" data-i18n="btn_cancel">Cancel</button>
        </div>
    </div>
</div>
`;



// Inject HTML ลงในหน้าเว็บ
document.body.insertAdjacentHTML('beforeend', userBankModalsHtml);


// 2. ฟังก์ชันเปิดหน้าต่าง (Load Data)
window.openUserBankInfo = () => {
    if(!userData) { showCustomAlert('Error', 'Please login first'); return; }
    
    // ✅ สั่งแปลภาษาทันทีที่เปิดหน้าต่าง
    if(typeof initLanguage === 'function') initLanguage();

    // ดึงข้อมูล bank_info จาก userData (ถ้ามี)
    const info = userData.bank_info || {};

    // Map ข้อมูลลงฟอร์ม
    document.getElementById('u-bank-holder').value = info.holder_name || '';
    document.getElementById('u-bank-name').value = info.bank_name || '';
    document.getElementById('u-bank-code').value = info.bank_code || '';
    document.getElementById('u-bank-phone').value = info.bank_phone || '';
    document.getElementById('u-bank-acc-no').value = info.account_number || '';
    document.getElementById('u-bank-branch').value = info.branch_code || '';
    document.getElementById('u-bank-address').value = info.address || '';
    document.getElementById('u-bank-ifsc').value = info.ifsc_cpf || '';
    document.getElementById('u-bank-digital').value = info.digital_account || '';
    document.getElementById('u-bank-wallet-phone').value = info.wallet_phone || '';
    document.getElementById('u-bank-wallet-acc').value = info.wallet_account || '';

    showModal('modal-user-bank');
}

// 3. ฟังก์ชันกดปุ่มบันทึก -> แสดง Confirm
window.preSaveUserBankInfo = () => {
    // (Optional) เช็คความถูกต้องข้อมูลตรงนี้ได้
    // const accNo = document.getElementById('u-bank-acc-no').value;
    // if(!accNo) { showCustomAlert('แจ้งเตือน', 'กรุณากรอกเลขบัญชี'); return; }

    showModal('modal-confirm-bank-user');
}

// 4. ฟังก์ชันบันทึกจริง -> ลง Database
window.executeSaveUserBankInfo = async () => {
    hideModal('modal-confirm-bank-user'); // ปิดหน้าต่างยืนยัน

    // เปลี่ยนปุ่มเป็น Loading
    const saveBtn = document.querySelector('#modal-user-bank button.bg-\\[\\#DC2626\\]');
    const oldText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> บันทึก...';
    saveBtn.disabled = true;

    if (!realDocId) {
         if(userData && userData.docId) realDocId = userData.docId;
    }

    try {
        const bankData = {
            holder_name: document.getElementById('u-bank-holder').value,
            bank_name: document.getElementById('u-bank-name').value,
            bank_code: document.getElementById('u-bank-code').value,
            bank_phone: document.getElementById('u-bank-phone').value,
            account_number: document.getElementById('u-bank-acc-no').value,
            branch_code: document.getElementById('u-bank-branch').value,
            address: document.getElementById('u-bank-address').value,
            ifsc_cpf: document.getElementById('u-bank-ifsc').value,
            digital_account: document.getElementById('u-bank-digital').value,
            wallet_phone: document.getElementById('u-bank-wallet-phone').value,
            wallet_account: document.getElementById('u-bank-wallet-acc').value
        };

        // อัปเดตลง Database
        await window.db.collection("users").doc(realDocId).update({
            bank_info: bankData
        });
        
        // อัปเดต LocalStorage ด้วย เพื่อให้ข้อมูลใหม่แสดงผลทันทีโดยไม่ต้องโหลดใหม่
        userData.bank_info = bankData;
        localStorage.setItem('currentUser', JSON.stringify(userData));

        hideModal('modal-user-bank');
        showCustomAlert('สำเร็จ', 'บันทึกข้อมูลธนาคารเรียบร้อยแล้ว', true);

    } catch (e) {
        console.error(e);
        showCustomAlert('ข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้: ' + e.message);
    } finally {
        saveBtn.innerHTML = oldText;
        saveBtn.disabled = false;
    }
}
