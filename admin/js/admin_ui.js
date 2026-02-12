function renderAdminUI(activeTop, activeSide) {
    // ดึงชื่อ Admin จาก LocalStorage (ถ้าไม่มีให้แสดง Guest)
    const adminName = localStorage.getItem('admin_name') || 'Admin';
    const adminRole = localStorage.getItem('admin_role') || 'staff';

    const headerHTML = `
    <header class="app-header relative z-50">
        <div class="flex items-center h-full justify-between px-0">
            <div class="flex items-center h-full">
                <div class="logo-box">
                    ระบบ<span style="font-size: 10px; position: relative; top: -5px; margin-left: 2px;">หลังบ้าน</span>
                </div>
                <button class="h-full px-4 text-white hover:bg-[#367fa9] transition"><i class="fa-solid fa-bars"></i></button>
                <div class="hidden md:flex h-full">
                    <a href="admin_dashboard.html" class="nav-link ${activeTop === 'home' ? 'active' : ''}">หน้าแรก</a>
                    <a href="admin_members.html" class="nav-link ${activeTop === 'role' ? 'active' : ''}"><i class="fa-solid fa-user mr-2"></i> บทบาท</a>
                    <a href="admin_orders.html" class="nav-link ${activeTop === 'trading' ? 'active' : ''}"><i class="fa-solid fa-scale-balanced mr-2"></i> ซื้อขาย</a>
                    <a href="admin_help.html" class="nav-link ${activeTop === 'help' ? 'active' : ''}"><i class="fa-regular fa-flag mr-2"></i> ศูนย์ช่วยเหลือ</a>
                    <a href="admin_system.html" class="nav-link ${activeTop === 'system' ? 'active' : ''}">การจัดการระบบ</a>
                    <a href="admin_mall.html" class="nav-link ${activeTop === 'mall' ? 'active' : ''}">ห้างสรรพสินค้า</a>
                </div>
            </div>

            <div class="flex items-center h-full pr-4 gap-3 text-white text-xs">
                <span id="clock-target" class="hidden xl:block text-gray-200">Loading...</span>
                
                <a href="admin_recharge.html" class="flex items-center bg-[#1e282c] px-2 py-1.5 rounded border border-white/20 hover:border-white/50 cursor-pointer">
                    <span>เติมเงิน</span>
                    <span id="badge-deposit" class="ml-2 bg-[#f39c12] px-1.5 rounded text-[10px] font-bold">0</span>
                </a>

                <a href="admin_withdrawal.html" class="flex items-center bg-[#1e282c] px-2 py-1.5 rounded border border-white/20 hover:border-white/50 cursor-pointer">
                    <span>การถอนเงิน</span>
                    <span id="badge-withdraw" class="ml-2 bg-[#dd4b39] px-1.5 rounded text-[10px] font-bold">0</span>
                </a>

                <button onclick="window.location.reload()" class="h-8 w-8 hover:bg-white/10 rounded-full transition" title="รีเฟรช"><i class="fa-solid fa-rotate"></i></button>
                
                <div class="relative group h-full flex items-center">
                    <button onclick="toggleProfileMenu()" class="flex items-center gap-2 cursor-pointer hover:bg-white/10 px-3 py-1 rounded transition h-8">
                        <i class="fa-regular fa-user"></i> 
                        <span class="font-bold">${adminName}</span> 
                        <i class="fa-solid fa-chevron-down text-[10px]"></i>
                    </button>
                    
                    <div id="profile-dropdown" class="hidden absolute top-10 right-0 w-48 bg-white text-gray-800 rounded shadow-xl border border-gray-200 overflow-hidden text-sm">
                        <div class="px-4 py-3 border-b bg-gray-50">
                            <p class="font-bold truncate text-gray-700">${adminName}</p>
                            <p class="text-xs text-gray-500 capitalize">${adminRole}</p>
                        </div>
                        <a href="#" onclick="openInfoModal()" class="block px-4 py-2 hover:bg-indigo-50 hover:text-indigo-600 transition"><i class="fa-solid fa-id-card mr-2 w-4"></i> ข้อมูลพื้นฐาน</a>
                        <a href="#" onclick="openSecurityModal()" class="block px-4 py-2 hover:bg-indigo-50 hover:text-indigo-600 transition"><i class="fa-solid fa-shield-halved mr-2 w-4"></i> ความปลอดภัย</a>
                        <div class="border-t"></div>
                        <a href="#" onclick="logout()" class="block px-4 py-2 text-red-600 hover:bg-red-50 transition"><i class="fa-solid fa-right-from-bracket mr-2 w-4"></i> ออกจากระบบ</a>
                    </div>
                </div>
            </div>
        </div>
    </header>`;

    const sidebarHTML = `
    <aside class="app-sidebar custom-scroll">
        <div class="sidebar-header">เมนูหลัก</div>
        <nav>
            <a href="admin_dashboard.html" class="side-link ${activeSide === 'dashboard' ? 'active' : ''}">
                <i class="fa-solid fa-gauge"></i> <span>หน้าแรก</span>
            </a>

            <div class="group">
                <div onclick="toggleSub('sub-members', this)" class="side-link cursor-pointer justify-between ${['members','levels','groups','rewards'].includes(activeSide) ? 'active' : ''}">
                    <div class="flex items-center"><i class="fa-solid fa-users"></i> <span>การจัดการสมาชิก</span></div>
                    <i class="fa-solid fa-chevron-${['members','levels','groups','rewards'].includes(activeSide) ? 'down' : 'left'} text-[10px] arrow"></i>
                </div>
                <div id="sub-members" class="submenu ${['members','levels','groups','rewards'].includes(activeSide) ? 'open' : ''}">
                    <a href="admin_members.html" class="side-link ${activeSide === 'members' ? 'text-white' : ''}"><i class="fa-regular fa-circle text-[8px] ${activeSide === 'members' ? 'text-[#00a65a]' : ''}"></i> รายชื่อสมาชิก</a>
                    <a href="admin_levels.html" class="side-link ${activeSide === 'levels' ? 'text-white' : ''}"><i class="fa-regular fa-circle text-[8px] ${activeSide === 'levels' ? 'text-[#00a65a]' : ''}"></i> ระดับสมาชิก</a>
                    <a href="admin_overlay_groups.html" class="side-link ${activeSide === 'groups' ? 'text-white' : ''}"><i class="fa-regular fa-circle text-[8px] ${activeSide === 'groups' ? 'text-[#00a65a]' : ''}"></i> กลุ่มโอเวอร์เลย์</a>
                    <a href="admin_invite_rewards.html" class="side-link ${activeSide === 'rewards' ? 'text-white' : ''}"><i class="fa-regular fa-circle text-[8px] ${activeSide === 'rewards' ? 'text-[#00a65a]' : ''}"></i> รางวัลการเชิญ</a>
                </div>
            </div>

            <a href="admin_agent_list.html" class="side-link ${activeSide === 'agents' ? 'active' : ''}">
                <i class="fa-solid fa-link"></i> <span>รายชื่อตัวแทน</span>
            </a>

            <div class="group">
                <div onclick="toggleSub('sub-trans', this)" class="side-link cursor-pointer justify-between ${['recharge','withdraw','control'].includes(activeSide) ? 'active' : ''}">
                    <div class="flex items-center"><i class="fa-solid fa-money-bill-transfer"></i> <span>การจัดการธุรกรรม</span></div>
                    <i class="fa-solid fa-chevron-${['recharge','withdraw','control'].includes(activeSide) ? 'down' : 'left'} text-[10px] arrow"></i>
                </div>
                <div id="sub-trans" class="submenu ${['recharge','withdraw','control'].includes(activeSide) ? 'open' : ''}">
                    <a href="admin_recharge.html" class="side-link ${activeSide === 'recharge' ? 'text-white' : ''}"><i class="fa-regular fa-circle text-[8px] ${activeSide === 'recharge' ? 'text-[#00a65a]' : ''}"></i> การเติมเงิน</a>
                    <a href="admin_withdrawal.html" class="side-link ${activeSide === 'withdraw' ? 'text-white' : ''}"><i class="fa-regular fa-circle text-[8px] ${activeSide === 'withdraw' ? 'text-[#00a65a]' : ''}"></i> การถอนเงิน</a>
                    <a href="admin_transaction_control.html" class="side-link ${activeSide === 'control' ? 'text-white' : ''}"><i class="fa-regular fa-circle text-[8px] ${activeSide === 'control' ? 'text-[#00a65a]' : ''}"></i> ควบคุมธุรกรรม</a>
                </div>
            </div>

            <div class="group">
                <div onclick="toggleSub('sub-prod', this)" class="side-link cursor-pointer justify-between ${['plist','pcat'].includes(activeSide) ? 'active' : ''}">
                    <div class="flex items-center"><i class="fa-solid fa-box-open"></i> <span>การจัดการผลิตภัณฑ์</span></div>
                    <i class="fa-solid fa-chevron-${['plist','pcat'].includes(activeSide) ? 'down' : 'left'} text-[10px] arrow"></i>
                </div>
                <div id="sub-prod" class="submenu ${['plist','pcat'].includes(activeSide) ? 'open' : ''}">
                    <a href="admin_product_list.html" class="side-link ${activeSide === 'plist' ? 'text-white' : ''}"><i class="fa-regular fa-circle text-[8px] ${activeSide === 'plist' ? 'text-[#00a65a]' : ''}"></i> รายการสินค้า</a>
                    <a href="admin_product_category.html" class="side-link ${activeSide === 'pcat' ? 'text-white' : ''}"><i class="fa-regular fa-circle text-[8px] ${activeSide === 'pcat' ? 'text-[#00a65a]' : ''}"></i> หมวดหมู่สินค้า</a>
                </div>
            </div>
            
            <div class="group">
                <div onclick="toggleSub('sub-mall', this)" class="side-link cursor-pointer justify-between ${['mall'].includes(activeSide) ? 'active' : ''}">
                    <div class="flex items-center"><i class="fa-solid fa-store"></i> <span>ห้างสรรพสินค้า</span></div>
                    <i class="fa-solid fa-chevron-${['mall'].includes(activeSide) ? 'down' : 'left'} text-[10px] arrow"></i>
                </div>
                <div id="sub-mall" class="submenu ${['mall'].includes(activeSide) ? 'open' : ''}">
                    <a href="admin_mall.html" class="side-link ${activeSide === 'mall' ? 'text-white' : ''}"><i class="fa-regular fa-circle text-[8px] ${activeSide === 'mall' ? 'text-[#00a65a]' : ''}"></i> การจัดการห้าง</a>
                </div>
            </div>

        </nav>
    </aside>`;

    // --- เพิ่ม HTML ของ Modals (หน้าต่างเด้ง) ---
    // --- ส่วนที่แก้: เพิ่มการดึง Username จาก LocalStorage ---
    const adminUsername = localStorage.getItem('admin_username') || 'admin'; 

    // --- เพิ่ม HTML ของ Modals (หน้าต่างเด้ง) ฉบับอัปเดต ---
    const modalsHTML = `
    <div id="modal-admin-info" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-[60] backdrop-blur-sm font-sans">
        <div class="bg-white rounded-lg shadow-2xl w-full max-w-sm modal-scale-in overflow-hidden">
            <div class="flex justify-between items-center p-4 border-b bg-gray-50">
                <h3 class="font-bold text-gray-700"><i class="fa-solid fa-id-card text-blue-500"></i> ข้อมูลพื้นฐาน</h3>
                <button onclick="closeModal('modal-admin-info')" class="text-gray-400 hover:text-gray-600"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="p-6 space-y-4">
                
                <div>
                    <label class="text-xs font-bold text-gray-500">บัญชีผู้ใช้ (Username)</label>
                    <input type="text" id="view-admin-username" value="${adminUsername}" 
                           class="w-full border border-gray-200 bg-gray-100 text-gray-500 rounded px-3 py-2 mt-1 focus:outline-none cursor-not-allowed font-mono" 
                           readonly>
                    <p class="text-[10px] text-red-400 mt-1">* บัญชีผู้ใช้ไม่สามารถเปลี่ยนแปลงได้</p>
                </div>

                <div>
                    <label class="text-xs font-bold text-gray-700">ชื่อที่แสดง (Display Name)</label>
                    <input type="text" id="edit-admin-name" value="${adminName}" 
                           class="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-gray-800 font-bold">
                </div>

                <div>
                    <label class="text-xs font-bold text-gray-500">บทบาท (Role)</label>
                    <span class="block mt-1 px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full w-fit font-bold uppercase">${adminRole}</span>
                </div>
            </div>
            
            <div class="p-4 border-t bg-gray-50 flex justify-end gap-2">
                <button onclick="closeModal('modal-admin-info')" class="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded text-sm transition">ยกเลิก</button>
                <button onclick="saveAdminInfo()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded text-sm shadow font-bold transition">
                    <i class="fa-solid fa-save mr-1"></i> บันทึกข้อมูล
                </button>
            </div>
        </div>
    </div>

    <div id="modal-admin-security" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-[60] backdrop-blur-sm font-sans">
        <div class="bg-white rounded-lg shadow-2xl w-full max-w-md modal-scale-in overflow-hidden">
            <div class="flex justify-between items-center p-4 border-b bg-gray-50">
                <h3 class="font-bold text-gray-700"><i class="fa-solid fa-key text-yellow-500"></i> เปลี่ยนรหัสผ่าน</h3>
                <button onclick="closeModal('modal-admin-security')" class="text-gray-400 hover:text-gray-600"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="p-6 space-y-4">
                <div>
                    <label class="text-xs font-bold text-gray-600">รหัสผ่านเดิม</label>
                    <input type="password" id="old-pass" placeholder="กรอกรหัสผ่านปัจจุบัน" class="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none transition">
                </div>
                <hr>
                <div>
                    <label class="text-xs font-bold text-gray-600">รหัสผ่านใหม่</label>
                    <input type="password" id="new-pass" placeholder="ตั้งรหัสผ่านใหม่" class="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none transition">
                </div>
                <div>
                    <label class="text-xs font-bold text-gray-600">ยืนยันรหัสผ่านใหม่</label>
                    <input type="password" id="confirm-pass" placeholder="กรอกรหัสผ่านใหม่อีกครั้ง" class="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none transition">
                </div>
            </div>
            <div class="p-4 border-t bg-gray-50 flex justify-end gap-2">
                <button onclick="closeModal('modal-admin-security')" class="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded text-sm transition">ยกเลิก</button>
                <button onclick="saveNewPassword()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded text-sm shadow font-bold transition">ยืนยันเปลี่ยนรหัส</button>
            </div>
        </div>
    </div>
    `;

    // Insert Structure
    document.body.insertAdjacentHTML('afterbegin', headerHTML);
    const container = document.createElement('div');
    container.className = 'app-container';
    container.innerHTML = sidebarHTML + `<main class="app-content custom-scroll" id="main-content"></main>`;
    document.body.appendChild(container);

    // Insert Modals
    document.body.insertAdjacentHTML('beforeend', modalsHTML);

    startClock();
    startBadgeListener();
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        const dropdown = document.getElementById('profile-dropdown');
        const button = e.target.closest('button');
        if (dropdown && !dropdown.classList.contains('hidden') && (!button || !button.getAttribute('onclick')?.includes('toggleProfileMenu'))) {
            dropdown.classList.add('hidden');
        }
    });
}

