/* Mẫu 3 (V3 Gộp gọn + Khung con Hai tông Đậm–Sáng như Mẫu 2) cho UI thử nghiệm Fleet Autopilot.
 * Trách nhiệm:
 * - Điều phối & Quản lý vận hành (Admin): giao diện gộp gọn không thanh menu trái + ngăn kéo trượt (slide-over drawer)
 *   và các khung con xen kẽ Đậm–Sáng theo bảng màu Matte Mineral Glass (4 nền).
 * - Quản trị hệ thống (System Admin): giữ thanh menu trái viên thuốc 5 nhóm (tự cân icon) + khung con Đậm–Sáng.
 * - Dùng chung dữ liệu và handler thật với Mẫu 1 & Mẫu 2 (FleetPreview, FleetRoles, FleetWorkflow, FleetGovernance). */
(() => {
  'use strict';
  const api = window.FleetPreview;
  const roles = window.FleetRoles;
  const wfApi = window.FleetWorkflow;
  const govApi = window.FleetGovernance;
  if (!api || !roles) return;

  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ico = (name, cls = 'v3-ico') => `<svg class="${cls}" aria-hidden="true"><use href="#${name}"/></svg>`;
  const qtyText = (o) => (api.qtyText ? api.qtyText(o) : `${o?.quantity || 0} ${o?.unit || 'm³'}`);
  const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }) : '—');
  const fmtDate = (d) => (d ? d.split('-').reverse().join('/') : '—');

  const root = document.createElement('section');
  root.id = 'spatial-v3-root';
  root.setAttribute('aria-label', 'Giao diện Mẫu 3 Hai tông');
  root.hidden = true;
  document.body.append(root);

  const st = {
    search: '',
    mapFilter: 'all',
    mapZoom: 1,
    selectedPlate: '',
    drawer: '', // '' | 'orders' | 'evidence' | 'fleet' | 'audit' | 'reports' | 'maintenance'
    drawerTab: '',
    orderTab: 'all',
    ticketId: '',
    adminMonths: 6,
    adminMonthFilter: 'all',
    sysNav: 'health', // 'health' | 'accounts' | 'maintenance' | 'connections' | 'security'
    sysTab: 'main',
    consoleLines: [
      'Fleet Autopilot / System Admin · Console kiểm tra trạng thái (text-only)',
      'Bộ lệnh cho phép: health system, health gps, health accounts, health jobs, help, clear',
    ],
    flags: { aiV1: true, gpsSync: true, sheetsExport: true },
    lastTriggerSelector: '',
  };

  function isActiveV3() {
    const style = window.FleetUIStyle?.get ? window.FleetUIStyle.get() : new URLSearchParams(location.search).get('ui');
    const role = roles.role();
    const isRoleHome = document.body.classList.contains('role-home-active');
    return style === 'v3' && window.innerWidth >= 760 && !isRoleHome && ['dispatch', 'admin', 'admin_system'].includes(role);
  }

  function themePillsHtml() {
    // Ưu tiên giá trị từ #theme-select để phản hồi tức thì ngay lần bấm đầu khi motion.js đang chuyển nền
    const cur = $('#theme-select')?.value || document.documentElement.dataset.theme || 'light';
    return [
      ['light', 'Sáng'],
      ['dark', 'Tối'],
      ['amber', 'Hổ phách'],
      ['moss', 'Rêu trầm'],
    ]
      .map(([k, lbl]) => `<button type="button" data-v3="theme" data-id="${k}" aria-pressed="${cur === k}">${lbl}</button>`)
      .join('');
  }

  function syncThemePills(theme) {
    const activeTheme = theme || document.documentElement.dataset.theme || $('#theme-select')?.value || 'light';
    root.querySelectorAll('[data-v3="theme"]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.id === activeTheme));
    });
  }

  function stylePillsHtml() {
    return [
      ['v1', 'Mẫu 1'],
      ['v2', 'Mẫu 2'],
      ['v3', 'Mẫu 3'],
    ]
      .map(([k, lbl]) => `<button type="button" data-v3="style" data-id="${k}" aria-pressed="${k === 'v3'}">${lbl}</button>`)
      .join('');
  }

  function roleSelectHtml(role) {
    return `<select class="v3-role-sel" data-v3-role aria-label="Chuyển vai trò xem thử">
      <option value="dispatch" ${role === 'dispatch' ? 'selected' : ''}>Điều phối</option>
      <option value="admin" ${role === 'admin' ? 'selected' : ''}>Quản lý vận hành</option>
      <option value="admin_system" ${role === 'admin_system' ? 'selected' : ''}>Quản trị hệ thống</option>
      <option value="driver" ${role === 'driver' ? 'selected' : ''}>Tài xế</option>
    </select>`;
  }

  function statusBadge(status) {
    const map = {
      pending: ['Chờ phân xe', 'v3-b-warn'],
      assigned: ['Chờ TX xác nhận', 'v3-b-warn'],
      running: ['Đang chạy', 'v3-b-run'],
      completed: ['Hoàn thành', 'v3-b-ok'],
      cancelled: ['Đã hủy', 'v3-b-err'],
    };
    const [lbl, cls] = map[status] || [status, 'v3-b-run'];
    return `<span class="v3-badge ${cls}">${esc(lbl)}</span>`;
  }

  function buildMapCard(s, activeOrders, titleText, isDispatch) {
    const vehicles = s.vehicles.filter((v) => {
      const ord = activeOrders.find((o) => o.plate === v.plate);
      if (st.mapFilter === 'ready') return !ord && v.availability === 'ready';
      if (st.mapFilter === 'running') return Boolean(ord);
      if (st.mapFilter === 'alert') return v.gps !== 'fresh' || v.availability !== 'ready';
      return true;
    });
    const activePlate = s.vehicles.some((v) => v.plate === st.selectedPlate) ? st.selectedPlate : (vehicles[0]?.plate || s.vehicles[0]?.plate || '');
    const activeVeh = s.vehicles.find((v) => v.plate === activePlate);
    const activeOrd = activeVeh ? activeOrders.find((o) => o.plate === activeVeh.plate) : null;
    const activeDrv = activeVeh ? s.drivers.find((d) => d.id === activeVeh.driverId) : null;
    const activeCount = s.vehicles.filter((v) => v.availability !== 'maintenance').length;

    const pinPos = [
      ['11%', '20%'],
      ['46%', '18%'],
      ['68%', '28%'],
      ['22%', '64%'],
      ['55%', '60%'],
      ['76%', '68%'],
    ];

    const pinsHtml = vehicles
      .map((v, i) => {
        const [l, tp] = pinPos[i % pinPos.length];
        const ord = activeOrders.find((o) => o.plate === v.plate);
        const dot = v.gps === 'offline' ? 'v3-dot-err' : v.gps === 'stale' ? 'v3-dot-warn' : ord ? 'v3-dot-run' : 'v3-dot-ok';
        const suffix = v.gps === 'stale' ? ' · GPS cũ' : v.gps === 'offline' ? ' · Mất GPS' : '';
        return `<button type="button" class="v3-pin" style="left:${l};top:${tp}" data-v3="pick-map-veh" data-id="${esc(v.plate)}" aria-pressed="${v.plate === activePlate}"><i class="v3-dot ${dot}"></i>${esc(v.plate)}${suffix}</button>`;
      })
      .join('');

    return `<section class="v3-map-card v3-card-dark">
      <div class="v3-card-hd">
        <h2>${esc(titleText)} <small>· ${activeCount} xe hoạt động</small></h2>
        <div class="v3-filters">
          ${[
            ['all', 'Tất cả'],
            ['ready', 'Sẵn sàng'],
            ['running', 'Đang chạy'],
            ['alert', 'Cảnh báo'],
          ]
            .map(([k, lbl]) => `<button type="button" class="v3-flt" data-v3="map-filter" data-id="${k}" aria-pressed="${st.mapFilter === k}">${lbl}</button>`)
            .join('')}
        </div>
      </div>
      <div class="v3-map-box">
        <svg viewBox="0 0 760 340" preserveAspectRatio="xMidYMid slice" style="transform:scale(${st.mapZoom})">
          <g fill="none" stroke="var(--v3-map-road)" stroke-width="1.4">
            <path d="M-20 85 L220 22 L470 105 L780 28"/>
            <path d="M-15 205 L210 138 L465 218 L780 135"/>
            <path d="M-10 315 L260 210 L550 320 L780 245"/>
            <path d="M120 -10 L250 350 M320 -10 L445 350 M520 -10 L650 350"/>
          </g>
          <path d="M440 -20 C415 55 530 45 505 110 C480 175 420 165 470 230 C520 295 610 250 625 355" fill="none" stroke="var(--v3-map-river)" stroke-width="32" stroke-linecap="round"/>
          <path d="M95 140 C205 235 365 255 505 200 C590 164 660 140 710 140" fill="none" stroke="var(--v3-route)" stroke-width="4" stroke-linecap="round"/>
          <circle cx="95" cy="140" r="7" fill="var(--v3-route)"/>
          <circle cx="710" cy="140" r="7" fill="var(--v3-route)"/>
        </svg>
        ${pinsHtml}
        <span class="v3-map-cap">Sơ đồ minh họa · GPS Taris (chu kỳ 10 phút) · Tách riêng GPS điện thoại</span>
        <div class="v3-map-zoom">
          <button type="button" data-v3="zoom-in" aria-label="Phóng to">+</button>
          <button type="button" data-v3="zoom-out" aria-label="Thu nhỏ">−</button>
        </div>
      </div>
      ${
        activeVeh
          ? `<div class="v3-map-bar">
              <div><strong>${esc(activeVeh.plate)}</strong><span>${esc(activeVeh.type)} (${esc(activeVeh.capacityText)}) · ${esc(activeDrv?.name || 'Chưa gán')} · ${activeOrd ? `Chuyến ${esc(activeOrd.id)}` : activeVeh.availability === 'maintenance' ? 'Đang bảo trì' : 'Sẵn sàng'}</span></div>
              <div style="display:flex;gap:6px">
                ${isDispatch ? `<button type="button" class="v3-map-bar-btn" data-action="detail-vehicle" data-id="${esc(activeVeh.plate)}">Chi tiết xe →</button>` : `<button type="button" class="v3-map-bar-btn" data-v3="open-drawer" data-id="maintenance">Xem Ticket / Bảo trì →</button>`}
              </div>
            </div>`
          : ''
      }
    </section>`;
  }

  /* ==================== 1. ĐIỀU PHỐI (V3 GỘP GỌN + HAI TÔNG) ==================== */
  function renderDispatch() {
    const s = api.snapshot();
    const tickets = wfApi?.tickets ? wfApi.tickets() : [];
    const openTickets = tickets.filter((t) => t.status === 'open');
    const emergencyTicket = openTickets.find((t) => t.emergency);
    const pending = s.orders.filter((o) => o.status === 'pending');
    const assigned = s.orders.filter((o) => o.status === 'assigned');
    const running = s.orders.filter((o) => o.status === 'running');
    const activeOrders = [...assigned, ...running];
    const alerts = api.alerts ? api.alerts() : [];

    const focusOrder = pending.find((o) => o.id === s.selectedOrder) || pending[0] || s.orders[0];
    const cands = focusOrder && focusOrder.status === 'pending' && api.candidates ? api.candidates(focusOrder) : [];
    const chosenPlate = cands.some((v) => v.plate === s.selectedVehicle) ? s.selectedVehicle : (cands[0]?.plate || '');
    const nextPending = pending.find((o) => o.id !== focusOrder?.id);

    const drawerHtml = st.drawer ? renderDispatchDrawer(s, tickets) : '';

    return `<div class="v3-shell">
      <header class="v3-topbar">
        <div class="v3-tb-left">
          <div class="v3-brand"><span class="hs-brand-mark" aria-hidden="true"></span><span>Điều phối</span></div>
          <div class="v3-pill-group">${stylePillsHtml()}</div>
        </div>
        <label class="v3-search">${ico('search-icon')}<input type="search" data-v3-search placeholder="Tìm mã đơn, xe, vật liệu…" value="${esc(st.search)}"></label>
        <div class="v3-tb-right">
          <div class="v3-pill-group">${themePillsHtml()}</div>
          <button type="button" class="v3-bell" data-v3="open-drawer" data-id="fleet" data-tab="tickets" aria-label="Cảnh báo & Ticket">${ico('bell')}<b>${openTickets.length}</b></button>
          <button type="button" class="v3-ghost" data-workflow-action="login">Đăng nhập / Passkey</button>
          <button type="button" class="v3-btn" data-action="new-order">+ Tiếp nhận đơn</button>
          ${roleSelectHtml('dispatch')}
        </div>
      </header>

      <main class="v3-content">
        <section class="v3-kpi-row">
          <button type="button" class="v3-kpi v3-card-light" data-v3="open-drawer" data-id="orders" data-tab="pending"><div><div class="v3-kpi-lbl">Chờ phân xe</div><div class="v3-kpi-sub">Đơn cần duyệt AI V1</div></div><div class="v3-kpi-val">${String(pending.length).padStart(2, '0')}</div></button>
          <button type="button" class="v3-kpi v3-card-dark" data-v3="open-drawer" data-id="orders" data-tab="assigned"><div><div class="v3-kpi-lbl">Chờ TX xác nhận</div><div class="v3-kpi-sub">Không tự hết hạn</div></div><div class="v3-kpi-val">${String(assigned.length).padStart(2, '0')}</div></button>
          <button type="button" class="v3-kpi v3-card-light" data-v3="open-drawer" data-id="evidence"><div><div class="v3-kpi-lbl">Chuyến đang chạy</div><div class="v3-kpi-sub">Kiểm bằng chứng 2 đầu</div></div><div class="v3-kpi-val">${String(running.length).padStart(2, '0')}</div></button>
          <button type="button" class="v3-kpi v3-card-dark" data-v3="open-drawer" data-id="fleet" data-tab="tickets"><div><div class="v3-kpi-lbl">Khẩn cấp & Ngoại lệ</div><div class="v3-kpi-sub">${openTickets.length} ticket · ${alerts.length} cảnh báo</div></div><div class="v3-kpi-val">${String(openTickets.length + alerts.length).padStart(2, '0')}</div></button>
        </section>

        <div class="v3-main-grid">
          <div class="v3-left-col">
            ${buildMapCard(s, activeOrders, 'Bản đồ đội xe', true)}
            <section class="v3-dock-row">
              <button type="button" class="v3-dock v3-card-light" data-v3="open-drawer" data-id="orders"><span class="v3-dock-ico">${ico('order')}</span><div class="v3-dock-txt"><strong>Sổ Đơn hàng · ${String(s.orders.length).padStart(2, '0')}</strong><small>${pending.length} chờ · ${assigned.length} chờ TX</small></div></button>
              <button type="button" class="v3-dock v3-card-dark" data-v3="open-drawer" data-id="evidence"><span class="v3-dock-ico">${ico('camera')}</span><div class="v3-dock-txt"><strong>Bằng chứng 2 đầu</strong><small>Ảnh nhận/giao & duyệt xong</small></div></button>
              <button type="button" class="v3-dock v3-card-light" data-v3="open-drawer" data-id="fleet" data-tab="vehicles"><span class="v3-dock-ico">${ico('truck')}</span><div class="v3-dock-txt"><strong>Đội xe & Tài xế</strong><small>Ben · Cẩu · Đầu kéo · Dự phòng</small></div></button>
              <button type="button" class="v3-dock v3-card-dark" data-v3="open-drawer" data-id="fleet" data-tab="tickets"><span class="v3-dock-ico">${ico('message')}</span><div class="v3-dock-txt"><strong>Khẩn cấp & Ticket</strong><small>${openTickets.length} mở · 2 chiều</small></div></button>
            </section>
          </div>

          <div class="v3-right-col">
            <section class="v3-quick v3-card-light">
              <div class="v3-card-hd">
                <h2>Điều phối nhanh</h2>
                <button type="button" class="v3-btn" style="height:28px;font-size:11px" data-v3="ai-suggest" ${focusOrder?.status === 'pending' && cands.length ? '' : 'disabled'}>${ico('spark')} Đề xuất AI V1</button>
              </div>
              <div class="v3-order-box">
                <div class="v3-order-top">
                  <strong>${focusOrder ? `${esc(focusOrder.id)} · ${esc(focusOrder.material)} (${esc(qtyText(focusOrder))})` : 'Chưa có đơn chờ'}</strong>
                  ${focusOrder ? `<span class="v3-prio">${esc(focusOrder.customerGroup || 'Đơn')}</span>` : ''}
                </div>
                <p>${focusOrder ? `${esc(focusOrder.from)} → ${esc(focusOrder.to)} · ${focusOrder.distanceKm || '—'} km · Hạn ${esc(focusOrder.slot || fmtDate(focusOrder.day))}` : 'Bấm + Tiếp nhận đơn từ Sale'}</p>
              </div>
              <div class="v3-veh-row">
                ${cands.length
                  ? cands.slice(0, 3).map((v) => `<button type="button" class="v3-veh" data-v3="pick-cand" data-id="${esc(v.plate)}" aria-pressed="${v.plate === chosenPlate}"><strong>${esc(v.plate)}</strong><small>${esc(v.type)} · Tham khảo</small></button>`).join('')
                  : '<div style="grid-column:1/-1;font-size:11.5px;opacity:.75">Không có xe phù hợp loại hàng — giữ trạng thái chờ & theo dõi hạn giao.</div>'}
              </div>
              <div class="v3-rule-note">Công bằng việc tháng trước, tuyến sau (chưa chốt công thức) · 1 xe 1 đơn · Mọi phân công V1 do Điều phối duyệt.</div>
              <div class="v3-cta-row">
                <button type="button" class="v3-cta-main" data-v3="quick-assign" ${focusOrder?.status === 'pending' && chosenPlate ? '' : 'disabled'}>Duyệt phân công →</button>
                <button type="button" class="v3-cta-sec" data-workflow-action="help-recovery">Hỗ trợ quên MK</button>
              </div>
              ${nextPending ? `<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;padding-top:4px;border-top:1px dashed var(--v3-light-inner-bd)"><span>Kế tiếp: <strong>${esc(nextPending.id)} · ${esc(nextPending.material)}</strong></span><button type="button" class="v3-prio" style="cursor:pointer" data-v3="focus-order" data-id="${esc(nextPending.id)}">Chọn</button></div>` : ''}
            </section>

            <section class="v3-list-card v3-card-dark" style="flex:1">
              <div class="v3-card-hd">
                <h2>Khẩn cấp 1 nút & Ngoại lệ</h2>
                <button type="button" class="v3-map-bar-btn" data-v3="open-drawer" data-id="fleet" data-tab="tickets">Mở ngăn kéo ↗</button>
              </div>
              ${emergencyTicket ? `<button type="button" class="v3-item-dark" data-v3="open-ticket" data-id="${esc(emergencyTicket.id)}"><i class="v3-dot v3-dot-err" style="margin-top:4px"></i><div><strong>KHẨN CẤP · ${esc(emergencyTicket.code)} (${esc(emergencyTicket.plate)})</strong><small>Ảnh tự chụp: ${esc(emergencyTicket.filename)} · ${esc(emergencyTicket.phoneGps)}</small></div></button>` : ''}
              ${alerts.slice(0, 2).map((a) => `<button type="button" class="v3-item-dark" data-v3="open-drawer" data-id="evidence"><i class="v3-dot v3-dot-warn" style="margin-top:4px"></i><div><strong>${esc(a.title)}</strong><small>${esc(a.text)}</small></div></button>`).join('')}
            </section>

            <section class="v3-list-card v3-card-light">
              <div class="v3-card-hd"><h2>Hoạt động gần đây</h2><button type="button" class="v3-prio" style="cursor:pointer" data-v3="open-drawer" data-id="fleet" data-tab="reports">Báo cáo tháng ↗</button></div>
              ${s.activity.slice(0, 2).map((a) => `<div class="v3-item-light"><span>${esc(a.text)}</span><small>${fmtTime(a.at)}</small></div>`).join('')}
            </section>
          </div>
        </div>
      </main>

      <footer class="v3-foot">
        <span>Mẫu 3 · Hai tông Đậm–Sáng (Không thanh menu trái · Đủ luồng Workflow 01–14) · Dữ liệu mẫu</span>
        <span>Gạch: viên · Cát/đá nhà máy: kg · Thường: m³ · Phạm vi ≤100 km · Không tự hết hạn phản hồi</span>
      </footer>
      ${drawerHtml}
    </div>`;
  }

  function renderDispatchDrawer(s, tickets) {
    if (st.drawer === 'orders') {
      const q = st.search.trim().toLowerCase();
      const list = s.orders.filter((o) => (st.orderTab === 'all' || o.status === st.orderTab) && (!q || JSON.stringify(o).toLowerCase().includes(q)));
      return `<div class="v3-backdrop" data-v3="close-backdrop">
        <aside class="v3-drawer">
          <div class="v3-drawer-hd">
            <div><h2>Sổ Đơn hàng · Điều phối</h2><p>Ưu tiên: Công trình lớn → Vựa → Thầu → Khách lẻ · Xóa đơn yêu cầu gõ xác nhận mã đơn ("Nhập lại").</p></div>
            <div style="display:flex;gap:7px;align-items:center"><button type="button" class="v3-ghost" data-action="export-orders">Xuất CSV</button><button type="button" class="v3-btn" data-action="new-order">+ Tiếp nhận đơn</button><button type="button" class="v3-close" data-v3="close-drawer">×</button></div>
          </div>
          <div class="v3-tabs-left">
            ${[
              ['all', `Tất cả (${s.orders.length})`],
              ['pending', `Chờ phân xe (${s.orders.filter((o) => o.status === 'pending').length})`],
              ['assigned', `Chờ TX xác nhận (${s.orders.filter((o) => o.status === 'assigned').length})`],
              ['running', `Đang chạy (${s.orders.filter((o) => o.status === 'running').length})`],
              ['completed', `Hoàn thành (${s.orders.filter((o) => o.status === 'completed').length})`],
            ]
              .map(([k, lbl]) => `<button type="button" class="v3-stab" data-v3="order-tab" data-id="${k}" aria-pressed="${st.orderTab === k}">${lbl}</button>`)
              .join('')}
          </div>
          <div class="v3-card-dark" style="padding:12px 14px;flex:1;display:flex;flex-direction:column;min-height:0">
            <div class="v3-table-wrap"><table class="v3-table">
              <thead><tr><th>Mã đơn / Nhóm khách</th><th>Vật liệu & Đơn vị</th><th>Hành trình & Hạn</th><th>Trạng thái & Thao tác</th></tr></thead>
              <tbody>${list.map((o) => `<tr>
                <td><strong>${esc(o.id)}</strong><small>${esc(o.customerGroup || '')} · ${esc(o.customer)}</small></td>
                <td>${esc(o.material)}<small>${esc(qtyText(o))} · ${o.distanceKm || '—'} km</small></td>
                <td>${esc(o.from)} → ${esc(o.to)}<small>${fmtDate(o.day)} · ${esc(o.slot || '—')}${o.plate ? ' · ' + esc(o.plate) : ''}</small></td>
                <td><div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center">${statusBadge(o.status)}${o.status === 'pending' ? `<button type="button" class="v3-tbtn hi" data-v3="focus-order-close" data-id="${esc(o.id)}">Phân xe →</button><button type="button" class="v3-tbtn" data-action="cancel-order" data-id="${esc(o.id)}">Xóa</button>` : ['assigned', 'running'].includes(o.status) ? `<button type="button" class="v3-tbtn hi" data-workflow-action="trip-review" data-id="${esc(o.id)}">Bằng chứng</button><button type="button" class="v3-tbtn" data-workflow-action="trip-exception" data-id="${esc(o.id)}">Ngoại lệ</button>` : `<button type="button" class="v3-tbtn" data-action="detail-order" data-id="${esc(o.id)}">Chi tiết</button>`}</div></td>
              </tr>`).join('')}</tbody>
            </table></div>
          </div>
          <div class="v3-card-light" style="padding:10px 14px;font-size:11.5px"><strong>Đơn vị chuẩn:</strong> Gạch = <b>viên</b> · Cát/đá nhà máy = <b>kg</b> · Thông thường = <b>m³</b> · Khoảng cách giao ≤100 km.</div>
        </aside>
      </div>`;
    }

    if (st.drawer === 'evidence') {
      const activeTrips = s.orders.filter((o) => ['assigned', 'running'].includes(o.status));
      const allEv = roles.snapshot().evidence || [];
      const awaitingVehs = s.vehicles.filter((v) => v.availability === 'awaiting_check');
      return `<div class="v3-backdrop" data-v3="close-backdrop">
        <aside class="v3-drawer">
          <div class="v3-drawer-hd">
            <div><h2>Kiểm bằng chứng 2 đầu & Xử lý Ngoại lệ (4 nhánh)</h2><p>Đối chiếu ảnh đầu nhận + đầu giao + GPS điện thoại, duyệt hoàn thành, xác nhận xe sẵn sàng hoặc điều xe hỗ trợ khi xe hư.</p></div>
            <button type="button" class="v3-close" data-v3="close-drawer">×</button>
          </div>
          <div class="v3-card-dark" style="padding:13px 15px;flex:1;display:flex;flex-direction:column;gap:10px;min-height:0;overflow:auto">
            ${activeTrips.map((o) => {
              const evs = allEv.filter((e) => e.order === o.id);
              const pk = evs.filter((e) => e.kind === 'pickup').length;
              const dl = evs.filter((e) => e.kind !== 'pickup').length;
              return `<div style="padding:12px;border-radius:14px;background:rgba(255,255,255,0.045);border:1px solid rgba(255,255,255,0.09);display:flex;flex-direction:column;gap:8px">
                <div class="v3-card-hd"><strong>${esc(o.id)} · ${esc(o.material)} (${esc(qtyText(o))}) · Xe ${esc(o.plate)}${o.supportPlate ? ` + Xe hỗ trợ ${esc(o.supportPlate)}` : ''}</strong>${statusBadge(o.status)}</div>
                <div style="font-size:11.5px;color:var(--v3-dark-muted)">${esc(o.from)} → ${esc(o.to)} · Ảnh đầu nhận: <b>${pk}</b> · Ảnh đầu giao: <b>${dl}</b>${o.exceptionReason ? ` · Ngoại lệ: ${esc(o.exceptionReason)}` : ''}</div>
                <div style="display:flex;gap:7px;flex-wrap:wrap">
                  <button type="button" class="v3-tbtn hi" data-workflow-action="trip-review" data-id="${esc(o.id)}">Đối chiếu ảnh 2 đầu & Duyệt xong</button>
                  <button type="button" class="v3-tbtn" data-workflow-action="trip-supplement" data-id="${esc(o.id)}">Yêu cầu bổ sung</button>
                  <button type="button" class="v3-tbtn" data-workflow-action="trip-exception" data-id="${esc(o.id)}">Xử lý ngoại lệ (Xe hư / Chờ / Phân lại / Hủy)</button>
                </div>
              </div>`;
            }).join('') || '<p style="font-size:12px;opacity:.75">Hiện không có chuyến đang chạy hoặc chờ tài xế xác nhận.</p>'}
          </div>
          <div class="v3-card-light" style="padding:12px 15px;display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px">
            <div><strong>Xe chờ xác nhận sẵn sàng:</strong> ${awaitingVehs.length ? awaitingVehs.map((v) => esc(v.plate)).join(', ') : 'Không có xe nào đang chờ kiểm tra sau chuyến.'}</div>
            ${awaitingVehs[0] ? `<button type="button" class="v3-btn" data-workflow-action="vehicle-ready" data-id="${esc(awaitingVehs[0].plate)}">Xác nhận ${esc(awaitingVehs[0].plate)} sẵn sàng</button>` : ''}
          </div>
        </aside>
      </div>`;
    }

    // Ngăn kéo gộp Đội xe & Tài xế / Khẩn cấp & Ticket 2 chiều / Báo cáo tháng
    const tab = st.drawerTab || 'vehicles';
    const activeTicket = tickets.find((t) => t.id === st.ticketId) || tickets[0];
    let tabBody = '';
    if (tab === 'vehicles') {
      tabBody = `<div class="v3-card-dark" style="padding:12px 14px;flex:1;display:flex;flex-direction:column;min-height:0">
        <div class="v3-table-wrap"><table class="v3-table">
          <thead><tr><th>Biển số & Loại xe</th><th>Hàng phù hợp & Sức chứa</th><th>Tài xế</th><th>Trạng thái & GPS</th><th>Thao tác</th></tr></thead>
          <tbody>${s.vehicles.map((v) => {
            const d = s.drivers.find((x) => x.id === v.driverId);
            return `<tr><td><strong>${esc(v.plate)}</strong><small>${esc(v.type)}${v.backup ? ' · Xe dự phòng' : ''}</small></td><td>${esc(v.cargoNote)}<small>${esc(v.capacityText)} · ${esc(v.imei || '')}</small></td><td>${esc(d?.name || 'Chưa gán')}</td><td><span class="v3-badge ${v.gps === 'fresh' ? 'v3-b-ok' : v.gps === 'stale' ? 'v3-b-warn' : 'v3-b-err'}">${esc(api.labels?.[v.availability] || v.availability)} · ${esc(v.gps)}</span></td><td><button type="button" class="v3-tbtn" data-action="edit-vehicle" data-id="${esc(v.plate)}">Sửa</button></td></tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>`;
    } else if (tab === 'tickets') {
      tabBody = `<div style="display:grid;grid-template-columns:250px 1fr;gap:12px;flex:1;min-height:0">
        <div class="v3-card-dark" style="padding:10px;overflow:auto;display:flex;flex-direction:column;gap:8px">
          ${tickets.map((t) => `<button type="button" class="v3-item-dark" data-v3="select-ticket" data-id="${esc(t.id)}" style="${activeTicket?.id === t.id ? 'border-color:var(--v3-accent)' : ''}"><i class="v3-dot ${t.emergency ? 'v3-dot-err' : t.status === 'closed' ? 'v3-dot-ok' : 'v3-dot-warn'}" style="margin-top:4px"></i><div><strong>${esc(t.code)} · ${t.emergency ? 'KHẨN CẤP' : esc(t.kind)}</strong><small>${esc(t.plate || '—')} · ${t.status === 'closed' ? 'Đã đóng' : 'Đang mở'}</small></div></button>`).join('')}
        </div>
        <div class="v3-card-light" style="padding:14px 16px;display:flex;flex-direction:column;gap:9px;min-height:0">
          ${activeTicket ? `<div class="v3-card-hd"><h2>${esc(activeTicket.code)} · ${activeTicket.emergency ? 'Khẩn cấp 1 nút' : esc(activeTicket.kind)}</h2><span class="v3-prio">${activeTicket.status === 'closed' ? 'Đã đóng (Chỉ đọc)' : 'Đang mở'} · ${esc(activeTicket.order || '—')}</span></div>
            ${activeTicket.filename ? `<div style="font-size:11px;opacity:.8">Ảnh tự chụp / đính kèm: <b>${esc(activeTicket.filename)}</b>${activeTicket.phoneGps ? ` · ${esc(activeTicket.phoneGps)}` : ''}</div>` : ''}
            <div style="flex:1;overflow:auto;display:flex;flex-direction:column;gap:7px">${activeTicket.messages.map((m) => `<div class="v3-msg"><strong>${esc(m.by)} · ${fmtTime(m.at)}</strong> — ${esc(m.text)}</div>`).join('')}</div>
            ${activeTicket.status === 'open' ? `<form data-v3-ticket-form="${esc(activeTicket.id)}" style="display:flex;gap:7px"><input name="msg" required placeholder="Nhập phản hồi cho tài xế…" style="flex:1;height:34px;border-radius:999px;padding:0 13px;border:1px solid var(--v3-light-inner-bd);background:var(--v3-light-inner);color:var(--v3-light-ink)"><button type="submit" class="v3-btn">Gửi tin</button><button type="button" class="v3-cta-sec" style="height:34px" data-workflow-action="ticket-close" data-id="${esc(activeTicket.id)}">Đóng ticket</button></form>` : `<div style="font-size:11.5px"><strong>Kết quả đóng:</strong> ${esc(activeTicket.resolution || '—')} (Hồ sơ chỉ đọc; không tự hoàn thành chuyến).</div>`}` : '<p>Chưa có ticket.</p>'}
        </div>
      </div>`;
    } else {
      const done = s.orders.filter((o) => o.status === 'completed');
      const byUnit = ['m³', 'kg', 'viên'].map((u) => [u, done.filter((o) => (o.unit || 'm³') === u).reduce((n, o) => n + o.quantity, 0)]);
      tabBody = `<div class="v3-card-light" style="padding:14px 16px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
        ${byUnit.map(([u, total]) => `<div style="padding:10px;border-radius:12px;background:var(--v3-light-inner)"><small style="opacity:.7">Đã giao (${esc(u)})</small><strong style="display:block;font-size:20px;margin-top:2px">${api.formatNum ? api.formatNum(total) : total} ${esc(u)}</strong></div>`).join('')}
      </div>
      <div class="v3-card-dark" style="padding:12px 14px;flex:1;display:flex;flex-direction:column;min-height:0">
        <div class="v3-card-hd" style="margin-bottom:8px"><h2>Tổng hợp đơn hàng theo kỳ</h2><button type="button" class="v3-tbtn hi" data-action="export-reports">Xuất CSV báo cáo</button></div>
        <div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>Mã đơn</th><th>Nhóm khách</th><th>Vật liệu & Đơn vị</th><th>Trạng thái</th><th>Xe</th></tr></thead><tbody>${s.orders.map((o) => `<tr><td><strong>${esc(o.id)}</strong></td><td>${esc(o.customerGroup || '')}</td><td>${esc(o.material)} · ${esc(qtyText(o))}</td><td>${statusBadge(o.status)}</td><td>${esc(o.plate || '—')}</td></tr>`).join('')}</tbody></table></div>
      </div>`;
    }

    return `<div class="v3-backdrop" data-v3="close-backdrop">
      <aside class="v3-drawer">
        <div class="v3-drawer-hd">
          <div><h2>Đội xe, Khẩn cấp & Ticket, Báo cáo tháng</h2><p>Gộp toàn bộ tác vụ phụ của Điều phối trong một ngăn kéo trượt.</p></div>
          <button type="button" class="v3-close" data-v3="close-drawer">×</button>
        </div>
        <div class="v3-tabs-left">
          <button type="button" class="v3-stab" data-v3="drawer-tab" data-id="vehicles" aria-pressed="${tab === 'vehicles'}">Đội xe & Tài xế (${s.vehicles.length})</button>
          <button type="button" class="v3-stab" data-v3="drawer-tab" data-id="tickets" aria-pressed="${tab === 'tickets'}">Khẩn cấp & Ticket (${tickets.filter((t) => t.status === 'open').length} mở)</button>
          <button type="button" class="v3-stab" data-v3="drawer-tab" data-id="reports" aria-pressed="${tab === 'reports'}">Báo cáo tháng</button>
        </div>
        ${tabBody}
      </aside>
    </div>`;
  }

  /* ==================== 2. QUẢN LÝ VẬN HÀNH / ADMIN (KHÔNG DUYỆT ROLE) ==================== */
  function renderAdmin() {
    const s = api.snapshot();
    const rSnap = roles.snapshot();
    const gov = govApi?.snapshot ? govApi.snapshot() : { maintenance: [], support: [], jobs: [] };
    const tickets = wfApi?.tickets ? wfApi.tickets() : [];
    const openTickets = tickets.filter((t) => t.status === 'open');
    const pending = s.orders.filter((o) => o.status === 'pending');
    const activeOrders = s.orders.filter((o) => ['assigned', 'running'].includes(o.status));
    const activeVehCount = s.vehicles.filter((v) => v.availability !== 'maintenance').length;
    const lockAlerts = gov.support || [];
    const failedJobs = (gov.jobs || []).filter((j) => j.status === 'failed').length;

    const months = Array.from({ length: st.adminMonths }, (_, i) => {
      const d = new Date('2026-11-01T00:00:00Z');
      d.setUTCMonth(d.getUTCMonth() - st.adminMonths + 1 + i);
      return d.toISOString().slice(0, 7);
    });
    const series = months.map((m) => {
      const grp = s.orders.filter((o) => o.day.startsWith(m));
      const done = grp.filter((o) => o.status === 'completed').length;
      return { month: m, label: `T${Number(m.slice(5))}`, total: grp.length, done };
    });
    const peak = Math.max(2, ...series.map((x) => x.total));

    const drawerHtml = st.drawer ? renderAdminDrawer(s, rSnap, gov, tickets) : '';

    return `<div class="v3-shell">
      <header class="v3-topbar">
        <div class="v3-tb-left">
          <div class="v3-brand"><span class="hs-brand-mark" aria-hidden="true"></span><span>Quản lý vận hành</span></div>
          <div class="v3-pill-group">${stylePillsHtml()}</div>
        </div>
        <label class="v3-search">${ico('search-icon')}<input type="search" data-v3-search placeholder="Tìm đơn, nhật ký Điều phối, xe…" value="${esc(st.search)}"></label>
        <div class="v3-tb-right">
          <div class="v3-pill-group">${themePillsHtml()}</div>
          <button type="button" class="v3-bell" data-v3="open-drawer" data-id="maintenance" aria-label="Thông báo khóa TK & Bảo trì">${ico('bell')}<b>${lockAlerts.length + failedJobs}</b></button>
          <button type="button" class="v3-ghost" data-workflow-action="login">Passkey</button>
          <button type="button" class="v3-btn" data-gov="maintenance-new">+ Yêu cầu bảo trì</button>
          ${roleSelectHtml('admin')}
        </div>
      </header>

      <main class="v3-content">
        <section class="v3-kpi-row">
          <button type="button" class="v3-kpi v3-card-light" data-v3="open-drawer" data-id="reports"><div><div class="v3-kpi-lbl">Tổng đơn trong kỳ</div><div class="v3-kpi-sub">Xong ${s.orders.filter((o) => o.status === 'completed').length} · Chưa xong ${s.orders.filter((o) => o.status !== 'completed').length}</div></div><div class="v3-kpi-val">${String(s.orders.length).padStart(2, '0')}</div></button>
          <button type="button" class="v3-kpi v3-card-dark" data-v3="open-drawer" data-id="reports"><div><div class="v3-kpi-lbl">Đang chạy / Chờ TX</div><div class="v3-kpi-sub">Giám sát toàn công ty</div></div><div class="v3-kpi-val">${String(activeOrders.length).padStart(2, '0')}</div></button>
          <button type="button" class="v3-kpi v3-card-light" data-v3="open-drawer" data-id="maintenance"><div><div class="v3-kpi-lbl">Xe hoạt động</div><div class="v3-kpi-sub">${failedJobs} tác vụ GPS lỗi · Ảnh hưởng</div></div><div class="v3-kpi-val">${String(activeVehCount).padStart(2, '0')}</div></button>
          <button type="button" class="v3-kpi v3-card-dark" data-v3="open-drawer" data-id="maintenance" data-tab="tickets"><div><div class="v3-kpi-lbl">Ticket mở (Chỉ đọc)</div><div class="v3-kpi-sub">Admin không gửi/đóng</div></div><div class="v3-kpi-val">${String(openTickets.length).padStart(2, '0')}</div></button>
        </section>

        <div class="v3-main-grid">
          <div class="v3-left-col">
            ${buildMapCard(s, activeOrders, 'Bản đồ đội xe toàn công ty', false)}
            <section class="v3-dock-row">
              <button type="button" class="v3-dock v3-card-light" data-v3="open-drawer" data-id="audit"><span class="v3-dock-ico">${ico('activity')}</span><div class="v3-dock-txt"><strong>Nhật ký vận hành</strong><small>${rSnap.audit.length} thao tác Điều phối</small></div></button>
              <button type="button" class="v3-dock v3-card-dark" data-v3="open-drawer" data-id="reports"><span class="v3-dock-ico">${ico('chart')}</span><div class="v3-dock-txt"><strong>Báo cáo & Tra cứu đơn</strong><small>Drilldown theo tháng</small></div></button>
              <button type="button" class="v3-dock v3-card-light" data-v3="open-drawer" data-id="maintenance" data-tab="tickets"><span class="v3-dock-ico">${ico('message')}</span><div class="v3-dock-txt"><strong>Hồ sơ Ticket · ${String(openTickets.length).padStart(2, '0')}</strong><small>Chỉ đọc · Theo dõi</small></div></button>
              <button type="button" class="v3-dock v3-card-dark" data-v3="open-drawer" data-id="maintenance" data-tab="maint"><span class="v3-dock-ico">${ico('gear')}</span><div class="v3-dock-txt"><strong>Bảo trì & Khóa TK</strong><small>Gửi System Admin</small></div></button>
            </section>
          </div>

          <div class="v3-right-col">
            <section class="v3-quick v3-card-light">
              <div class="v3-card-hd">
                <div><h2>Thống kê đơn ${st.adminMonths} tháng (đơn)</h2><small>Bấm vào cột tháng để mở tra cứu drilldown (không có số tài chính)</small></div>
                <div class="v3-pill-group">
                  <button type="button" data-v3="admin-months" data-id="6" aria-pressed="${st.adminMonths === 6}">6T</button>
                  <button type="button" data-v3="admin-months" data-id="12" aria-pressed="${st.adminMonths === 12}">12T</button>
                </div>
              </div>
              <div class="v3-chart-body">
                <div class="v3-y-axis"><span>${peak}</span><span>${Math.round(peak / 2)}</span><span>0</span></div>
                <div class="v3-bars-wrap">
                  <div class="v3-grid-lines"><i></i><i></i><i></i></div>
                  <div class="v3-bars" style="grid-template-columns:repeat(${st.adminMonths},1fr)">
                    ${series.map((x) => {
                      const hPct = Math.max(x.total ? Math.round((x.total / peak) * 100) : 8, 8);
                      const dPct = x.total ? Math.round((x.done / x.total) * 100) : 0;
                      return `<button type="button" class="v3-bcol" data-v3="drill-month" data-id="${x.month}" title="Mở đơn tháng ${x.month}"><b>${x.total}</b><div class="v3-btr"><div class="v3-bfill" style="height:${hPct}%"><div class="v3-bdone" style="height:${dPct}%"></div></div></div><small>${x.label}</small></button>`;
                    }).join('')}
                  </div>
                </div>
              </div>
            </section>

            <section class="v3-list-card v3-card-dark" style="flex:1">
              <div class="v3-card-hd">
                <h2>Hoạt động Điều phối & Thông báo hệ thống</h2>
                <button type="button" class="v3-map-bar-btn" data-v3="open-drawer" data-id="audit">Mở nhật ký ↗</button>
              </div>
              ${rSnap.audit.slice(0, 2).map((a) => `<button type="button" class="v3-item-dark" data-v3="open-drawer" data-id="audit"><i class="v3-dot v3-dot-run" style="margin-top:4px"></i><div><strong>${fmtTime(a.at)} · ${esc(a.actor)} (${esc(a.order || '—')})</strong><small>${esc(a.action)} · ${esc(a.before)} → ${esc(a.after)}</small></div></button>`).join('')}
              ${lockAlerts[0] ? `<button type="button" class="v3-item-dark" data-v3="open-drawer" data-id="maintenance"><i class="v3-dot v3-dot-warn" style="margin-top:4px"></i><div><strong>Thông báo từ System Admin · ${esc(lockAlerts[0].id)}</strong><small>${esc(lockAlerts[0].text.slice(0, 88))}</small></div></button>` : ''}
            </section>

            <section class="v3-list-card v3-card-light">
              <div class="v3-card-hd"><h2>Đơn chưa phân xe</h2><span class="v3-prio">Giám sát · ${pending.length} đơn</span></div>
              ${pending.slice(0, 2).map((o) => `<div class="v3-item-light"><span><strong>${esc(o.id)}</strong> · ${esc(o.material)} (${esc(qtyText(o))})</span><small>Chờ Điều phối</small></div>`).join('') || '<div class="v3-item-light"><span>Không có đơn chờ phân xe.</span></div>'}
            </section>
          </div>
        </div>
      </main>

      <footer class="v3-foot">
        <span>Mẫu 3 Quản lý vận hành · Hai tông Đậm–Sáng (Không thanh menu trái) · Dữ liệu mẫu</span>
        <span>Admin giám sát toàn công ty & gửi yêu cầu bảo trì · Không duyệt phân công hay đổi role tài khoản</span>
      </footer>
      ${drawerHtml}
    </div>`;
  }

  function renderAdminDrawer(s, rSnap, gov, tickets) {
    if (st.drawer === 'audit') {
      return `<div class="v3-backdrop" data-v3="close-backdrop">
        <aside class="v3-drawer">
          <div class="v3-drawer-hd">
            <div><h2>Nhật ký vận hành & Hoạt động Điều phối (Chỉ đọc)</h2><p>Mọi thao tác duyệt phân công và hoàn thành thuộc Điều phối viên (Lê Hoàng Nam); không xóa/sửa lịch sử.</p></div>
            <button type="button" class="v3-close" data-v3="close-drawer">×</button>
          </div>
          <div class="v3-card-dark" style="padding:12px 14px;flex:1;display:flex;flex-direction:column;min-height:0">
            <div class="v3-table-wrap"><table class="v3-table">
              <thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Nội dung / Đơn</th><th>Trước → Sau</th><th>Kết quả</th></tr></thead>
              <tbody>${rSnap.audit.map((a) => `<tr><td>${fmtTime(a.at)}</td><td>${esc(a.actor)}</td><td>${esc(a.action)}<small>${esc(a.order || '—')}</small></td><td>${esc(a.before || '—')} → ${esc(a.after || '—')}</td><td><span class="v3-badge v3-b-ok">${esc(a.result)}</span></td></tr>`).join('')}</tbody>
            </table></div>
          </div>
          <div class="v3-card-light" style="padding:11px 14px;font-size:11.5px"><strong>Phạm vi Quản lý vận hành:</strong> Chỉ đọc toàn bộ lịch sử vận hành. Quản lý tài khoản và phân quyền role do System Admin phụ trách.</div>
        </aside>
      </div>`;
    }

    if (st.drawer === 'reports') {
      const m = st.adminMonthFilter;
      const list = s.orders.filter((o) => m === 'all' || o.day.startsWith(m));
      const done = list.filter((o) => o.status === 'completed');
      return `<div class="v3-backdrop" data-v3="close-backdrop">
        <aside class="v3-drawer">
          <div class="v3-drawer-hd">
            <div><h2>Báo cáo tháng & Tra cứu đơn toàn công ty (Chỉ đọc)</h2><p>Drilldown từ biểu đồ 6T/12T · Tách riêng đơn vị viên / kg / m³ · Không có số liệu tài chính.</p></div>
            <div style="display:flex;gap:7px"><button type="button" class="v3-ghost" data-action="export-reports">Xuất CSV</button><button type="button" class="v3-close" data-v3="close-drawer">×</button></div>
          </div>
          <div class="v3-tabs-left">
            <button type="button" class="v3-stab" data-v3="admin-month-filter" data-id="all" aria-pressed="${m === 'all'}">Tất cả (${s.orders.length})</button>
            <button type="button" class="v3-stab" data-v3="admin-month-filter" data-id="2026-11" aria-pressed="${m === '2026-11'}">Tháng 11/2026 (${s.orders.filter((o) => o.day.startsWith('2026-11')).length})</button>
          </div>
          <div class="v3-card-light" style="padding:12px 14px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
            <div style="padding:8px 10px;border-radius:11px;background:var(--v3-light-inner)"><small>Tổng đơn phạm vi</small><strong style="display:block;font-size:19px">${list.length} đơn</strong></div>
            <div style="padding:8px 10px;border-radius:11px;background:var(--v3-light-inner)"><small>Hoàn thành</small><strong style="display:block;font-size:19px">${done.length} đơn</strong></div>
            <div style="padding:8px 10px;border-radius:11px;background:var(--v3-light-inner)"><small>Chưa xong</small><strong style="display:block;font-size:19px">${list.length - done.length} đơn</strong></div>
          </div>
          <div class="v3-card-dark" style="padding:12px 14px;flex:1;display:flex;flex-direction:column;min-height:0">
            <div class="v3-table-wrap"><table class="v3-table">
              <thead><tr><th>Mã đơn / Nhóm khách</th><th>Vật liệu & Đơn vị</th><th>Hành trình</th><th>Trạng thái</th><th>Xe</th></tr></thead>
              <tbody>${list.map((o) => `<tr><td><strong>${esc(o.id)}</strong><small>${esc(o.customerGroup || '')} · ${esc(o.customer)}</small></td><td>${esc(o.material)}<small>${esc(qtyText(o))}</small></td><td>${esc(o.from)} → ${esc(o.to)}</td><td>${statusBadge(o.status)}</td><td>${esc(o.plate || '—')}</td></tr>`).join('')}</tbody>
            </table></div>
          </div>
        </aside>
      </div>`;
    }

    // Bảo trì, thông báo khóa TK khẩn cấp & Ticket chỉ đọc
    const tab = st.drawerTab || 'maint';
    return `<div class="v3-backdrop" data-v3="close-backdrop">
      <aside class="v3-drawer">
        <div class="v3-drawer-hd">
          <div><h2>Bảo trì, Thông báo khóa TK & Hồ sơ Ticket (Chỉ đọc)</h2><p>Gửi phiếu hỗ trợ kỹ thuật sang System Admin, nhận cảnh báo khóa tài khoản khẩn cấp và theo dõi Ticket chỉ đọc.</p></div>
          <div style="display:flex;gap:7px"><button type="button" class="v3-btn" data-gov="maintenance-new">+ Yêu cầu bảo trì</button><button type="button" class="v3-close" data-v3="close-drawer">×</button></div>
        </div>
        <div class="v3-tabs-left">
          <button type="button" class="v3-stab" data-v3="drawer-tab" data-id="maint" aria-pressed="${tab === 'maint'}">Yêu cầu bảo trì & Khóa TK</button>
          <button type="button" class="v3-stab" data-v3="drawer-tab" data-id="tickets" aria-pressed="${tab === 'tickets'}">Hồ sơ Ticket · Chỉ đọc (${tickets.length})</button>
        </div>
        ${
          tab === 'maint'
            ? `<div class="v3-card-dark" style="padding:12px 14px">
                <div class="v3-card-hd" style="margin-bottom:8px"><h2>Phiếu yêu cầu bảo trì gửi System Admin</h2></div>
                <table class="v3-table"><thead><tr><th>Mã</th><th>Đối tượng</th><th>Nội dung</th><th>Trạng thái</th></tr></thead>
                <tbody>${(gov.maintenance || []).map((m) => `<tr><td><strong>${esc(m.id)}</strong></td><td>${esc(m.target)}</td><td>${esc(m.text)}</td><td><span class="v3-badge ${m.status === 'done' ? 'v3-b-ok' : 'v3-b-warn'}">${m.status === 'done' ? 'Đã xử lý' : 'Chờ System Admin'}</span></td></tr>`).join('')}</tbody></table>
              </div>
              <div class="v3-card-light" style="padding:13px 15px;flex:1;overflow:auto;display:flex;flex-direction:column;gap:8px">
                <div class="v3-card-hd"><h2>Thông báo khóa tài khoản khẩn cấp từ System Admin</h2><span class="v3-prio">${(gov.support || []).length} thông báo</span></div>
                ${(gov.support || []).map((n) => `<div class="v3-msg"><strong>${esc(n.id)} · ${fmtTime(n.at)}</strong> — ${esc(n.text)}</div>`).join('') || '<p style="font-size:12px">Chưa có thông báo.</p>'}
              </div>`
            : `<div class="v3-card-light" style="padding:14px 16px;flex:1;overflow:auto;display:flex;flex-direction:column;gap:10px">
                ${tickets.map((t) => `<div style="padding:11px;border-radius:13px;background:var(--v3-light-inner);border:1px solid var(--v3-light-inner-bd)">
                  <div class="v3-card-hd"><strong>${esc(t.code)} · ${t.emergency ? 'KHẨN CẤP 1 NÚT' : esc(t.kind)} (${esc(t.order || '—')} · ${esc(t.plate || '—')})</strong><span class="v3-prio">Chỉ đọc · ${t.status === 'closed' ? 'Đã đóng' : 'Đang mở'}</span></div>
                  <div style="margin-top:6px;display:flex;flex-direction:column;gap:5px">${t.messages.map((m) => `<div style="font-size:11.5px"><b>${esc(m.by)} (${fmtTime(m.at)}):</b> ${esc(m.text)}</div>`).join('')}</div>
                </div>`).join('')}
              </div>`
        }
      </aside>
    </div>`;
  }

  /* ==================== 3. QUẢN TRỊ HỆ THỐNG / SYSTEM ADMIN (MENU TRÁI 5 NHÓM) ==================== */
  const SYS_NAVS = [
    ['health', 'activity', 'Tổng quan hệ thống'],
    ['accounts', 'switch-account', 'Tài khoản & Phân quyền'],
    ['maintenance', 'gear', 'Bảo trì & Tác vụ nền'],
    ['connections', 'layers', 'Kết nối & Sao lưu'],
    ['security', 'alert', 'An ninh & Nhật ký'],
  ];

  function runSafeConsole(raw) {
    const cmd = String(raw || '').trim().toLowerCase();
    if (!cmd) return;
    if (cmd === 'clear') { st.consoleLines = ['Đã dọn màn hình console (chỉ đọc).']; return; }
    const s = api.snapshot(), rSnap = roles.snapshot(), gov = govApi?.snapshot ? govApi.snapshot() : { jobs: [], recovery: [], maintenance: [] };
    let out = 'Lệnh không thuộc danh sách cho phép. Gõ help để xem bộ lệnh text-only.';
    if (cmd === 'help') out = 'Bộ lệnh cho phép (chỉ đọc, không OS shell):\n- health system\n- health gps\n- health accounts\n- health jobs\n- clear';
    else if (cmd === 'health system') out = `[SYSTEM] Tài khoản hoạt động: ${rSnap.users.filter((u) => !u.deleted && u.active).length}/${rSnap.users.length} | Tác vụ lỗi: ${gov.jobs.filter((j) => j.status === 'failed').length} | Khôi phục chờ: ${gov.recovery.filter((r) => r.status === 'pending').length}`;
    else if (cmd === 'health gps') out = `[GPS TARIS] Tín hiệu tốt: ${s.vehicles.filter((v) => v.gps === 'fresh').length} | Cũ: ${s.vehicles.filter((v) => v.gps === 'stale').length} | Mất: ${s.vehicles.filter((v) => v.gps === 'offline').length} (Chu kỳ 10 phút · Chưa nối API thật)`;
    else if (cmd === 'health accounts') out = `[ACCOUNTS] Tổng: ${rSnap.users.length} | Mật khẩu tạm: ${rSnap.users.filter((u) => u.mustChangePassword).length} | Passkey quản trị: ${rSnap.users.filter((u) => u.authMethod === 'Passkey').length}`;
    else if (cmd === 'health jobs') out = `[JOBS] ${gov.jobs.map((j) => `${j.id}: ${j.status} (${j.attempts} lần thử)`).join('; ')}`;
    st.consoleLines.push(`$ ${cmd}\n${out}`);
    st.consoleLines = st.consoleLines.slice(-14);
  }

  function renderSystemAdmin() {
    const s = api.snapshot(), rSnap = roles.snapshot();
    const gov = govApi?.snapshot ? govApi.snapshot() : { changes: [], recovery: [], maintenance: [], jobs: [], supportGrants: [] };
    const activeUsers = rSnap.users.filter((u) => !u.deleted && u.active);
    const pendingRec = (gov.recovery || []).filter((r) => r.status === 'pending');
    const failedJobs = (gov.jobs || []).filter((j) => j.status === 'failed');
    const pendingMaint = (gov.maintenance || []).filter((m) => m.status === 'approved');
    const curTitle = SYS_NAVS.find(([id]) => id === st.sysNav)?.[2] || 'Tổng quan hệ thống';

    let mainBody = '';

    if (st.sysNav === 'health') {
      mainBody = `<section class="v3-kpi-row">
        <button type="button" class="v3-kpi v3-card-light" data-v3="sys-nav" data-id="accounts"><div><div class="v3-kpi-lbl">Tài khoản hoạt động</div><div class="v3-kpi-sub">4 vai trò cố định</div></div><div class="v3-kpi-val">${String(activeUsers.length).padStart(2, '0')}</div></button>
        <button type="button" class="v3-kpi v3-card-dark" data-v3="sys-nav" data-id="accounts" data-tab="recovery"><div><div class="v3-kpi-lbl">Khôi phục TK / MK</div><div class="v3-kpi-sub">Quên mật khẩu / tên TK</div></div><div class="v3-kpi-val">${String(pendingRec.length).padStart(2, '0')}</div></button>
        <button type="button" class="v3-kpi v3-card-light" data-v3="sys-nav" data-id="maintenance"><div><div class="v3-kpi-lbl">Tác vụ nền lỗi</div><div class="v3-kpi-sub">JOB-017 · Đồng bộ GPS</div></div><div class="v3-kpi-val">${String(failedJobs.length).padStart(2, '0')}</div></button>
        <button type="button" class="v3-kpi v3-card-dark" data-v3="sys-nav" data-id="maintenance"><div><div class="v3-kpi-lbl">Phiếu bảo trì</div><div class="v3-kpi-sub">Từ Quản lý vận hành</div></div><div class="v3-kpi-val">${String(pendingMaint.length).padStart(2, '0')}</div></button>
      </section>
      <div class="v3-main-grid">
        <div class="v3-left-col">
          <section class="v3-map-card v3-card-dark">
            <div class="v3-card-hd"><h2>Giám sát kết nối & hạ tầng</h2><small>4 thành phần cốt lõi · Chưa nối API thật</small></div>
            <div class="v3-infra-grid">
              <button type="button" class="v3-node" data-v3="sys-nav" data-id="connections"><div class="v3-card-hd"><span class="v3-badge v3-b-run">GPS Taris API</span><small>Chu kỳ 10p</small></div><div class="v3-node-sub">Ghép biển số ↔ IMEI · Tối đa 1 lần/10 phút tránh lỗi 429</div><div class="v3-node-foot"><span>${s.vehicles.length} xe đã ghép IMEI mẫu</span><span>Kết nối ↗</span></div></button>
              <button type="button" class="v3-node" data-v3="sys-nav" data-id="connections" data-tab="backup"><div class="v3-card-hd"><span class="v3-badge v3-b-ok">MongoDB chính</span><small>Dữ liệu mẫu</small></div><div class="v3-node-sub">Đơn hàng, chuyến xe, ticket và nhật ký hệ thống bất biến</div><div class="v3-node-foot"><span>Khôi phục toàn DB → Dev</span><span>Sao lưu ↗</span></div></button>
              <button type="button" class="v3-node" data-v3="sys-nav" data-id="security"><div class="v3-card-hd"><span class="v3-badge v3-b-ok">Cloudflare Tunnel</span><small>Zero Trust</small></div><div class="v3-node-sub">Đóng port inbound · Bảo vệ lớp truy cập web & API nội bộ</div><div class="v3-node-foot"><span>Đã chốt · Chưa cấu hình</span><span>An ninh ↗</span></div></button>
              <button type="button" class="v3-node" data-v3="sys-nav" data-id="maintenance" data-tab="controls"><div class="v3-card-hd"><span class="v3-badge v3-b-warn">AI Đề xuất V1</span><small>Điều phối duyệt</small></div><div class="v3-node-sub">Công bằng việc tháng trước, tuyến sau · Không tự phân công</div><div class="v3-node-foot"><span>Tác vụ lỗi mẫu: ${failedJobs.length}</span><span>Điều khiển ↗</span></div></button>
            </div>
          </section>
          <section class="v3-dock-row">
            <button type="button" class="v3-dock v3-card-light" data-v3="sys-nav" data-id="accounts"><span class="v3-dock-ico">${ico('switch-account')}</span><div class="v3-dock-txt"><strong>Tài khoản & Role</strong><small>${activeUsers.length} mở · ${pendingRec.length} khôi phục</small></div></button>
            <button type="button" class="v3-dock v3-card-dark" data-v3="sys-nav" data-id="maintenance"><span class="v3-dock-ico">${ico('gear')}</span><div class="v3-dock-txt"><strong>Bảo trì & Dữ liệu</strong><small>JOB-017 · Quyền hỗ trợ</small></div></button>
            <button type="button" class="v3-dock v3-card-light" data-v3="sys-nav" data-id="connections"><span class="v3-dock-ico">${ico('layers')}</span><div class="v3-dock-txt"><strong>Taris IMEI & Backup</strong><small>API 10p · Sao lưu</small></div></button>
            <button type="button" class="v3-dock v3-card-dark" data-v3="sys-nav" data-id="security"><span class="v3-dock-ico">${ico('alert')}</span><div class="v3-dock-txt"><strong>An ninh & Console</strong><small>Log chỉ đọc · Text-only</small></div></button>
          </section>
        </div>
        <div class="v3-right-col">
          <section class="v3-quick v3-card-light">
            <div class="v3-card-hd"><h2>Hỗ trợ & Tác vụ cần xử lý</h2><span class="v3-prio">${failedJobs.length + pendingMaint.length} việc mở</span></div>
            ${failedJobs[0] ? `<div class="v3-order-box"><div class="v3-order-top"><strong>${esc(failedJobs[0].id)} · Đồng bộ GPS</strong><span class="v3-prio">Lỗi mẫu</span></div><p>${esc(failedJobs[0].name)}</p></div>` : '<div class="v3-order-box"><strong>Không có tác vụ nền lỗi</strong><p>Tất cả job mẫu đã được xử lý.</p></div>'}
            ${pendingMaint[0] ? `<div class="v3-order-box"><div class="v3-order-top"><strong>${esc(pendingMaint[0].id)} · ${esc(pendingMaint[0].target)}</strong><span class="v3-prio">Từ Admin</span></div><p>${esc(pendingMaint[0].text)}</p></div>` : ''}
            <div class="v3-cta-row">
              <button type="button" class="v3-cta-main" data-gov="retry" data-id="${esc(failedJobs[0]?.id || 'JOB-017')}" ${failedJobs.length ? '' : 'disabled'}>Thử lại JOB-017 →</button>
              <button type="button" class="v3-cta-sec" data-v3="sys-nav" data-id="maintenance">Mở Bảo trì</button>
            </div>
          </section>
          <section class="v3-list-card v3-card-dark" style="flex:1">
            <div class="v3-card-hd"><h2>Nhật ký hệ thống gần đây</h2><small>Chỉ đọc</small></div>
            ${rSnap.system.slice(0, 3).map((l) => `<div class="v3-item-dark"><div><strong>${fmtTime(l.at)} · ${esc(l.action)} (${esc(l.actor)})</strong><small>${esc(l.before)} → ${esc(l.after)}</small></div></div>`).join('')}
          </section>
          <section class="v3-list-card v3-card-light" style="flex-direction:row;align-items:center;justify-content:space-between">
            <div><strong style="font-size:12.5px">Hàng chờ khôi phục TK / MK · ${String(pendingRec.length).padStart(2, '0')}</strong><div style="font-size:11px;opacity:.72">Xác minh trực tiếp / SĐT hồ sơ → Cấp mã 1 lần</div></div>
            <button type="button" class="v3-btn" data-v3="sys-nav" data-id="accounts" data-tab="recovery">Xử lý →</button>
          </section>
        </div>
      </div>`;
    } else if (st.sysNav === 'accounts') {
      const tab = st.sysTab === 'recovery' ? 'recovery' : st.sysTab === 'admin-gate' ? 'admin-gate' : 'main';
      mainBody = `<div class="v3-sub-tabs"><div class="v3-tabs-left">
        <button type="button" class="v3-stab" data-v3="sys-tab" data-id="main" aria-pressed="${tab === 'main'}">Danh sách & Đổi role (${rSnap.users.filter((u) => !u.deleted).length})</button>
        <button type="button" class="v3-stab" data-v3="sys-tab" data-id="recovery" aria-pressed="${tab === 'recovery'}">Hàng chờ quên TK / MK (${pendingRec.length})</button>
        <button type="button" class="v3-stab" data-v3="sys-tab" data-id="admin-gate" aria-pressed="${tab === 'admin-gate'}">Cổng duyệt role quản trị (${gov.changes.length})</button>
      </div><button type="button" class="v3-btn" data-gov="provision">+ Cấp tài khoản thường</button></div>` +
        (tab === 'main'
          ? `<section class="v3-card-dark" style="padding:13px 15px;flex:1;display:flex;flex-direction:column;min-height:0">
              <div class="v3-table-wrap"><table class="v3-table">
                <thead><tr><th>Họ tên & Tài khoản</th><th>Vai trò</th><th>Xác thực / Mật khẩu</th><th>Trạng thái</th><th>Thao tác quản trị</th></tr></thead>
                <tbody>${rSnap.users.filter((u) => !u.deleted).map((u) => `<tr>
                  <td><strong>${esc(u.name)}</strong><small>${esc(u.username || u.id)}</small></td>
                  <td>${esc(({ driver: 'Tài xế', dispatch: 'Điều phối', admin: 'Quản lý vận hành', admin_system: 'Quản trị hệ thống' })[u.role])}</td>
                  <td>${esc(u.authMethod || 'Mật khẩu')}${u.mustChangePassword ? '<small style="color:#dcc292">Mật khẩu tạm · Bắt buộc đổi</small>' : ''}</td>
                  <td><span class="v3-badge ${u.active ? 'v3-b-ok' : 'v3-b-err'}">${u.active ? 'Hoạt động' : 'Đã khóa'}</span></td>
                  <td>${u.id !== 'U4' ? `<div style="display:flex;gap:5px;flex-wrap:wrap"><button type="button" class="v3-tbtn hi" data-gov="role-request" data-id="${esc(u.id)}">Đổi role</button><button type="button" class="v3-tbtn" data-gov="reset" data-id="${esc(u.id)}">Cấp lại MK</button><button type="button" class="v3-tbtn" data-gov="lock" data-id="${esc(u.id)}">${u.active ? 'Khóa khẩn cấp' : 'Mở khóa'}</button><button type="button" class="v3-tbtn" data-gov="revoke" data-id="${esc(u.id)}">Thu hồi phiên</button></div>` : '<small>Phiên hiện tại · Không tự khóa</small>'}</td>
                </tr>`).join('')}</tbody>
              </table></div>
            </section>
            <section class="v3-card-light" style="padding:11px 15px;font-size:11.5px"><strong>Phân quyền 4 vai trò cố định:</strong> System Admin trực tiếp đổi role thường (Tài xế ↔ Điều phối) kèm nhật ký trước→sau. Cấp/nâng lên <b>Admin / System Admin</b> bắt buộc qua Cổng duyệt người công ty chỉ định (cấm tự duyệt).</section>`
          : tab === 'recovery'
          ? `<section class="v3-card-light" style="padding:14px 16px;flex:1;overflow:auto;display:flex;flex-direction:column;gap:10px">
              <div class="v3-card-hd"><h2>Hàng chờ khôi phục quên tên tài khoản & quên mật khẩu (Flow 13)</h2><span class="v3-prio">${pendingRec.length} chờ xác minh</span></div>
              ${(gov.recovery || []).map((r) => `<div style="padding:11px 13px;border-radius:13px;background:var(--v3-light-inner);border:1px solid var(--v3-light-inner-bd);display:flex;justify-content:space-between;align-items:center;gap:12px">
                <div><strong>${esc(r.id)} · ${r.kind === 'username' ? 'Quên tên tài khoản' : 'Quên mật khẩu'} · ${esc(r.target)}</strong><div style="font-size:11px;opacity:.75;margin-top:2px">Nguồn: ${esc(r.submittedBy)} · ${esc(r.note)}</div>${r.result ? `<div style="font-size:11px;margin-top:3px"><b>Kết quả:</b> ${esc(r.result)}</div>` : ''}</div>
                <div style="display:flex;gap:6px;flex-shrink:0">${r.status === 'pending' ? `<button type="button" class="v3-btn" data-gov="recovery-approve" data-id="${esc(r.id)}">${r.kind === 'username' ? 'Xác minh & bàn giao tên' : 'Xác minh & cấp mã 1 lần'}</button><button type="button" class="v3-cta-sec" style="height:34px" data-gov="recovery-reject" data-id="${esc(r.id)}">Từ chối</button>` : `<span class="v3-prio">${r.status === 'done' ? 'Đã xử lý' : 'Từ chối'}</span>`}</div>
              </div>`).join('')}
            </section>`
          : `<section class="v3-card-dark" style="padding:14px 16px;flex:1;overflow:auto;display:flex;flex-direction:column;gap:10px">
              <div class="v3-card-hd"><h2>Cổng phê duyệt role quản trị (Admin / System Admin)</h2><span class="v3-badge v3-b-warn">Cấm tự duyệt / tự nâng quyền</span></div>
              ${(gov.changes || []).map((c) => `<div class="v3-item-dark"><div><strong>${esc(c.id)} · ${esc(c.name)} (${esc(c.before)} → ${esc(c.after)})</strong><small>${esc(c.reason)} · ${esc(c.result)}</small></div></div>`).join('') || '<p>Chưa có hồ sơ chờ duyệt quản trị.</p>'}
            </section>`);
    } else if (st.sysNav === 'maintenance') {
      const tab = ['data', 'controls', 'grants'].includes(st.sysTab) ? st.sysTab : 'main';
      mainBody = `<div class="v3-sub-tabs"><div class="v3-tabs-left">
        <button type="button" class="v3-stab" data-v3="sys-tab" data-id="main" aria-pressed="${tab === 'main'}">Phiếu từ Admin & Tác vụ nền</button>
        <button type="button" class="v3-stab" data-v3="sys-tab" data-id="data" aria-pressed="${tab === 'data'}">Kiểm tra dữ liệu</button>
        <button type="button" class="v3-stab" data-v3="sys-tab" data-id="controls" aria-pressed="${tab === 'controls'}">Điều khiển chức năng</button>
        <button type="button" class="v3-stab" data-v3="sys-tab" data-id="grants" aria-pressed="${tab === 'grants'}">Quyền hỗ trợ có ghi nhận</button>
      </div></div>` +
        (tab === 'main'
          ? `<section class="v3-card-dark" style="padding:13px 15px;flex:1;overflow:auto">
              <div class="v3-card-hd" style="margin-bottom:8px"><h2>Yêu cầu bảo trì từ Quản lý vận hành</h2></div>
              <table class="v3-table"><thead><tr><th>Mã</th><th>Đối tượng</th><th>Nội dung</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
              <tbody>${(gov.maintenance || []).map((m) => `<tr><td><strong>${esc(m.id)}</strong></td><td>${esc(m.target)}</td><td>${esc(m.text)}</td><td><span class="v3-badge ${m.status === 'done' ? 'v3-b-ok' : 'v3-b-warn'}">${m.status === 'done' ? 'Đã xử lý' : 'Chờ xử lý'}</span></td><td>${m.status === 'approved' ? `<button type="button" class="v3-tbtn hi" data-gov="maintain" data-id="${esc(m.id)}">Thực hiện</button>` : '—'}</td></tr>`).join('')}</tbody></table>
            </section>
            <section class="v3-card-light" style="padding:13px 15px;display:flex;justify-content:space-between;align-items:center">
              <div><strong>${esc(gov.jobs[0]?.id || 'JOB-017')} · ${esc(gov.jobs[0]?.name || 'Đồng bộ GPS')}</strong><div style="font-size:11px;opacity:.75">Trạng thái: ${gov.jobs[0]?.status === 'failed' ? 'Lỗi mẫu' : 'Đã thử lại mẫu'} · Lỗi code/DB chuyển người phát triển.</div></div>
              ${gov.jobs[0]?.status === 'failed' ? `<button type="button" class="v3-btn" data-gov="retry" data-id="${esc(gov.jobs[0].id)}">Thử lại tác vụ lỗi →</button>` : '<span class="v3-prio">Đã thử lại</span>'}
            </section>`
          : tab === 'data'
          ? `<section class="v3-card-dark" style="padding:14px 16px;flex:1">
              <div class="v3-card-hd" style="margin-bottom:10px"><h2>Kiểm tra tính nhất quán dữ liệu (Mẫu)</h2><span class="v3-badge v3-b-ok">0 xung đột xe trùng</span></div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
                <div class="v3-node"><strong>Đơn hàng & Đơn vị</strong><div class="v3-node-sub">${s.orders.length} đơn hợp lệ (viên/kg/m³), 0 đơn vượt 100 km</div></div>
                <div class="v3-node"><strong>Xe & IMEI Taris</strong><div class="v3-node-sub">${s.vehicles.filter((v) => v.imei).length}/${s.vehicles.length} xe đã ánh xạ IMEI mẫu</div></div>
                <div class="v3-node"><strong>Bất biến 1 xe 1 đơn</strong><div class="v3-node-sub">Đạt trên dữ liệu mẫu (cần khóa nguyên tử trên MongoDB thật)</div></div>
              </div>
            </section>`
          : tab === 'controls'
          ? `<section class="v3-card-light" style="padding:14px 16px;flex:1;display:flex;flex-direction:column;gap:10px">
              <div class="v3-card-hd"><h2>Điều khiển chức năng vận hành (Có ghi nhận nhật ký)</h2></div>
              ${[
                ['aiV1', 'AI Đề xuất V1 (Điều phối duyệt)', 'Bật/tắt gợi ý xe V1. Không mở tự động phân công V2 khi chưa chốt.'],
                ['gpsSync', 'Worker đồng bộ GPS Taris (chu kỳ 10 phút)', 'Tối đa 1 lần gọi / 10 phút dùng chung toàn hệ thống.'],
                ['sheetsExport', 'Xuất báo cáo CSV / Google Sheets', 'Phục vụ trao đổi & báo cáo, không thay cơ sở dữ liệu MongoDB.'],
              ]
                .map(([k, lbl, sub]) => `<div style="padding:11px 13px;border-radius:12px;background:var(--v3-light-inner);display:flex;justify-content:space-between;align-items:center"><div><strong>${lbl}</strong><div style="font-size:11px;opacity:.75">${sub}</div></div><button type="button" class="${st.flags[k] ? 'v3-btn' : 'v3-cta-sec'}" data-v3="toggle-flag" data-id="${k}">${st.flags[k] ? 'Đang bật' : 'Đang tắt'}</button></div>`)
                .join('')}
            </section>`
          : `<section class="v3-card-dark" style="padding:14px 16px;flex:1;display:flex;flex-direction:column;gap:10px">
              <div class="v3-card-hd"><h2>Cổng cấp quyền hỗ trợ có ghi nhận (Flow 11/12)</h2><button type="button" class="v3-tbtn hi" data-gov="support-grant">+ Ghi nhận phạm vi hỗ trợ</button></div>
              ${(gov.supportGrants || []).map((g) => `<div class="v3-item-dark"><div><strong>${esc(g.id)} · ${esc(g.scope)}</strong><small>${esc(g.reason)} · ${fmtTime(g.at)}</small></div></div>`).join('')}
            </section>`);
    } else if (st.sysNav === 'connections') {
      const tab = st.sysTab === 'backup' ? 'backup' : 'main';
      mainBody = `<div class="v3-sub-tabs"><div class="v3-tabs-left">
        <button type="button" class="v3-stab" data-v3="sys-tab" data-id="main" aria-pressed="${tab === 'main'}">Ghép biển số ↔ IMEI Taris (10p)</button>
        <button type="button" class="v3-stab" data-v3="sys-tab" data-id="backup" aria-pressed="${tab === 'backup'}">Sao lưu & Chẩn đoán</button>
      </div></div>` +
        (tab === 'main'
          ? `<section class="v3-card-dark" style="padding:13px 15px;flex:1;display:flex;flex-direction:column;min-height:0">
              <div class="v3-table-wrap"><table class="v3-table">
                <thead><tr><th>Biển số</th><th>Loại xe</th><th>IMEI GPS Taris</th><th>Tín hiệu mẫu</th><th>Thao tác</th></tr></thead>
                <tbody>${s.vehicles.map((v) => `<tr><td><strong>${esc(v.plate)}</strong></td><td>${esc(v.type)}</td><td><code>${esc(v.imei || 'Chưa ghép')}</code></td><td><span class="v3-badge ${v.gps === 'fresh' ? 'v3-b-ok' : v.gps === 'stale' ? 'v3-b-warn' : 'v3-b-err'}">${esc(v.gps)}</span></td><td><div style="display:flex;gap:6px"><button type="button" class="v3-tbtn hi" data-gov="edit-imei" data-id="${esc(v.plate)}">Sửa IMEI</button><button type="button" class="v3-tbtn" data-gov="gps" data-id="${esc(v.plate)}">Kiểm tra API</button></div></td></tr>`).join('')}</tbody>
              </table></div>
            </section>`
          : `<section class="v3-card-light" style="padding:15px 17px;flex:1;display:flex;flex-direction:column;gap:10px">
              <div class="v3-card-hd"><h2>Sao lưu định kỳ & Chẩn đoán hệ thống</h2><span class="v3-prio">Chưa nối cloud thật</span></div>
              <div class="v3-order-box"><strong>Chính sách sao lưu</strong><p>Backup khác vùng phục vụ phục hồi thảm họa (không phải hot standby). RTO/RPO và lịch backup thực tế cần chốt trước production.</p></div>
              <div class="v3-order-box"><strong>Ranh giới thao tác System Admin</strong><p>Không có UI sửa trực tiếp DB hay khôi phục toàn hệ thống; các sự cố mã nguồn hoặc khôi phục toàn DB chuyển người phát triển.</p></div>
            </section>`);
    } else {
      const tab = st.sysTab === 'console' ? 'console' : 'main';
      mainBody = `<div class="v3-sub-tabs"><div class="v3-tabs-left">
        <button type="button" class="v3-stab" data-v3="sys-tab" data-id="main" aria-pressed="${tab === 'main'}">Cảnh báo an ninh & Nhật ký chỉ đọc</button>
        <button type="button" class="v3-stab" data-v3="sys-tab" data-id="console" aria-pressed="${tab === 'console'}">Kiểm tra trạng thái (text-only)</button>
      </div></div>` +
        (tab === 'main'
          ? `<section class="v3-card-dark" style="padding:13px 15px;flex:1;display:flex;flex-direction:column;min-height:0">
              <div class="v3-table-wrap"><table class="v3-table">
                <thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Nội dung / Mã phiếu</th><th>Trước → Sau</th><th>Kết quả</th></tr></thead>
                <tbody>${rSnap.system.map((l) => `<tr><td>${fmtTime(l.at)}</td><td>${esc(l.actor)}</td><td>${esc(l.action)}<small>${esc(l.request || '—')}</small></td><td>${esc(l.before)} → ${esc(l.after)}</td><td><span class="v3-badge v3-b-ok">${esc(l.result || 'Đã ghi nhận')}</span></td></tr>`).join('')}</tbody>
              </table></div>
            </section>
            <section class="v3-card-light" style="padding:12px 15px;font-size:11.5px"><strong>Cảnh báo cần đối chiếu:</strong> 3 lần sai mật khẩu liên tiếp trên tài khoản mẫu <b>binh.tx</b> (đã khớp yêu cầu KP-001). Không tự kết luận bị tấn công; lỗi GPS không tự là tấn công.</section>`
          : `<section class="v3-card-dark" style="padding:14px 16px;flex:1;display:flex;flex-direction:column;min-height:0">
              <div class="v3-card-hd" style="margin-bottom:8px"><h2>Console kiểm tra trạng thái (Text-only · Không OS shell)</h2><div style="display:flex;gap:5px">${['health system', 'health gps', 'health accounts', 'health jobs'].map((c) => `<button type="button" class="v3-tbtn" data-v3="run-cmd" data-id="${c}">${c}</button>`).join('')}</div></div>
              <div class="v3-console-out">${esc(st.consoleLines.join('\n\n'))}</div>
              <form data-v3-console-form class="v3-console-form"><input name="cmd" placeholder="Gõ lệnh cho phép (VD: health gps, help, clear)…" autocomplete="off"><button type="submit" class="v3-tbtn hi">Chạy lệnh ↵</button></form>
            </section>`);
    }

    return `<aside class="v3-sidebar" aria-label="Điều hướng Quản trị hệ thống">
      <div class="v3-sb-brand"><span class="hs-brand-mark" aria-hidden="true"></span><span>Fleet Autopilot</span></div>
      <nav class="v3-sb-nav">
        ${SYS_NAVS.map(([id, ic, lbl]) => `<button type="button" class="v3-sb-btn" data-v3="sys-nav" data-id="${id}" title="${lbl}" ${st.sysNav === id ? 'aria-current="page"' : ''}>${ico(ic)}<span>${lbl}</span></button>`).join('')}
      </nav>
      <div class="v3-sb-foot">Quản trị hệ thống · 5 nhóm<br>Passkey bắt buộc · Chỉ đọc log</div>
    </aside>
    <div class="v3-shell">
      <header class="v3-topbar">
        <div class="v3-tb-left">
          <strong style="font-size:14.5px;white-space:nowrap">${esc(curTitle)}</strong>
          <div class="v3-pill-group">${stylePillsHtml()}</div>
        </div>
        <div class="v3-tb-right">
          <div class="v3-pill-group">${themePillsHtml()}</div>
          <button type="button" class="v3-ghost" data-workflow-action="login">Passkey</button>
          <button type="button" class="v3-btn" data-gov="provision">+ Cấp tài khoản</button>
          ${roleSelectHtml('admin_system')}
        </div>
      </header>
      <main class="v3-content">${mainBody}</main>
      <footer class="v3-foot">
        <span>Mẫu 3 Quản trị hệ thống (Menu trái 5 nhóm + Khung con Đậm–Sáng) · Dữ liệu mẫu</span>
        <span>Chuẩn hệ thống (không Terminal Kali) · Không xóa/sửa log · Lỗi DB/code chuyển người phát triển</span>
      </footer>
    </div>`;
  }

  function render() {
    const active = isActiveV3();
    document.body.classList.toggle('ui-v3', active);
    root.hidden = !active;
    if (!active) return;

    const r = roles.role();
    if (r === 'dispatch') root.innerHTML = renderDispatch();
    else if (r === 'admin') root.innerHTML = renderAdmin();
    else if (r === 'admin_system') root.innerHTML = renderSystemAdmin();
  }

  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-v3]');
    if (!el) return;
    const act = el.dataset.v3, id = el.dataset.id || '', tab = el.dataset.tab || '';
    if (act === 'close-backdrop' && e.target !== el) return;
    if (act === 'close-backdrop' || act === 'close-drawer') {
      st.drawer = '';
      render();
      if (st.lastTriggerSelector) {
        root.querySelector(st.lastTriggerSelector)?.focus({ preventScroll: true });
        st.lastTriggerSelector = '';
      }
      return;
    }
    if (act === 'style') { window.FleetUIStyle?.set(id); if (id === 'v1') api.render(); render(); return; }
    if (act === 'theme') {
      const sel = $('#theme-select');
      syncThemePills(id);
      if (sel) { sel.value = id; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      requestAnimationFrame(() => syncThemePills(id));
      return;
    }
    if (act === 'map-filter') { st.mapFilter = id; render(); return; }
    if (act === 'zoom-in') { st.mapZoom = Math.min(1.5, +(st.mapZoom + 0.15).toFixed(2)); render(); return; }
    if (act === 'zoom-out') { st.mapZoom = Math.max(1, +(st.mapZoom - 0.15).toFixed(2)); render(); return; }
    if (act === 'pick-map-veh') { st.selectedPlate = id; render(); return; }
    if (act === 'open-drawer') {
      st.lastTriggerSelector = `[data-v3="open-drawer"][data-id="${CSS.escape(id)}"]${tab ? `[data-tab="${CSS.escape(tab)}"]` : ''}`;
      st.drawer = id;
      if (tab) { if (id === 'orders') st.orderTab = tab; else st.drawerTab = tab; }
      render();
      root.querySelector('.v3-close')?.focus({ preventScroll: true });
      return;
    }
    if (act === 'drawer-tab') { st.drawerTab = id; render(); return; }
    if (act === 'order-tab') { st.orderTab = id; render(); return; }
    if (act === 'select-ticket') { st.ticketId = id; render(); return; }
    if (act === 'open-ticket') { st.drawer = 'fleet'; st.drawerTab = 'tickets'; st.ticketId = id; render(); return; }
    if (act === 'focus-order' || act === 'focus-order-close') {
      const picker = $('#dispatch-order');
      if (picker && [...picker.options].some((o) => o.value === id)) { picker.value = id; picker.dispatchEvent(new Event('change', { bubbles: true })); }
      if (act === 'focus-order-close') st.drawer = '';
      render();
      return;
    }
    if (act === 'pick-cand') {
      const s = api.snapshot();
      s.selectedVehicle = id;
      document.querySelector(`.vehicle[data-vehicle="${CSS.escape(id)}"]`)?.click();
      render();
      return;
    }
    if (act === 'ai-suggest') { $('#suggest')?.click(); setTimeout(render, 20); return; }
    if (act === 'quick-assign') { $('#assign')?.click(); return; }
    if (act === 'admin-months') { st.adminMonths = id === '12' ? 12 : 6; render(); return; }
    if (act === 'drill-month') { st.adminMonthFilter = id; st.drawer = 'reports'; render(); return; }
    if (act === 'admin-month-filter') { st.adminMonthFilter = id; render(); return; }
    if (act === 'sys-nav') { st.sysNav = id; st.sysTab = tab || 'main'; render(); return; }
    if (act === 'sys-tab') { st.sysTab = id; render(); return; }
    if (act === 'toggle-flag') { st.flags[id] = !st.flags[id]; govApi?.log?.('Điều khiển chức năng mẫu', id, st.flags[id] ? 'Bật' : 'Tắt', id); render(); return; }
    if (act === 'run-cmd') { runSafeConsole(id); render(); return; }
  });

  root.addEventListener('change', (e) => {
    if (e.target.matches('[data-v3-role]')) {
      st.drawer = '';
      roles.setRole?.(e.target.value);
      render();
    }
  });

  root.addEventListener('input', (e) => {
    if (e.target.matches('[data-v3-search]')) {
      st.search = e.target.value;
      const pos = e.target.selectionStart;
      render();
      const inp = root.querySelector('[data-v3-search]');
      if (inp) { inp.focus({ preventScroll: true }); if (pos !== null) inp.setSelectionRange(pos, pos); }
    }
  });

  root.addEventListener('submit', (e) => {
    if (e.target.matches('[data-v3-ticket-form]')) {
      e.preventDefault();
      const tId = e.target.dataset.v3TicketForm;
      const msg = e.target.msg?.value;
      if (wfApi?.sendMessage?.(tId, msg)) render();
    }
    if (e.target.matches('[data-v3-console-form]')) {
      e.preventDefault();
      runSafeConsole(e.target.cmd?.value);
      render();
    }
  });

  // Hỗ trợ phím Escape đóng ngăn kéo Mẫu 3 và trả focus về nút đã mở (theo chuẩn WCAG 2.2)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && st.drawer && isActiveV3() && !$('#modal')?.open) {
      e.preventDefault();
      st.drawer = '';
      render();
      if (st.lastTriggerSelector) {
        root.querySelector(st.lastTriggerSelector)?.focus({ preventScroll: true });
        st.lastTriggerSelector = '';
      }
    }
  });

  // Đồng bộ nút chọn nền Mẫu 3 mỗi khi data-theme trên <html> thay đổi (kể cả khi đổi từ URL/popstate/motion.js)
  new MutationObserver(() => syncThemePills()).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  window.addEventListener('fleet:ui-style', () => { st.drawer = ''; requestAnimationFrame(render); });
  window.addEventListener('fleet:role-render', () => requestAnimationFrame(render));
  window.addEventListener('fleet:render', () => requestAnimationFrame(render));
  window.addEventListener('fleet:commit', () => requestAnimationFrame(render));
  window.addEventListener('resize', () => requestAnimationFrame(render));

  render();
})();
