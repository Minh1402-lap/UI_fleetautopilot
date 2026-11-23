/* Mẫu 2 (Spatial UI kính phân tầng đậm-nhạt) cho UI thử nghiệm Fleet Autopilot.
 * Trách nhiệm:
 * - Thêm nút chuyển "Mẫu 1 / Mẫu 2" trên thanh đầu trang (ẩn với Tài xế và màn hình <760px).
 * - Khi bật Mẫu 2, dựng dashboard Bento gộp gọn, không trùng lặp các trang với nhau cho 3 vai trò:
 *   Điều phối, Quản lý vận hành (Admin), Quản trị hệ thống (System Admin).
 * - Đọc dữ liệu dùng chung từ FleetPreview / FleetRoles / workflow / governance;
 *   mọi thao tác điều hướng, tạo đơn, kiểm tra chuyến, duyệt phân công đều nối thẳng về handler thật.
 * - Không sửa hoặc ghi đè hành vi Mẫu 1; tắt về Mẫu 1 khôi phục nguyên trạng 100%. */
(() => {
  'use strict';

  const api = window.FleetPreview;
  const roles = window.FleetRoles;
  if (!api || !roles) return;

  const $ = (s) => document.querySelector(s);
  const esc = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (name) => `<svg aria-hidden="true"><use href="#${name}"/></svg>`;

  const STYLE_KEY = 'fleet-ui-style-v1';
  const WF_KEY = 'fleet-autopilot-workflow-v2';
  const GOV_KEY = 'fleet-autopilot-governance-v2';
  const qtyText = (o) => (api.qtyText ? api.qtyText(o) : `${o?.quantity || 0} ${o?.unit || 'm³'}`);

  let uiStyle = readInitialStyle();
  let mapZoom = 1;
  let adminChartMonths = 6;
  let selectedAdminMonth = '';
  let selectedVehiclePlate = '';

  function readInitialStyle() {
    const param = new URLSearchParams(location.search).get('ui');
    if (param === 'v1' || param === 'v2' || param === 'v3') return param;
    try {
      const saved = localStorage.getItem(STYLE_KEY);
      if (saved === 'v1' || saved === 'v2' || saved === 'v3') return saved;
    } catch {}
    return 'v2';
  }

  function saveStyle(next) {
    uiStyle = next === 'v3' ? 'v3' : next === 'v2' ? 'v2' : 'v1';
    try {
      localStorage.setItem(STYLE_KEY, uiStyle);
    } catch {}
    const url = new URL(location.href);
    if (uiStyle !== 'v1') url.searchParams.set('ui', uiStyle);
    else url.searchParams.delete('ui');
    history.replaceState(null, '', url);
    window.dispatchEvent(new CustomEvent('fleet:ui-style', { detail: { style: uiStyle } }));
  }

  function readJson(key, fallback) {
    try {
      const raw = JSON.parse(localStorage.getItem(key));
      return raw || fallback;
    } catch {
      return fallback;
    }
  }

  // Đọc danh sách ticket dùng chung (ưu tiên nguồn sống từ FleetWorkflow để không bị 0 khi chưa ghi localStorage)
  function readTickets() {
    if (window.FleetWorkflow?.tickets) return window.FleetWorkflow.tickets() || [];
    return readJson(WF_KEY, { tickets: [] }).tickets || [];
  }

  // Đọc dữ liệu quản trị dùng chung (fallback khớp governance.js v2)
  function readGov() {
    if (window.FleetGovernance?.snapshot) return window.FleetGovernance.snapshot();
    return readJson(GOV_KEY, {
      changes: [],
      recovery: [],
      maintenance: [],
      support: [],
      supportGrants: [],
      jobs: [{ id: 'JOB-017', name: 'Đồng bộ trạng thái GPS', status: 'failed', attempts: 0 }],
    });
  }

  function currentClock() {
    return new Date().toLocaleTimeString('vi-VN', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatShortTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('vi-VN', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Nút chuyển Mẫu 1 / Mẫu 2 / Mẫu 3 gắn vào thanh đầu trang để đổi qua lại nhanh
  const styleSwitch = document.createElement('div');
  styleSwitch.className = 'ui-style-switch';
  styleSwitch.setAttribute('role', 'group');
  styleSwitch.setAttribute('aria-label', 'Chọn mẫu giao diện');
  styleSwitch.innerHTML =
    '<button type="button" data-ui-style="v1" aria-pressed="true">Mẫu 1</button>' +
    '<button type="button" data-ui-style="v2" aria-pressed="false">Mẫu 2</button>' +
    '<button type="button" data-ui-style="v3" aria-pressed="false">Mẫu 3</button>';

  const headerActions = $('.header-actions');
  if (headerActions) {
    headerActions.prepend(styleSwitch);
  }

  // Khung gốc chứa lưới Bento Mẫu 2, đặt ngay trong #main trước footer
  const v2Root = document.createElement('section');
  v2Root.id = 'spatial-v2-root';
  v2Root.setAttribute('aria-label', 'Bảng điều khiển Mẫu 2');
  v2Root.hidden = true;
  const mainEl = $('#main');
  const footerEl = mainEl?.querySelector('footer');
  if (mainEl && footerEl) mainEl.insertBefore(v2Root, footerEl);
  else mainEl?.append(v2Root);

  // Khung gốc chứa bản Phone Mẫu 2 (<760px) cho 3 vai trò quản lý (không áp dụng Tài xế)
  // Gắn trực tiếp vào body để không bị quy tắc ẩn con của #main trong management-phone.css chặn.
  const v2Phone = document.createElement('section');
  v2Phone.id = 'spatial-v2-phone';
  v2Phone.setAttribute('aria-label', 'Giao diện điện thoại Mẫu 2');
  v2Phone.hidden = true;
  document.body.append(v2Phone);

  let phoneTab = 'overview';

  function isDesktop() {
    return window.innerWidth >= 760;
  }

  function isPhone() {
    return window.innerWidth < 760;
  }

  function isRoleHome() {
    return document.body.classList.contains('role-home-active');
  }

  // Xác định màn hiện tại có hiển thị lưới Bento Mẫu 2 không (các trang con vẫn giữ khung kính Mẫu 2)
  function shouldShowBento() {
    const role = roles.role();
    if (!['dispatch', 'admin', 'admin_system'].includes(role)) return false;
    const params = new URLSearchParams(location.search);
    if (params.get('flow') === 'tickets') return false;
    if (role === 'dispatch') {
      const p = params.get('page') || 'dispatch';
      return p === 'dispatch' || p === 'overview';
    }
    if (role === 'admin') {
      const ap = params.get('admin_page') || 'overview';
      return ap === 'overview';
    }
    if (role === 'admin_system') {
      const sp = params.get('system_page') || 'health';
      return sp === 'health';
    }
    return false;
  }

  // Bản đồ đội xe tích hợp thanh thông tin xe đang chọn ngay trên Bento để không cần trang GPS trùng lặp
  function buildMapMarkup(vehicles, activeOrders, titleText, drivers = [], showDetailBtn = true) {
    const activeCount = vehicles.filter((v) => v.availability !== 'maintenance').length;
    const activePlate = vehicles.some((v) => v.plate === selectedVehiclePlate)
      ? selectedVehiclePlate
      : vehicles[0]?.plate || '';
    const activeVeh = vehicles.find((v) => v.plate === activePlate);
    const activeOrd = activeVeh ? activeOrders.find((o) => o.plate === activeVeh.plate) : null;
    const activeDriver = activeVeh ? drivers.find((d) => d.id === activeVeh.driverId) : null;

    const gpsText = activeVeh
      ? activeVeh.gps === 'offline'
        ? 'Mất tín hiệu GPS mẫu'
        : activeVeh.gps === 'stale'
        ? 'Chưa cập nhật GPS mẫu'
        : 'Có tín hiệu GPS mẫu'
      : '';
    const stateText = activeOrd
      ? `Đang chạy ${activeOrd.id} (${activeOrd.to})`
      : activeVeh?.availability === 'maintenance'
      ? 'Đang bảo trì'
      : 'Sẵn sàng nhận đơn';

    const pins = vehicles
      .slice(0, 4)
      .map((v, i) => {
        const coords = [
          ['14%', '20%'],
          ['58%', '24%'],
          ['20%', '54%'],
          ['40%', '72%'],
        ][i];
        const ord = activeOrders.find((o) => o.plate === v.plate);
        const dotClass =
          v.gps === 'offline' ? 'v2-dot-red' : v.gps === 'stale' ? 'v2-dot-amber' : ord ? 'v2-dot-blue' : 'v2-dot-green';
        const pressed = activePlate === v.plate ? 'true' : 'false';
        return `<button type="button" class="v2-map-pin" style="left:${coords[0]};top:${coords[1]}" data-v2-action="select-vehicle" data-id="${esc(v.plate)}" aria-pressed="${pressed}"><span class="v2-dot ${dotClass}"></span>${esc(v.plate)}</button>`;
      })
      .join('');

    return `
      <div class="v2-hero-head">
        <h2>${esc(titleText)}</h2>
        <span class="v2-hero-pill">${activeCount} xe hoạt động</span>
      </div>
      <div class="v2-map-box">
        <svg viewBox="0 0 600 320" preserveAspectRatio="xMidYMid slice" style="transform:scale(${mapZoom})">
          <g fill="none" stroke="var(--v2-map-road)" stroke-width="1.4">
            <path d="M-20 80 L170 20 L360 95 L620 25"/>
            <path d="M-10 185 L155 125 L355 195 L620 120"/>
            <path d="M-15 275 L210 180 L450 285 L620 215"/>
            <path d="M90 -10 L210 330 M240 -10 L355 330 M395 -10 L515 330 M520 -10 L610 240"/>
          </g>
          <path d="M340 -15 C320 45 415 35 395 85 C375 135 315 120 355 170 C395 220 465 180 475 240"
                fill="none" stroke="var(--v2-map-river)" stroke-width="26" stroke-linecap="round"/>
          <path d="M130 96 C155 140 215 175 292 224 C345 190 405 148 475 115"
                fill="none" stroke="var(--v2-route)" stroke-width="3.6" stroke-linecap="round"/>
          <circle cx="130" cy="96" r="6" fill="var(--v2-route)"/>
          <circle cx="475" cy="115" r="6" fill="var(--v2-route)"/>
        </svg>
        ${pins}
        <div class="v2-map-zoom">
          <button type="button" data-v2-action="map-in" aria-label="Phóng to bản đồ">+</button>
          <button type="button" data-v2-action="map-out" aria-label="Thu nhỏ bản đồ">−</button>
        </div>
        <span class="v2-map-caption">Sơ đồ minh họa · Chưa kết nối GPS Taris</span>
      </div>
      ${
        activeVeh
          ? `<div class="v2-map-bar">
              <div class="v2-map-bar-info">
                <strong>${esc(activeVeh.plate)}</strong>
                <span>${esc(activeDriver?.name || 'Chưa gán tài xế')} · ${esc(stateText)} · ${esc(gpsText)}</span>
              </div>
              ${
                showDetailBtn
                  ? `<button type="button" class="v2-map-bar-btn" data-action="detail-vehicle" data-id="${esc(activeVeh.plate)}">Chi tiết xe →</button>`
                  : ''
              }
            </div>`
          : ''
      }`;
  }

  function renderDispatchBento() {
    const s = api.snapshot();
    const openTickets = readTickets().filter((t) => t.status === 'open');
    const pendingOrders = s.orders.filter((o) => o.status === 'pending');
    const assignedOrders = s.orders.filter((o) => o.status === 'assigned');
    const activeOrders = s.orders.filter((o) => ['assigned', 'running'].includes(o.status));
    const focusPending = pendingOrders.find((o) => o.id === s.selectedOrder) || pendingOrders[0];
    const readyVehicles =
      focusPending && api.candidates
        ? api.candidates(focusPending)
        : s.vehicles.filter((v) => v.availability === 'ready' && !activeOrders.some((o) => o.plate === v.plate));
    const staleVehicles = s.vehicles.filter((v) => v.gps === 'stale' || v.gps === 'offline');

    const focusOrder = focusPending || s.orders[0];
    const mapFocusPlate = s.vehicles.some((v) => v.plate === selectedVehiclePlate)
      ? selectedVehiclePlate
      : s.vehicles[0]?.plate || '';

    const queueRows =
      pendingOrders
        .slice(0, 4)
        .map((o, idx) => {
          const tagCls = idx === 0 ? 'v2-tag-amber' : 'v2-tag-blue';
          const isFocused = focusOrder?.id === o.id;
          return `<button type="button" class="v2-list-item" data-v2-action="focus-order" data-id="${esc(o.id)}" aria-pressed="${isFocused}">
            <div class="v2-item-main">
              <div class="v2-item-title"><strong>${esc(o.id)}</strong><span>· ${esc(o.material)} (${esc(qtyText(o))})</span></div>
              <div class="v2-item-sub">${esc(o.customerGroup || '')} · ${esc(o.from)} → ${esc(o.to)}${o.distanceKm ? ` · ${o.distanceKm} km` : ''}</div>
            </div>
            <span class="v2-tag ${tagCls}">Chờ phân xe</span>
          </button>`;
        })
        .join('') || '<div class="v2-item-sub">Hiện không có đơn chờ phân xe trong dữ liệu mẫu.</div>';

    const bottomVehicles = s.vehicles
      .slice(0, 4)
      .map((v, i) => {
        const isLight = i % 2 === 0;
        const ord = activeOrders.find((o) => o.plate === v.plate);
        const stText = ord
          ? 'Đang chạy'
          : v.availability === 'maintenance'
          ? 'Bảo trì'
          : 'Sẵn sàng';
        const pillCls = ord ? 'v2-pill-solid-blue' : v.availability === 'maintenance' ? 'v2-pill-solid-amber' : 'v2-pill-solid-green';
        const tagCls = v.gps === 'stale' || v.gps === 'offline' ? 'v2-tag-amber' : ord ? 'v2-tag-blue' : v.availability === 'maintenance' ? 'v2-tag-amber' : 'v2-tag-green';
        const subText = ord ? `${ord.id} · ${ord.to}` : v.gps === 'stale' ? 'Chưa cập nhật GPS mẫu' : 'Sẵn sàng nhận đơn';
        const isSelected = mapFocusPlate === v.plate;
        return `<button type="button" class="v2-tile ${isLight ? 'v2-card-light' : 'v2-card-dark'}" data-v2-action="select-vehicle" data-id="${esc(v.plate)}" aria-pressed="${isSelected}">
          <div class="v2-tile-top">
            <span class="v2-tile-ico">${icon(v.gps === 'stale' ? 'alert' : 'truck')}</span>
            ${isLight ? `<span class="${pillCls}">${stText}</span>` : `<span class="v2-tag ${tagCls}">${stText}</span>`}
          </div>
          <div>
            <div class="v2-tile-title">${esc(v.plate)}</div>
            <div class="v2-tile-sub">${esc(subText)}</div>
          </div>
        </button>`;
      })
      .join('');

    const attentionItems = [
      ...staleVehicles.slice(0, 1).map((v) => ({
        col: 'red',
        title: `${v.plate} chưa cập nhật GPS`,
        sub: 'Chọn để xem trạng thái xe trên bản đồ',
        act: 'select-vehicle',
        id: v.plate,
      })),
      ...pendingOrders.slice(0, 1).map((o) => ({
        col: 'amber',
        title: `${o.id} chờ phân công`,
        sub: `${o.material} · ${o.from} → ${o.to}`,
        act: 'focus-order',
        id: o.id,
      })),
      ...openTickets.slice(0, 1).map((t) => ({
        col: 'blue',
        title: `${t.code} · ${t.kind}`,
        sub: 'Ticket sự cố đang mở · Mở trao đổi ↗',
        act: 'go-tickets',
        id: t.id,
      })),
    ];

    const attentionHtml =
      attentionItems
        .map(
          (item) => `<button type="button" class="v2-q-item" data-v2-action="${item.act}" data-id="${esc(item.id)}">
            <span class="v2-dot v2-dot-${item.col}"></span>
            <div>
              <div class="v2-q-title">${esc(item.title)}</div>
              <div class="v2-q-sub">${esc(item.sub)}</div>
            </div>
          </button>`
        )
        .join('') || '<div class="v2-q-sub">Không có mục cần chú ý trong dữ liệu mẫu.</div>';

    v2Root.innerHTML = `
      <div class="v2-main">
        <div class="v2-top-grid">
          <section class="v2-hero v2-card-light">
            ${buildMapMarkup(s.vehicles, activeOrders, 'Bản đồ đội xe', s.drivers, true)}
          </section>
          <div class="v2-mid-col">
            <section class="v2-mid-panel v2-card-dark">
              <div class="v2-card-hd">
                <div>
                  <h3>Hàng chờ phân xe hôm nay</h3>
                  <div class="v2-hd-sub">Chọn đơn để điều phối nhanh ở cột phải</div>
                </div>
                <div class="v2-hd-tools">
                  <button type="button" class="v2-hd-link" data-v2-action="go-page" data-id="orders">Sổ đơn ↗</button>
                  <span class="v2-tag v2-tag-amber">${pendingOrders.length} đơn</span>
                </div>
              </div>
              <div class="v2-list">${queueRows}</div>
            </section>
            <div class="v2-kpi-row">
              <button type="button" class="v2-kpi v2-kpi-amber" data-v2-action="go-page" data-id="orders">
                <div class="v2-kpi-top"><span>Đơn chờ xử lý</span><span class="v2-tag v2-tag-amber">${pendingOrders.length}</span></div>
                <strong>${String(pendingOrders.length).padStart(2, '0')}</strong>
              </button>
              <button type="button" class="v2-kpi v2-kpi-blue" data-v2-action="go-page" data-id="fleet">
                <div class="v2-kpi-top"><span>Chuyến đang chạy</span><span class="v2-tag v2-tag-blue">${activeOrders.length}</span></div>
                <strong>${String(activeOrders.length).padStart(2, '0')}</strong>
              </button>
              <button type="button" class="v2-kpi v2-kpi-green" data-v2-action="go-page" data-id="fleet">
                <div class="v2-kpi-top"><span>Xe sẵn sàng</span><span class="v2-tag v2-tag-green">${readyVehicles.length}</span></div>
                <strong>${String(readyVehicles.length).padStart(2, '0')}</strong>
              </button>
            </div>
          </div>
        </div>
        <div class="v2-bottom-row">${bottomVehicles}</div>
      </div>
      <aside class="v2-right-col">
        <div class="v2-clock">
          <div class="v2-clock-time">${currentClock()}</div>
          <div class="v2-clock-sub">Điều phối vận hành</div>
        </div>
        <div class="v2-rw-box">
          <div class="v2-rw-head"><span>Cần chú ý ngay</span><span class="v2-rw-count">${attentionItems.length} mục</span></div>
          ${attentionHtml}
        </div>
        <div class="v2-flt-row">
          <button type="button" class="v2-flt-btn active" data-action="new-order">${icon('order')}<span>+ Nhận đơn</span></button>
          <button type="button" class="v2-flt-btn" data-workflow-action="trip-list">${icon('truck')}<span>Bằng chứng</span></button>
          <button type="button" class="v2-flt-btn" data-workflow-action="help-recovery">${icon('switch-account')}<span>Quên MK</span></button>
        </div>
        <div class="v2-action-card v2-card-light">
          <div class="v2-action-hd">
            <h4>Điều phối nhanh</h4>
            <button type="button" class="v2-ai-chip" data-v2-action="ai-suggest" ${focusOrder && focusOrder.status === 'pending' ? '' : 'disabled'}>${icon('spark')}Đề xuất AI</button>
          </div>
          <div class="v2-action-l1">${focusOrder ? `${esc(focusOrder.id)} · ${esc(focusOrder.material)} (${esc(qtyText(focusOrder))})` : 'Chưa có đơn chờ'}</div>
          <div class="v2-action-l2">${focusOrder ? `${esc(focusOrder.customerGroup || '')} · ${esc(focusOrder.from)} → ${esc(focusOrder.to)}` : 'Tạo đơn mới bằng nút + Nhận đơn'}</div>
          <div class="v2-ai-picks">${readyVehicles
            .slice(0, 3)
            .map((v, idx) => {
              const isChosen = (s.selectedVehicle || readyVehicles[0]?.plate) === v.plate;
              return `<button type="button" class="v2-ai-veh" data-v2-action="pick-vehicle" data-id="${esc(v.plate)}" aria-pressed="${isChosen}">${esc(v.plate)}<small>${esc(v.type)}</small></button>`;
            })
            .join('')}</div>
          <div class="v2-ai-note">Công bằng trước, tuyến sau (chưa chốt công thức) · ${assignedOrders.length} đơn chờ TX xác nhận</div>
          <button type="button" class="v2-action-btn" data-v2-action="quick-assign" ${focusOrder && focusOrder.status === 'pending' ? '' : 'disabled'}>Duyệt phân công</button>
        </div>
      </aside>`;
  }

  function renderAdminBento() {
    const s = api.snapshot();
    const gov = readGov();
    const pendingOrders = s.orders.filter((o) => o.status === 'pending');
    const activeOrders = s.orders.filter((o) => ['assigned', 'running'].includes(o.status));
    const openTickets = readTickets().filter((t) => t.status === 'open');
    const pendingChanges = (gov.changes || []).filter((c) => c.status === 'pending');
    const pendingMaint = (gov.maintenance || []).filter((m) => m.status === 'approved');

    // Tính dữ liệu biểu đồ 6/12 tháng trực tiếp từ danh sách đơn hàng mẫu (không đoán số)
    const days = [...new Set(s.orders.map((o) => o.day))].sort();
    const lastMonth = (days[days.length - 1] || '2026-11-16').slice(0, 7);
    const months = Array.from({ length: adminChartMonths }, (_, i) => {
      const d = new Date(`${lastMonth}-01T00:00:00Z`);
      d.setUTCMonth(d.getUTCMonth() - adminChartMonths + 1 + i);
      return d.toISOString().slice(0, 7);
    });
    const series = months.map((m) => {
      const grp = s.orders.filter((o) => o.day.startsWith(m));
      const done = grp.filter((o) => o.status === 'completed').length;
      return { month: m, label: `T${Number(m.slice(5))}`, total: grp.length, done, rest: grp.length - done };
    });
    const peak = Math.max(2, ...series.map((x) => x.total));
    const totalInRange = series.reduce((n, x) => n + x.total, 0);
    const doneInRange = series.reduce((n, x) => n + x.done, 0);
    const activeBar =
      series.find((x) => x.month === selectedAdminMonth) ||
      series.reduce((best, cur) => (cur.total >= best.total ? cur : best), series[0]);

    const barsHtml = series
      .map((x) => {
        const hPct = Math.round((x.total / peak) * 100);
        const donePct = x.total ? Math.round((x.done / x.total) * 100) : 0;
        const restPct = x.total ? 100 - donePct : 0;
        const isAct = x.month === activeBar.month;
        return `<button type="button" class="v2-bar-col ${isAct ? 'active' : ''}" data-v2-action="admin-bar" data-id="${x.month}" title="Tháng ${x.month}: ${x.total} đơn (${x.done} hoàn thành, ${x.rest} đang/chờ)">
          <span class="v2-bar-num">${x.total}</span>
          <div class="v2-bar-track">
            <div class="v2-bar-fill" style="height:${Math.max(hPct, x.total ? 26 : 5)}%">
              ${x.rest > 0 ? `<span class="v2-bar-rest" style="height:${restPct}%"><b>${x.rest}</b></span>` : ''}
              ${x.done > 0 ? `<span class="v2-bar-done" style="height:${donePct}%"><b>${x.done}</b></span>` : ''}
            </div>
          </div>
          <span class="v2-bar-lbl">${x.label}</span>
        </button>`;
      })
      .join('');

    const pendingOrderRows =
      pendingOrders
        .slice(0, 3)
        .map(
          (o) => `<button type="button" class="v2-q-item" data-v2-action="admin-page" data-id="approvals">
            <span class="v2-dot v2-dot-amber"></span>
            <div>
              <div class="v2-q-title">${esc(o.id)} · ${esc(o.material)} (${esc(qtyText(o))})</div>
              <div class="v2-q-sub">${esc(o.from)} → ${esc(o.to)}</div>
            </div>
          </button>`
        )
        .join('') || '<div class="v2-q-sub">Không có đơn chưa phân xe.</div>';

    const lockAlerts = gov.support || [];

    v2Root.innerHTML = `
      <div class="v2-main">
        <div class="v2-top-grid">
          <section class="v2-hero v2-card-light">
            ${buildMapMarkup(s.vehicles, activeOrders, 'Bản đồ đội xe toàn công ty', s.drivers, false)}
          </section>
          <div class="v2-mid-col">
            <section class="v2-mid-panel v2-card-dark">
              <div class="v2-card-hd">
                <div>
                  <h3>Thống kê đơn ${adminChartMonths} tháng (đơn)</h3>
                  <div class="v2-hd-sub">Tổng ${totalInRange} đơn · Xong ${doneInRange} · Chưa xong ${totalInRange - doneInRange}</div>
                </div>
                <div class="v2-seg" role="group" aria-label="Khoảng tháng">
                  <button type="button" data-v2-action="admin-months" data-id="6" aria-pressed="${adminChartMonths === 6}">6T</button>
                  <button type="button" data-v2-action="admin-months" data-id="12" aria-pressed="${adminChartMonths === 12}">12T</button>
                </div>
              </div>
              <div class="v2-chart-body">
                <div class="v2-y-axis"><span>${peak}</span><span>${Math.round(peak / 2)}</span><span>0</span></div>
                <div class="v2-bars-wrap">
                  <div class="v2-grid-lines"><span></span><span></span><span></span></div>
                  <div class="v2-bars" style="grid-template-columns:repeat(${adminChartMonths},1fr)">${barsHtml}</div>
                </div>
              </div>
              <div class="v2-chart-detail">
                <strong>${activeBar.label}/${activeBar.month.slice(2, 4)}:</strong> ${activeBar.total} đơn · ${activeBar.done} hoàn thành · ${activeBar.rest} đang/chờ
              </div>
              <div class="v2-chart-legend">
                <span><i style="background:var(--v2-accent)"></i>Hoàn thành (${doneInRange})</span>
                <span><i style="background:rgba(255,255,255,0.28)"></i>Đang chạy / Chờ (${totalInRange - doneInRange})</span>
              </div>
            </section>
            <div class="v2-kpi-row">
              <button type="button" class="v2-kpi v2-kpi-blue" data-v2-action="admin-page" data-id="approvals">
                <div class="v2-kpi-top"><span>Tổng đơn mẫu</span><span class="v2-tag v2-tag-blue">${s.orders.length}</span></div>
                <strong>${String(s.orders.length).padStart(2, '0')}</strong>
              </button>
              <button type="button" class="v2-kpi v2-kpi-amber" data-v2-action="admin-page" data-id="maintenance">
                <div class="v2-kpi-top"><span>Phiếu bảo trì</span><span class="v2-tag v2-tag-amber">${pendingMaint.length}</span></div>
                <strong>${String(pendingMaint.length).padStart(2, '0')}</strong>
              </button>
              <button type="button" class="v2-kpi v2-kpi-green" data-v2-action="admin-page" data-id="tickets">
                <div class="v2-kpi-top"><span>Ticket mở</span><span class="v2-tag v2-tag-green">${openTickets.length}</span></div>
                <strong>${String(openTickets.length).padStart(2, '0')}</strong>
              </button>
            </div>
          </div>
        </div>
        <div class="v2-bottom-row">
          <button type="button" class="v2-tile v2-card-light" data-v2-action="admin-page" data-id="approvals">
            <div class="v2-tile-top"><span class="v2-tile-ico">${icon('activity')}</span><span class="v2-pill-solid-blue">Chỉ đọc</span></div>
            <div><div class="v2-tile-title">Nhật ký & Hoạt động</div><div class="v2-tile-sub">${roles.snapshot().audit.length} thao tác Điều phối</div></div>
          </button>
          <button type="button" class="v2-tile v2-card-dark" data-v2-action="admin-page" data-id="tickets">
            <div class="v2-tile-top"><span class="v2-tile-ico">${icon('message')}</span><span class="v2-tag v2-tag-blue">Chỉ đọc</span></div>
            <div><div class="v2-tile-title">Hồ sơ Ticket</div><div class="v2-tile-sub">${openTickets.length} sự cố đang theo dõi</div></div>
          </button>
          <button type="button" class="v2-tile v2-card-light" data-v2-action="admin-page" data-id="maintenance">
            <div class="v2-tile-top"><span class="v2-tile-ico">${icon('gear')}</span><span class="v2-pill-solid-amber">Kỹ thuật</span></div>
            <div><div class="v2-tile-title">Yêu cầu bảo trì</div><div class="v2-tile-sub">${pendingMaint.length} phiếu gửi System Admin</div></div>
          </button>
          <button type="button" class="v2-tile v2-card-dark" data-v2-action="admin-page" data-id="maintenance">
            <div class="v2-tile-top"><span class="v2-tile-ico">${icon('alert')}</span><span class="v2-tag v2-tag-amber">Cảnh báo</span></div>
            <div><div class="v2-tile-title">Cảnh báo hệ thống</div><div class="v2-tile-sub">${lockAlerts.length} thông báo khóa TK</div></div>
          </button>
        </div>
      </div>
      <aside class="v2-right-col">
        <div class="v2-clock">
          <div class="v2-clock-time">${currentClock()}</div>
          <div class="v2-clock-sub">Quản lý vận hành</div>
        </div>
        <div class="v2-rw-box">
          <div class="v2-rw-head"><span>Đơn chưa phân xe</span><span class="v2-rw-count">${pendingOrders.length} đơn chờ</span></div>
          ${pendingOrderRows}
        </div>
        <div class="v2-flt-row">
          <button type="button" class="v2-flt-btn active" data-gov="maintenance-new">${icon('gear')}<span>+ Bảo trì</span></button>
          <button type="button" class="v2-flt-btn" data-v2-action="admin-page" data-id="approvals">${icon('order')}<span>Nhật ký</span></button>
          <button type="button" class="v2-flt-btn" data-v2-action="admin-page" data-id="tickets">${icon('alert')}<span>Ticket (${openTickets.length})</span></button>
        </div>
        <div class="v2-action-card v2-card-light">
          <h4>Bảo trì & Thông báo khóa TK</h4>
          <div class="v2-action-l1">${lockAlerts[0] ? esc(lockAlerts[0].id) : 'Giám sát vận hành toàn công ty'}</div>
          <div class="v2-action-l2">${lockAlerts[0] ? esc(lockAlerts[0].text) : 'Phân quyền role do System Admin phụ trách'}</div>
          <button type="button" class="v2-action-btn" data-v2-action="admin-page" data-id="maintenance">Mở Bảo trì & Cảnh báo</button>
        </div>
      </aside>`;
  }

  function renderSystemAdminBento() {
    const rSnap = roles.snapshot();
    const gov = readGov();
    const activeUsers = (rSnap.users || []).filter((u) => !u.deleted && u.active);
    const pendingRecovery = (gov.recovery || []).filter((r) => r.status === 'pending');
    const pendingChanges = (gov.changes || []).filter((c) => ['pending', 'approved', 'designated'].includes(c.status));
    const failedJobs = (gov.jobs || []).filter((j) => j.status === 'failed');
    const logs = (rSnap.system || []).slice(0, 4);

    const services = [
      { name: 'GPS Taris API', tag: 'running', metric: 'Chu kỳ 10p', sub: 'Đồng bộ vị trí đội xe (mẫu)', foot: 'Trạng thái: Chưa nối API thật', page: 'connections' },
      { name: 'MongoDB chính', tag: 'completed', metric: 'Dữ liệu mẫu', sub: 'Lưu trữ đơn, chuyến và nhật ký', foot: 'Sao lưu định kỳ · Xem chẩn đoán', page: 'backup' },
      { name: 'Cloudflare Tunnel', tag: 'completed', metric: 'Zero Trust', sub: 'Đóng port inbound · Bảo vệ truy cập', foot: 'Đã chốt phương án · Chưa cấu hình', page: 'security' },
      { name: 'AI Đề xuất V1', tag: 'pending', metric: 'Điều phối duyệt', sub: 'Đề xuất xe · Không tự phân công', foot: 'Tác vụ lỗi mẫu: ' + failedJobs.length, page: 'controls' },
    ];

    const serviceCards = services
      .map(
        (sv) => `<button type="button" class="v2-sys-node" data-v2-action="system-page" data-id="${sv.page}">
          <div class="v2-sys-top">
            <span class="v2-tag v2-tag-${sv.tag === 'completed' ? 'green' : sv.tag === 'running' ? 'blue' : 'amber'}">${esc(sv.name)}</span>
            <span class="v2-item-sub">${esc(sv.metric)}</span>
          </div>
          <div class="v2-sys-sub">${esc(sv.sub)}</div>
          <div class="v2-sys-foot">${esc(sv.foot)}</div>
        </button>`
      )
      .join('');

    const logRows =
      logs
        .map(
          (l) => `<button type="button" class="v2-list-item" data-v2-action="system-page" data-id="logs">
            <div class="v2-item-main">
              <div class="v2-item-title"><strong>${formatShortTime(l.at)}</strong><span>· ${esc(l.action)}</span></div>
              <div class="v2-item-sub">${esc(l.actor)} · ${esc(l.before || '—')} → ${esc(l.after || '—')}</div>
            </div>
            <span class="v2-tag v2-tag-blue">Nhật ký</span>
          </button>`
        )
        .join('') || '<div class="v2-item-sub">Chưa có nhật ký thay đổi.</div>';

    v2Root.innerHTML = `
      <div class="v2-main">
        <div class="v2-top-grid">
          <section class="v2-hero v2-card-light">
            <div class="v2-hero-head">
              <h2>Giám sát kết nối & hạ tầng</h2>
              <span class="v2-hero-pill">Bản thử · 4 thành phần</span>
            </div>
            <div class="v2-sys-grid">${serviceCards}</div>
          </section>
          <div class="v2-mid-col">
            <section class="v2-mid-panel v2-card-dark">
              <div class="v2-card-hd">
                <div>
                  <h3>Nhật ký an ninh & thay đổi</h3>
                  <div class="v2-hd-sub">Ghi nhận người thực hiện, trước → sau</div>
                </div>
                <span class="v2-tag v2-tag-blue">${rSnap.system.length} mục</span>
              </div>
              <div class="v2-list">${logRows}</div>
            </section>
            <div class="v2-kpi-row">
              <button type="button" class="v2-kpi v2-kpi-blue" data-v2-action="system-page" data-id="accounts">
                <div class="v2-kpi-top"><span>Tài khoản</span><span class="v2-tag v2-tag-blue">${activeUsers.length}</span></div>
                <strong>${String(activeUsers.length).padStart(2, '0')}</strong>
              </button>
              <button type="button" class="v2-kpi v2-kpi-amber" data-v2-action="system-page" data-id="changes">
                <div class="v2-kpi-top"><span>Khôi phục TK/MK</span><span class="v2-tag v2-tag-amber">${pendingRecovery.length}</span></div>
                <strong>${String(pendingRecovery.length).padStart(2, '0')}</strong>
              </button>
              <button type="button" class="v2-kpi v2-kpi-red" data-v2-action="system-page" data-id="maintenance">
                <div class="v2-kpi-top"><span>Tác vụ lỗi</span><span class="v2-tag v2-tag-red">${failedJobs.length}</span></div>
                <strong>${String(failedJobs.length).padStart(2, '0')}</strong>
              </button>
            </div>
          </div>
        </div>
        <div class="v2-bottom-row">
          <button type="button" class="v2-tile v2-card-light" data-v2-action="system-page" data-id="accounts">
            <div class="v2-tile-top"><span class="v2-tile-ico">${icon('switch-account')}</span><span class="v2-pill-solid-amber">Nội bộ</span></div>
            <div><div class="v2-tile-title">Tài khoản & khôi phục</div><div class="v2-tile-sub">${activeUsers.length} tài khoản hoạt động</div></div>
          </button>
          <button type="button" class="v2-tile v2-card-dark" data-v2-action="system-page" data-id="changes">
            <div class="v2-tile-top"><span class="v2-tile-ico">${icon('layers')}</span><span class="v2-tag v2-tag-blue">Phân quyền</span></div>
            <div><div class="v2-tile-title">Thay đổi quyền</div><div class="v2-tile-sub">${pendingChanges.length} yêu cầu đang theo dõi</div></div>
          </button>
          <button type="button" class="v2-tile v2-card-light" data-v2-action="system-page" data-id="connections">
            <div class="v2-tile-top"><span class="v2-tile-ico">${icon('pin')}</span><span class="v2-pill-solid-green">Kết nối</span></div>
            <div><div class="v2-tile-title">Đồng bộ GPS Taris</div><div class="v2-tile-sub">Chu kỳ 10 phút · Kiểm tra kết nối</div></div>
          </button>
          <button type="button" class="v2-tile v2-card-dark" data-v2-action="system-page" data-id="security">
            <div class="v2-tile-top"><span class="v2-tile-ico">${icon('alert')}</span><span class="v2-tag v2-tag-red">An ninh</span></div>
            <div><div class="v2-tile-title">An ninh & nhật ký</div><div class="v2-tile-sub">Đối chiếu cảnh báo & bằng chứng</div></div>
          </button>
        </div>
      </div>
      <aside class="v2-right-col">
        <div class="v2-clock">
          <div class="v2-clock-time">${currentClock()}</div>
          <div class="v2-clock-sub">Quản trị hệ thống</div>
        </div>
        <div class="v2-rw-box">
          <div class="v2-rw-head"><span>Cảnh báo & tác vụ</span><span class="v2-rw-count">Trực tiếp</span></div>
          <button type="button" class="v2-q-item" data-v2-action="system-page" data-id="maintenance">
            <span class="v2-dot v2-dot-red"></span>
            <div><div class="v2-q-title">${failedJobs.length} tác vụ nền lỗi mẫu</div><div class="v2-q-sub">Mở trang Hỗ trợ & bảo trì ↗</div></div>
          </button>
          <button type="button" class="v2-q-item" data-v2-action="system-page" data-id="changes">
            <span class="v2-dot v2-dot-amber"></span>
            <div><div class="v2-q-title">${pendingRecovery.length} yêu cầu quên TK/MK · ${pendingChanges.length} duyệt quản trị</div><div class="v2-q-sub">Xác minh cấp mã 1 lần · Cấm tự duyệt quản trị</div></div>
          </button>
          <button type="button" class="v2-q-item" data-v2-action="system-page" data-id="security">
            <span class="v2-dot v2-dot-green"></span>
            <div><div class="v2-q-title">An ninh & nhật ký chỉ đọc</div><div class="v2-q-sub">Đối chiếu bằng chứng đăng nhập</div></div>
          </button>
        </div>
        <div class="v2-flt-row">
          <button type="button" class="v2-flt-btn active" data-gov="provision">${icon('switch-account')}<span>+ Cấp TK</span></button>
          <button type="button" class="v2-flt-btn" data-v2-action="system-page" data-id="changes">${icon('layers')}<span>Đổi quyền</span></button>
          <button type="button" class="v2-flt-btn" data-v2-action="system-page" data-id="security">${icon('alert')}<span>An ninh</span></button>
        </div>
        <div class="v2-action-card v2-card-light">
          <h4>Cấp tài khoản nội bộ</h4>
          <div class="v2-action-l1">Tài xế / Điều phối · Không cần Admin duyệt</div>
          <div class="v2-action-l2">Passkey riêng cho hai vai trò quản trị</div>
          <button type="button" class="v2-action-btn" data-v2-action="system-page" data-id="accounts">Mở Tài khoản & truy cập</button>
        </div>
      </aside>`;
  }

  // Gắn nút chuyển sang Mẫu 2 vào thanh trên của Phone Mẫu 1 (#management-phone)
  function ensurePhoneV1Switch() {
    const actions = document.querySelector('#management-phone .management-topbar-actions');
    if (!actions || actions.querySelector('[data-ui-style-phone]')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'phone-style-toggle';
    btn.dataset.uiStylePhone = 'v2';
    btn.textContent = 'Mẫu 2';
    btn.setAttribute('aria-label', 'Chuyển sang giao diện Mẫu 2');
    actions.prepend(btn);
  }

  function renderPhoneV2(role) {
    const s = api.snapshot();
    const rSnap = roles.snapshot();
    const gov = readGov();
    const currentTheme = document.documentElement.dataset.theme || 'light';
    const roleLabel = role === 'dispatch' ? 'Điều phối' : role === 'admin' ? 'Admin' : 'System Admin';

    const pendingOrders = s.orders.filter((o) => o.status === 'pending');
    const activeOrders = s.orders.filter((o) => ['assigned', 'running'].includes(o.status));
    const readyVehicles = s.vehicles.filter(
      (v) => v.availability === 'ready' && !activeOrders.some((o) => o.plate === v.plate)
    );
    const openTickets = readTickets().filter((t) => t.status === 'open');
    const pendingRecovery = (gov.recovery || []).filter((r) => r.status === 'pending');
    const pendingChanges = (gov.changes || []).filter((c) => ['pending', 'approved', 'designated'].includes(c.status));
    const failedJobs = (gov.jobs || []).filter((j) => j.status === 'failed');
    const mapOrder = pendingOrders.find((o) => o.id === s.selectedOrder) || activeOrders[0] || pendingOrders[0];

    const mapCard = (title, countText) => `
      <section class="v2p-card v2p-light v2p-hero">
        <div class="v2p-hd"><h2>${esc(title)}</h2><span class="v2p-pill">${esc(countText)}</span></div>
        <div class="v2p-map">
          <svg viewBox="0 0 360 155" preserveAspectRatio="xMidYMid slice">
            <g fill="none" stroke="var(--v2-map-road)" stroke-width="1.2">
              <path d="M-10 42 L110 12 L230 52 L370 18"/>
              <path d="M-10 105 L110 72 L240 112 L370 72"/>
              <path d="M60 -5 L130 165 M185 -5 L245 165 M295 -5 L345 130"/>
            </g>
            <path d="M210 -10 C195 30 250 35 235 72 C220 105 265 120 275 165" fill="none" stroke="var(--v2-map-river)" stroke-width="18" stroke-linecap="round"/>
            <path d="M68 48 C98 78 138 102 182 118 C220 96 258 72 302 52" fill="none" stroke="var(--v2-route)" stroke-width="3.2" stroke-linecap="round"/>
            <circle cx="68" cy="48" r="5" fill="var(--v2-route)"/>
            <circle cx="302" cy="52" r="5" fill="var(--v2-route)"/>
          </svg>
          <span class="v2p-pin" style="left:8%;top:12%">${esc(mapOrder?.from || 'Điểm lấy mẫu')}</span>
          <span class="v2p-pin" style="right:6%;top:14%">${esc(mapOrder?.to || 'Điểm giao mẫu')}</span>
          <span class="v2p-pin" style="left:26%;bottom:12%"><span class="v2-dot v2-dot-green"></span>${esc(s.vehicles[0]?.plate || '51C-732.18')}</span>
        </div>
      </section>`;

    let bodyHtml = '';
    let navTabs = [];

    if (role === 'dispatch') {
      const focusOrder = pendingOrders.find((o) => o.id === s.selectedOrder) || pendingOrders[0];
      navTabs = [
        ['overview', 'dispatch', 'Điều phối'],
        ['orders', 'order', 'Đơn hàng'],
        ['fleet', 'pin', 'Đội xe'],
        ['more', 'gear', 'Thêm'],
      ];
      bodyHtml = `
        ${mapCard('Bản đồ đội xe', `${s.vehicles.filter((v) => v.availability !== 'maintenance').length} xe hoạt động`)}
        <div class="v2p-kpis">
          <div class="v2p-kpi v2-kpi-amber"><span>Chờ xe</span><strong>${String(pendingOrders.length).padStart(2, '0')}</strong></div>
          <div class="v2p-kpi v2-kpi-blue"><span>Đang chạy</span><strong>${String(activeOrders.length).padStart(2, '0')}</strong></div>
          <div class="v2p-kpi v2-kpi-green"><span>Sẵn sàng</span><strong>${String(readyVehicles.length).padStart(2, '0')}</strong></div>
        </div>
        <section class="v2p-card v2p-dark v2p-sec">
          <div class="v2p-hd"><h3>Hàng chờ phân xe</h3><span class="v2-tag v2-tag-amber">${pendingOrders.length} đơn</span></div>
          <div class="v2p-list">${
            pendingOrders
              .slice(0, 2)
              .map(
                (o) => `<button type="button" class="v2p-row" data-v2-action="focus-order" data-id="${esc(o.id)}">
                  <div><strong>${esc(o.id)} · ${esc(o.material)} (${esc(qtyText(o))})</strong><small>${esc(o.from)} → ${esc(o.to)}</small></div>
                  <span class="v2-tag v2-tag-amber">Chờ xe</span>
                </button>`
              )
              .join('') || '<div class="v2-item-sub">Chưa có đơn chờ phân xe.</div>'
          }</div>
        </section>
        <div class="v2p-pair">
          ${(() => {
            const v0 = readyVehicles[0] || s.vehicles[0];
            const vWarn = s.vehicles.find((v) => v.gps === 'stale' || v.gps === 'offline') || s.vehicles[1] || s.vehicles[0];
            const st0 = v0 && activeOrders.some((o) => o.plate === v0.plate) ? 'Đang chạy' : v0?.availability === 'maintenance' ? 'Bảo trì' : 'Sẵn sàng nhận đơn';
            const st1 = vWarn?.gps === 'offline' ? 'Mất tín hiệu GPS' : vWarn?.gps === 'stale' ? 'Cần kiểm tra GPS' : 'Có tín hiệu GPS';
            return `<div class="v2p-card v2p-light v2p-mini">
              <strong>${esc(v0?.plate || '—')}</strong>
              <small>${esc(st0)}</small>
            </div>
            <div class="v2p-card v2p-dark v2p-mini">
              <strong>${esc(vWarn?.plate || '—')}</strong>
              <small>${esc(st1)}</small>
            </div>`;
          })()}
        </div>
        <section class="v2p-card v2p-light v2p-act">
          <div class="v2p-act-top">
            <div><strong>Điều phối nhanh · ${esc(focusOrder?.id || '—')}</strong><small>${focusOrder ? `${esc(focusOrder.material)} · ${esc(focusOrder.from)} → ${esc(focusOrder.to)}` : 'Chưa có đơn chờ'}</small></div>
            <button type="button" class="v2-ai-chip" data-v2-action="ai-suggest" ${focusOrder ? '' : 'disabled'}>${icon('spark')}Đề xuất AI</button>
          </div>
          <div class="v2p-ai-row">
            ${readyVehicles
              .slice(0, 3)
              .map((v) => {
                const isChosen = (s.selectedVehicle || readyVehicles[0]?.plate) === v.plate;
                return `<button type="button" class="v2p-veh" data-v2-action="pick-vehicle" data-id="${esc(v.plate)}" aria-pressed="${isChosen}">${esc(v.plate)}</button>`;
              })
              .join('')}
            <button type="button" class="v2p-btn" data-v2-action="quick-assign" ${focusOrder ? '' : 'disabled'}>Duyệt</button>
          </div>
        </section>`;
    } else if (role === 'admin') {
      navTabs = [
        ['overview', 'home', 'Tổng quan'],
        ['activity', 'activity', 'Nhật ký'],
        ['tickets', 'alert', 'Ticket'],
        ['more', 'gear', 'Thêm'],
      ];
      const days = [...new Set(s.orders.map((o) => o.day))].sort();
      const lastMonth = (days[days.length - 1] || '2026-11-16').slice(0, 7);
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(`${lastMonth}-01T00:00:00Z`);
        d.setUTCMonth(d.getUTCMonth() - 5 + i);
        return d.toISOString().slice(0, 7);
      });
      const series = months.map((m) => ({
        label: `T${Number(m.slice(5))}`,
        total: s.orders.filter((o) => o.day.startsWith(m)).length,
      }));
      const peak = Math.max(2, ...series.map((x) => x.total));
      bodyHtml = `
        ${mapCard('Bản đồ đội xe toàn công ty', `${s.vehicles.filter((v) => v.availability !== 'maintenance').length} xe hoạt động`)}
        <div class="v2p-kpis">
          <div class="v2p-kpi v2-kpi-blue"><span>Tổng đơn</span><strong>${String(s.orders.length).padStart(2, '0')}</strong></div>
          <div class="v2p-kpi v2-kpi-amber"><span>Bảo trì</span><strong>${String((gov.maintenance || []).filter((m) => m.status === 'approved').length).padStart(2, '0')}</strong></div>
          <div class="v2p-kpi v2-kpi-green"><span>Ticket mở</span><strong>${String(openTickets.length).padStart(2, '0')}</strong></div>
        </div>
        <section class="v2p-card v2p-dark v2p-sec">
          <div class="v2p-hd"><h3>Thống kê đơn 6 tháng (đơn)</h3><span class="v2-tag v2-tag-blue">Tổng ${s.orders.length}</span></div>
          <div class="v2p-bars">${series
            .map((x, idx) => `<div class="v2p-bcol ${idx === series.length - 1 ? 'act' : ''}"><b>${x.total}</b><div class="v2p-btr"><span style="height:${Math.max(Math.round((x.total / peak) * 100), x.total ? 16 : 6)}%"></span></div><i>${x.label}</i></div>`)
            .join('')}</div>
        </section>
        <div class="v2p-pair">
          <div class="v2p-card v2p-light v2p-mini"><strong>Nhật ký Điều phối</strong><small>${rSnap.audit.length} thao tác chỉ đọc</small></div>
          <div class="v2p-card v2p-dark v2p-mini"><strong>Ticket (chỉ đọc)</strong><small>${openTickets.length} sự cố đang mở</small></div>
        </div>
        <section class="v2p-card v2p-light v2p-act">
          <div class="v2p-act-top">
            <div><strong>Đơn chưa phân xe (${pendingOrders.length})</strong><small>${pendingOrders[0] ? `${esc(pendingOrders[0].id)} · ${esc(pendingOrders[0].material)}` : 'Không có đơn chờ'}</small></div>
            <button type="button" class="v2p-btn" data-v2-phone-open="activity">Xem</button>
          </div>
        </section>`;
    } else {
      navTabs = [
        ['overview', 'home', 'Tổng quan'],
        ['accounts', 'switch-account', 'Tài khoản'],
        ['requests', 'order', 'Yêu cầu'],
        ['more', 'gear', 'Thêm'],
      ];
      const activeUsers = (rSnap.users || []).filter((u) => !u.deleted && u.active);
      bodyHtml = `
        <section class="v2p-card v2p-light v2p-hero">
          <div class="v2p-hd"><h2>Giám sát hạ tầng</h2><span class="v2p-pill">Bản thử · 4 phần</span></div>
          <div class="v2p-sys-2x2">
            <div class="v2p-sys-tile"><span class="v2-tag v2-tag-blue">GPS Taris</span><b>Chu kỳ 10p</b><small>Chưa nối API thật</small></div>
            <div class="v2p-sys-tile"><span class="v2-tag v2-tag-green">MongoDB</span><b>Dữ liệu mẫu</b><small>Sao lưu định kỳ</small></div>
            <div class="v2p-sys-tile"><span class="v2-tag v2-tag-green">Cloudflare</span><b>Zero Trust</b><small>Đã chốt · Chưa cấu hình</small></div>
            <div class="v2p-sys-tile"><span class="v2-tag v2-tag-amber">AI V1</span><b>Chờ duyệt</b><small>Lỗi mẫu: ${failedJobs.length}</small></div>
          </div>
        </section>
        <div class="v2p-kpis">
          <div class="v2p-kpi v2-kpi-blue"><span>Tài khoản</span><strong>${String(activeUsers.length).padStart(2, '0')}</strong></div>
          <div class="v2p-kpi v2-kpi-amber"><span>Đổi quyền</span><strong>${String(pendingChanges.length).padStart(2, '0')}</strong></div>
          <div class="v2p-kpi v2-kpi-red"><span>Tác vụ lỗi</span><strong>${String(failedJobs.length).padStart(2, '0')}</strong></div>
        </div>
        <section class="v2p-card v2p-dark v2p-sec">
          <div class="v2p-hd"><h3>Nhật ký an ninh & thay đổi</h3><span class="v2-tag v2-tag-blue">${rSnap.system.length} mục</span></div>
          <div class="v2p-list">${(rSnap.system || [])
            .slice(0, 2)
            .map(
              (l) => `<div class="v2p-row"><div><strong>${formatShortTime(l.at)} · ${esc(l.action)}</strong><small>${esc(l.actor)} · ${esc(l.before || '—')} → ${esc(l.after || '—')}</small></div><span class="v2-tag v2-tag-blue">Log</span></div>`
            )
            .join('')}</div>
        </section>
        <div class="v2p-pair">
          <div class="v2p-card v2p-light v2p-mini"><strong>Tài khoản nội bộ</strong><small>${activeUsers.length} đang hoạt động</small></div>
          <div class="v2p-card v2p-dark v2p-mini"><strong>Passkey quản trị</strong><small>Admin & System Admin</small></div>
        </div>
        <section class="v2p-card v2p-light v2p-act">
          <div class="v2p-act-top">
            <div><strong>Quản lý tài khoản & khôi phục</strong><small>Cấp tài khoản thường · Không cần Admin duyệt</small></div>
            <button type="button" class="v2p-btn" data-v2-phone-open="accounts">Mở</button>
          </div>
        </section>`;
    }

    v2Phone.innerHTML = `
      <div class="v2p-topbar" role="banner">
        <div class="v2p-brand">
          <svg viewBox="0 0 552 332" aria-hidden="true"><use href="assets/brand/fleet-construction.svg#fleet-logo"/></svg>
          <span>${esc(roleLabel)}</span>
        </div>
        <div class="v2p-top-actions">
          <button type="button" class="v2p-pill-btn" data-ui-style-phone="v1" aria-label="Chuyển về Mẫu 1">Mẫu 1</button>
          <select class="v2p-theme-sel" aria-label="Chọn nền giao diện">
            <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Sáng</option>
            <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Tối</option>
            <option value="amber" ${currentTheme === 'amber' ? 'selected' : ''}>Hổ phách</option>
            <option value="moss" ${currentTheme === 'moss' ? 'selected' : ''}>Rêu mờ</option>
          </select>
          <a class="v2p-link-btn" href="./">Vai trò</a>
        </div>
      </div>
      <div class="v2p-stack">${bodyHtml}</div>
      <nav class="v2p-dock" aria-label="Điều hướng Phone Mẫu 2">
        ${navTabs
          .map(
            ([id, ico, lbl]) => `<button type="button" class="v2p-dock-tab" data-v2-phone-tab="${id}" ${phoneTab === id ? 'aria-current="page"' : ''}>${icon(ico)}<span>${esc(lbl)}</span></button>`
          )
          .join('')}
      </nav>`;
  }

  // Đồng bộ thanh menu pill khi ẩn các tab trùng lặp để trang đang mở luôn đánh dấu chính xác
  function syncNavLabelsAndActive(role) {
    const params = new URLSearchParams(location.search);
    if (role === 'dispatch') {
      const isTickets = params.get('flow') === 'tickets';
      const p = params.get('page') || 'dispatch';
      const overviewBtn = document.querySelector('.sidebar nav button[data-page="Tổng quan"]');
      const dispatchBtn = document.querySelector('.sidebar nav button[data-page="Điều phối"]');
      const ticketsBtn = document.querySelector('.sidebar nav button[data-workflow-action="tickets"]');
      if (isTickets) {
        document.querySelectorAll('.sidebar nav button[data-page]').forEach((b) => {
          b.classList.remove('active');
          b.removeAttribute('aria-current');
        });
        ticketsBtn?.classList.add('active');
        ticketsBtn?.setAttribute('aria-current', 'page');
        const crumb = $('.crumb');
        if (crumb) crumb.innerHTML = `${icon('home')}<span>/</span>Sự cố & ticket`;
      } else {
        ticketsBtn?.classList.remove('active');
        ticketsBtn?.removeAttribute('aria-current');
        if (p === 'overview') {
          overviewBtn?.classList.remove('active');
          overviewBtn?.removeAttribute('aria-current');
          dispatchBtn?.classList.add('active');
          dispatchBtn?.setAttribute('aria-current', 'page');
          const crumb = $('.crumb');
          if (crumb) crumb.innerHTML = `${icon('home')}<span>/</span>Điều phối`;
        }
      }
    }
    if (role === 'admin') {
      const appBtn = document.getElementById('admin-nav-approvals');
      if (appBtn) {
        appBtn.title = 'Nhật ký & Hoạt động';
        const lbl = appBtn.querySelector('.nav-label');
        if (lbl) lbl.textContent = 'Nhật ký & Hoạt động';
      }
      if ((params.get('admin_page') || 'overview') === 'approvals' && params.get('flow') !== 'tickets') {
        const h1 = $('#role-view .page-heading h1');
        if (h1) h1.textContent = 'Nhật ký phê duyệt & Hoạt động';
        const crumb = $('.crumb');
        if (crumb) crumb.innerHTML = `${icon('home')}<span>/</span>NHẬT KÝ & HOẠT ĐỘNG`;
      }
    }
  }

  function sync() {
    const role = roles.role();
    const eligibleRole = !isRoleHome() && role !== 'driver';
    const activeDesktopV2 = uiStyle === 'v2' && isDesktop() && eligibleRole;
    const activePhoneV2 = uiStyle === 'v2' && isPhone() && eligibleRole;
    const showBento = activeDesktopV2 && shouldShowBento();

    styleSwitch.querySelectorAll('[data-ui-style]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.uiStyle === uiStyle));
    });

    document.documentElement.classList.toggle('ui-v2-html', activeDesktopV2 || activePhoneV2);
    if (activeDesktopV2 || activePhoneV2) {
      document.documentElement.style.setProperty('background-color', 'var(--v2-bg-solid)', 'important');
      document.documentElement.style.setProperty('background-image', 'var(--v2-bg-grad)', 'important');
      document.documentElement.style.setProperty('background-attachment', 'fixed', 'important');
    } else if (uiStyle !== 'v3') {
      document.documentElement.style.removeProperty('background-color');
      document.documentElement.style.removeProperty('background-image');
      document.documentElement.style.removeProperty('background-attachment');
    }
    document.body.classList.toggle('ui-v2', activeDesktopV2);
    document.body.classList.toggle('ui-v2-bento-active', showBento);
    document.body.classList.toggle('ui-v2-phone', activePhoneV2);
    v2Root.hidden = !showBento;
    v2Phone.hidden = !activePhoneV2;

    if (activeDesktopV2) {
      syncNavLabelsAndActive(role);
    }

    if (isPhone() && eligibleRole) {
      ensurePhoneV1Switch();
    }

    if (activePhoneV2) {
      renderPhoneV2(role);
      return;
    }

    if (!showBento) return;
    if (role === 'dispatch') renderDispatchBento();
    else if (role === 'admin') renderAdminBento();
    else if (role === 'admin_system') renderSystemAdminBento();
  }

  // Xử lý bấm nút chuyển Mẫu 1 / Mẫu 2
  styleSwitch.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ui-style]');
    if (!btn) return;
    saveStyle(btn.dataset.uiStyle);
    if (uiStyle === 'v1') {
      api.render();
    }
    sync();
  });

  // Xử lý tương tác trên lưới Bento Mẫu 2: ủy quyền về đúng luồng hiện có của prototype
  v2Root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-v2-action]');
    if (!btn) return;
    const action = btn.dataset.v2Action;
    const id = btn.dataset.id || '';

    if (action === 'map-in') {
      mapZoom = Math.min(1.5, +(mapZoom + 0.15).toFixed(2));
      sync();
      return;
    }
    if (action === 'map-out') {
      mapZoom = Math.max(1, +(mapZoom - 0.15).toFixed(2));
      sync();
      return;
    }
    if (action === 'select-vehicle') {
      selectedVehiclePlate = id;
      sync();
      return;
    }
    if (action === 'admin-months') {
      adminChartMonths = id === '12' ? 12 : 6;
      selectedAdminMonth = '';
      sync();
      return;
    }
    if (action === 'admin-bar') {
      selectedAdminMonth = id;
      sync();
      return;
    }
    if (action === 'go-page') {
      const map = { overview: 'Tổng quan', orders: 'Đơn hàng', dispatch: 'Điều phối', fleet: 'Xe & tài xế', gps: 'GPS', reports: 'Báo cáo' };
      const navBtn = document.querySelector(`.sidebar nav button[data-page="${map[id] || ''}"]`);
      navBtn?.click();
      return;
    }
    if (action === 'go-tickets') {
      document.querySelector('[data-workflow-action="tickets"]')?.click();
      return;
    }
    if (action === 'focus-order') {
      const picker = $('#dispatch-order');
      if (picker && [...picker.options].some((o) => o.value === id)) {
        picker.value = id;
        picker.dispatchEvent(new Event('change', { bubbles: true }));
      }
      sync();
      return;
    }
    if (action === 'dispatch-order') {
      const picker = $('#dispatch-order');
      if (picker && [...picker.options].some((o) => o.value === id)) {
        picker.value = id;
        picker.dispatchEvent(new Event('change', { bubbles: true }));
      }
      $('#assign')?.click();
      return;
    }
    if (action === 'ai-suggest') {
      $('#suggest')?.click();
      setTimeout(sync, 20);
      return;
    }
    if (action === 'pick-vehicle') {
      document.querySelector(`.vehicle[data-vehicle="${CSS.escape(id)}"]`)?.click();
      setTimeout(sync, 20);
      return;
    }
    if (action === 'quick-assign') {
      $('#assign')?.click();
      return;
    }
    if (action === 'admin-page') {
      const nav = document.querySelector(`.role-nav [data-workflow-action="admin-page"][data-id="${CSS.escape(id)}"]`);
      nav?.click();
      return;
    }
    if (action === 'system-page') {
      const nav = document.querySelector(`.role-nav [data-gov="system-page"][data-id="${CSS.escape(id)}"]`);
      nav?.click();
    }
  });

  // Chuyển Mẫu 1 / Mẫu 2 trên Phone và xử lý sự kiện bên trong #spatial-v2-phone
  document.addEventListener('click', (e) => {
    const phoneToggle = e.target.closest('[data-ui-style-phone]');
    if (phoneToggle) {
      saveStyle(phoneToggle.dataset.uiStylePhone);
      phoneTab = 'overview';
      sync();
      return;
    }
    const phoneTabBtn = e.target.closest('[data-v2-phone-tab],[data-v2-phone-open]');
    if (phoneTabBtn) {
      const target = phoneTabBtn.dataset.v2PhoneTab || phoneTabBtn.dataset.v2PhoneOpen;
      if (target === 'overview') {
        phoneTab = 'overview';
        sync();
        return;
      }
      // Chuyển tạm về màn con chi tiết của Phone để giữ trọn luồng nghiệp vụ hiện có
      saveStyle('v1');
      sync();
      setTimeout(() => {
        const navBtn = document.querySelector(`#management-phone [data-management-screen="${CSS.escape(target)}"]`);
        if (navBtn) {
          navBtn.click();
        } else {
          const url = new URL(location.href);
          url.searchParams.delete('flow');
          url.searchParams.set('phone_view', target);
          history.pushState(null, '', url);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }, 30);
      return;
    }
    // Bỏ focus ngay sau khi bấm chuột để :focus-within không giữ thanh menu mở sau khi chuyển trang
    const sbBtn = e.target.closest('.sidebar nav button');
    if (sbBtn && uiStyle === 'v2' && isDesktop() && e.detail > 0) {
      sbBtn.blur();
    }
    if (v2Phone.contains(e.target)) {
      const actBtn = e.target.closest('[data-v2-action]');
      if (!actBtn) return;
      const action = actBtn.dataset.v2Action;
      const id = actBtn.dataset.id || '';
      if (action === 'focus-order') {
        const picker = $('#dispatch-order');
        if (picker && [...picker.options].some((o) => o.value === id)) {
          picker.value = id;
          picker.dispatchEvent(new Event('change', { bubbles: true }));
        }
        sync();
      } else if (action === 'ai-suggest') {
        $('#suggest')?.click();
        setTimeout(sync, 20);
      } else if (action === 'pick-vehicle') {
        document.querySelector(`.vehicle[data-vehicle="${CSS.escape(id)}"]`)?.click();
        setTimeout(sync, 20);
      } else if (action === 'quick-assign' || action === 'dispatch-order') {
        if (action === 'dispatch-order') {
          const picker = $('#dispatch-order');
          if (picker && [...picker.options].some((o) => o.value === id)) {
            picker.value = id;
            picker.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        $('#assign')?.click();
      }
    }
  });

  v2Phone.addEventListener('change', (e) => {
    if (!e.target.classList.contains('v2p-theme-sel')) return;
    const sel = $('#theme-select');
    if (sel) {
      sel.value = e.target.value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  // Đồng bộ lại khi đổi vai trò, đổi trang, đổi mẫu UI, cập nhật dữ liệu mẫu hoặc thay đổi kích thước cửa sổ
  window.addEventListener('fleet:ui-style', (e) => {
    const next = e.detail?.style;
    if (next === 'v1' || next === 'v2' || next === 'v3') {
      uiStyle = next;
      requestAnimationFrame(sync);
    }
  });
  window.FleetUIStyle = { get: () => uiStyle, set: saveStyle };
  window.addEventListener('fleet:role-render', () => requestAnimationFrame(sync));
  window.addEventListener('fleet:render', () => requestAnimationFrame(sync));
  window.addEventListener('fleet:workflow-sync', () => requestAnimationFrame(sync));
  window.addEventListener('fleet:commit', () => requestAnimationFrame(sync));
  window.addEventListener('popstate', () => requestAnimationFrame(sync));
  window.addEventListener('resize', () => requestAnimationFrame(sync));

  sync();
})();