// --- Functions for Profile Menu ---

function toggleProfileMenu() {
    const menu = document.getElementById('profile-dropdown');
    menu.classList.toggle('hidden');
}

function openInfoModal() {
    toggleProfileMenu(); // Close dropdown
    const modal = document.getElementById('modal-admin-info');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function openSecurityModal() {
    toggleProfileMenu(); // Close dropdown
    // Clear inputs
    document.getElementById('old-pass').value = '';
    document.getElementById('new-pass').value = '';
    document.getElementById('confirm-pass').value = '';
    
    const modal = document.getElementById('modal-admin-security');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

async function saveNewPassword() {
    const oldPass = document.getElementById('old-pass').value;
    const newPass = document.getElementById('new-pass').value;
    const confirmPass = document.getElementById('confirm-pass').value;

    if (!oldPass || !newPass || !confirmPass) {
        alert("กรุณากรอกข้อมูลให้ครบทุกช่อง");
        return;
    }

    if (newPass !== confirmPass) {
        alert("❌ รหัสผ่านใหม่และการยืนยันไม่ตรงกัน");
        return;
    }

    if (newPass.length < 6) {
        alert("⚠️ รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
        return;
    }

    try {
        // หา Admin คนปัจจุบันจาก LocalStorage (ชื่อ)
        // หมายเหตุ: ในระบบจริงควรใช้ User UID แต่ที่นี่ใช้ชื่อ/รหัส login
        const currentAdminName = localStorage.getItem('admin_name'); 

        // 1. ตรวจสอบรหัสเก่า
        const snapshot = await db.collection('admins')
            .where('name', '==', currentAdminName) // หรือใช้ username ถ้าคุณเก็บ username ไว้ใน LS
            .where('password', '==', oldPass)
            .get();

        if (snapshot.empty) {
            alert("❌ รหัสผ่านเดิมไม่ถูกต้อง");
            return;
        }

        // 2. อัปเดตรหัสผ่านใหม่
        const docId = snapshot.docs[0].id;
        await db.collection('admins').doc(docId).update({
            password: newPass
        });

        alert("✅ เปลี่ยนรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบใหม่");
        logout(); // บังคับ Logout

    } catch (e) {
        alert("เกิดข้อผิดพลาด: " + e.message);
    }
}

function logout() {
    if(confirm("ยืนยันการออกจากระบบ?")) {
        localStorage.removeItem('admin_logged_in');
        localStorage.removeItem('admin_name');
        localStorage.removeItem('admin_role');
        window.location.href = '../admin_login/index.html';
    }
}

// --- Utility Functions ---

function toggleSub(id, btn) {
    const el = document.getElementById(id);
    const arrow = btn.querySelector('.arrow');
    el.classList.toggle('open');
    if(el.classList.contains('open')){
        arrow.classList.replace('fa-chevron-left', 'fa-chevron-down');
    } else {
        arrow.classList.replace('fa-chevron-down', 'fa-chevron-left');
    }
}

function startClock() {
    setInterval(() => {
        const d = new Date();
        const str = d.toISOString().slice(0,19).replace('T', ' ');
        const el = document.getElementById('clock-target');
        if(el) el.innerText = `${str} เอเชีย/กรุงเทพฯ`;
    }, 1000);
}


    // เช็คว่าต่อ Database ติดหรือยัง ถ้ายังให้รอ 0.5 วิ แล้วลองใหม่
    function startBadgeListener() {
 // --- ส่วนที่แก้ไข: ย้ายตัวแปรออกมาข้างนอกฟังก์ชัน เพื่อให้ค่าไม่หาย ---
// ตรวจสอบชื่อไฟล์ให้ตรงกับในโฟลเดอร์ (rechage.mpeg และ withdraw.mpeg)
const soundRecharge = new Audio('sound/rechage.mpeg'); 
const soundWithdraw = new Audio('sound/withdraw.mpeg');

let lastRechargeCount = null; 
let lastWithdrawCount = null; 
    if (!window.db) {
        setTimeout(startBadgeListener, 500);
        return;
    }

    try {
        // ------------------------------------------------
        // 1. ฟังการเติมเงิน (Recharges) -> เล่นเสียง soundRecharge
        // ------------------------------------------------
        window.db.collection("recharges").where("status", "==", "pending")
            .onSnapshot((snapshot) => {
                const count = snapshot.size;
                const badge = document.getElementById("badge-deposit");
                
                // อัปเดตตัวเลขที่ปุ่ม
                if (badge) {
                    badge.innerText = count;
                    if (count > 0) badge.classList.add("animate-pulse", "bg-red-600"); // เพิ่มสีแดงกระพริบ
                    else badge.classList.remove("animate-pulse", "bg-red-600");
                }

                // Logic เสียง: ถ้าไม่ใช่ครั้งแรก และ ตัวเลขใหม่ > ตัวเลขเก่า
                if (lastRechargeCount !== null && count > lastRechargeCount) {
                    console.log("🔊 Playing Recharge Sound..."); // เช็คใน Console
                    playSound(soundRecharge); 
                }
                lastRechargeCount = count; // จำค่าล่าสุดไว้
            });

        // ------------------------------------------------
        // 2. ฟังการถอนเงิน (Withdrawals) -> เล่นเสียง soundWithdraw
        // ------------------------------------------------
        window.db.collection("withdrawals").where("status", "==", "pending")
            .onSnapshot((snapshot) => {
                const count = snapshot.size;
                const badge = document.getElementById("badge-withdraw");
                
                // อัปเดตตัวเลขที่ปุ่ม
                if (badge) {
                    badge.innerText = count;
                    if (count > 0) badge.classList.add("animate-pulse", "bg-red-600");
                    else badge.classList.remove("animate-pulse", "bg-red-600");
                }

                // Logic เสียง: ถ้าไม่ใช่ครั้งแรก และ ตัวเลขใหม่ > ตัวเลขเก่า
                if (lastWithdrawCount !== null && count > lastWithdrawCount) {
                    console.log("🔊 Playing Withdraw Sound..."); // เช็คใน Console
                    playSound(soundWithdraw);
                }
                lastWithdrawCount = count; // จำค่าล่าสุดไว้
            });

    } catch (e) {
        console.error("Error setting up badges:", e);
    }
}

// --- ฟังก์ชันช่วยเล่นเสียง ---
function playSound(audioFile) {
    try {
        audioFile.currentTime = 0; // เริ่มเล่นจากวินาทีที่ 0
        const playPromise = audioFile.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn("Browser Blocked Audio:", error);
                // เบราว์เซอร์ส่วนใหญ่จะบล็อกเสียงถ้าผู้ใช้ยังไม่คลิกหน้าเว็บ
            });
        }
    } catch (e) {
        console.error("Audio File Error:", e);
    }
}
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}
// --- ฟังก์ชันบันทึกข้อมูลพื้นฐาน (ชื่อ) ---
async function saveAdminInfo() {
    const newName = document.getElementById('edit-admin-name').value.trim();
    const username = document.getElementById('view-admin-username').value;

    if (!newName) {
        alert("กรุณากรอกชื่อที่ต้องการแสดง");
        return;
    }

    try {
        // 1. หา Doc ID จาก Username
        const snapshot = await db.collection('admins').where('username', '==', username).get();
        
        if (snapshot.empty) {
            alert("ไม่พบข้อมูลผู้ใช้ในระบบ");
            return;
        }

        const docId = snapshot.docs[0].id;

        // 2. อัปเดตชื่อใน Database
        await db.collection('admins').doc(docId).update({
            name: newName
        });

        // 3. อัปเดตชื่อใน LocalStorage และหน้าเว็บ
        localStorage.setItem('admin_name', newName);
        
        alert("บันทึกข้อมูลเรียบร้อย ✅");
        location.reload(); // รีเฟรชหน้าจอเพื่อแสดงชื่อใหม่

    } catch (e) {
        alert("เกิดข้อผิดพลาด: " + e.message);
    }
}

