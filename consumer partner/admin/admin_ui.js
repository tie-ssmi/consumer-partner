function renderAdminUI(activeTop, activeSide) {
    const headerHTML = `
    <header class="app-header">
        <div class="flex items-center h-full">
            <div class="logo-box">
                ระบบ<span style="font-size: 10px; position: relative; top: -5px; margin-left: 2px;">ระบบ</span>
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

            <button onclick="window.location.reload()" class="h-8 w-8 hover:bg-white/10 rounded-full" title="รีเฟรช"><i class="fa-solid fa-rotate"></i></button>
            <div class="flex items-center gap-1 cursor-pointer hover:text-gray-300">
                <i class="fa-regular fa-user"></i> 999999 <i class="fa-solid fa-chevron-down text-[10px]"></i>
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

    // Insert Structure
    document.body.insertAdjacentHTML('afterbegin', headerHTML);
    const container = document.createElement('div');
    container.className = 'app-container';
    container.innerHTML = sidebarHTML + `<main class="app-content custom-scroll p-4" id="main-content"></main>`;
    document.body.appendChild(container);

    startClock();
    
    // --- เริ่มทำงานฟังก์ชันนับตัวเลข Realtime ---
    startBadgeListener();
}

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

// --- ฟังก์ชันดึงยอด Real-time ---
function startBadgeListener() {
    // รอจนกว่า window.db จะพร้อมใช้งาน (เช็คทุก 0.5 วินาที)
    if (!window.db) {
        setTimeout(startBadgeListener, 500);
        return;
    }

    try {
        // 1. นับยอดเติมเงิน (recharges ที่ status = pending)
        window.db.collection("recharges").where("status", "==", "pending")
            .onSnapshot((snapshot) => {
                const count = snapshot.size;
                const badge = document.getElementById("badge-deposit");
                if (badge) {
                    badge.innerText = count;
                    // เอฟเฟกต์กระพริบถ้ามีรายการ (Optional)
                    if (count > 0) badge.classList.add("animate-pulse");
                    else badge.classList.remove("animate-pulse");
                }
            });

        // 2. นับยอดถอนเงิน (withdrawals ที่ status = pending)
        window.db.collection("withdrawals").where("status", "==", "pending")
            .onSnapshot((snapshot) => {
                const count = snapshot.size;
                const badge = document.getElementById("badge-withdraw");
                if (badge) {
                    badge.innerText = count;
                    if (count > 0) badge.classList.add("animate-pulse");
                    else badge.classList.remove("animate-pulse");
                }
            });

    } catch (e) {
        console.error("Error setting up badges:", e);
    }
}