// --- ระบบตรวจสอบสถานะบัญชีแบบ Real-time (Auto Kick) ---
(function() {
    // ทำงานเฉพาะเมื่อล็อกอินอยู่แล้ว
    if (localStorage.getItem('admin_logged_in') === 'true') {
        const myDocId = localStorage.getItem('admin_doc_id');
        
        // ถ้ามี Doc ID ให้เกาะติดสถานะ
        if (myDocId && window.db) {
            window.db.collection('admins').doc(myDocId).onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    
                    // ถ้าสถานะเปลี่ยนเป็น banned หรือ inactive
                    if (data.status === 'banned' || data.status === 'inactive') {
                        console.warn("⛔ Account Banned! Logging out...");
                        
                        // 1. ล้างข้อมูลล็อกอิน
                        localStorage.clear();
                        
                        // 2. ดีดกลับไปหน้า Login พร้อมส่งสัญญาณให้โชว์ Modal
                        // ถอยโฟลเดอร์ตามโครงสร้างของคุณ (จาก admin -> admin_login)
                        window.location.href = '../admin_login/index.html?error=banned';
                    }
                } else {
                    // กรณี User ถูกลบออกจาก Database ไปเลย
                    localStorage.clear();
                    window.location.href = '../admin_login/index.html?error=banned';
                }
            }, (error) => {
                console.error("Auth Listener Error:", error);
            });
        }
    }
})();