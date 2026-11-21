/* Mẫu 2 (Spatial UI kính phân tầng đậm-nhạt) cho UI thử nghiệm Fleet Autopilot.
 * Trách nhiệm:
 * - Thêm nút chuyển "Mẫu 1 / Mẫu 2" trên thanh đầu trang (ẩn với Tài xế và màn hình <760px).
 * - Khi bật Mẫu 2, dựng dashboard Bento phân tầng khung đậm-nhạt cho 3 vai trò:
 *   Điều phối, Quản lý vận hành (Admin), Quản trị hệ thống (System Admin).
 * - Đọc dữ liệu dùng chung từ FleetPreview / FleetRoles / workflow / governance;
 *   mọi thao tác điều hướng, lọc, duyệt phân công đều nối thẳng về handler thật của prototype.
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
  const WF_KEY = 'fleet-autopilot-workflow-v1';
  const GOV_KEY = 'fleet-autopilot-governance-v1';

  let uiStyle = readInitialStyle();
  let mapZoom = 1;
  let adminChartMonths = 6;
  let selectedAdminMonth = '';
  let selectedVehiclePlate = '';

  function readInitialStyle() {
    const param = new URLSearchParams(location.search).get('ui');
    if (param === 'v1' || param === 'v2') return param;
    try {
      const saved = localStorage.getItem(STYLE_KEY);
      if (saved === 'v1' || saved === 'v2') return saved;
    } catch {}
    return 'v1';
  }

  function saveStyle(next) {
    uiStyle = next === 'v2' ? 'v2' : 'v1';
    try {
      localStorage.setItem(STYLE_KEY, uiStyle);
    } catch {}
    const url = new URL(location.href);
    if (uiStyle === 'v2') url.searchParams.set('ui', 'v2');
    else url.searchParams.delete('ui');
    history.replaceState(null, '', url);
  }

  function readJson(key, fallback) {
    try {
      const raw = JSON.parse(localStorage.getItem(key));
      return raw || fallback;
    } catch {
      return fallback;
    }
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

  // Nút chuyển Mẫu 1 / Mẫu 2 gắn vào thanh đầu trang để đổi qua lại nhanh
  const styleSwitch = document.createElement('div');
  styleSwitch.className = 'ui-style-switch';
  styleSwitch.setAttribute('role', 'group');
  styleSwitch.setAttribute('aria-label', 'Chọn mẫu giao diện');
  styleSwitch.innerHTML =
    '<button type="button" data-ui-style="v1" aria-pressed="true">Mẫu 1</button>' +
    '<button type="button" data-ui-style="v2" aria-pressed="false">Mẫu 2</button>';

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

  function isDesktop() {
    return window.innerWidth >= 760;
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

  function buildMapMarkup(vehicles, activeOrders, titleText) {
    const activeCount = vehicles.filter((v) => v.availability !== 'maintenance').length;
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
        const pressed = selectedVehiclePlate === v.plate ? 'true' : 'false';
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
                fill="none" stroke="var(--v2-route)" stroke-width="4" stroke-linecap="round"/>
          <circle cx="130" cy="96" r="7" fill="var(--v2-route)"/>
          <circle cx="475" cy="115" r="7" fill="var(--v2-route)"/>
        </svg>
        ${pins}
        <div class="v2-map-zoom">
          <button type="button" data-v2-action="map-in" aria-label="Phóng to bản đồ">+</button>
          <button type="button" data-v2-action="map-out" aria-label="Thu nhỏ bản đồ">−</button>
        </div>
        <span class="v2-map-caption">Sơ đồ minh họa · Chưa kết nối GPS Taris</span>
      </div>`;
  }

  function renderDispatchBento() {
    const s = api.snapshot();
    const wf = readJson(WF_KEY, { tickets: [] });
    const openTickets = (wf.tickets || []).filter((t) => t.status === 'open');
    const pendingOrders = s.orders.filter((o) => o.status === 'pending');
    const activeOrders = s.orders.filter((o) => ['assigned', 'running'].includes(o.status));
    const readyVehicles = s.vehicles.filter(
      (v) => v.availability === 'ready' && !activeOrders.some((o) => o.plate === v.plate)
    );
    const staleVehicles = s.vehicles.filter((v) => v.gps === 'stale' || v.gps === 'offline');

    const focusOrder = pendingOrders.find((o) => o.id === s.selectedOrder) || pendingOrders[0] || s.orders[0];

    const queueRows =
      pendingOrders
        .slice(0, 4)
        .map((o, idx) => {
          const tagCls = idx === 0 ? 'v2-tag-amber' : 'v2-tag-blue';
          return `<button type="button" class="v2-list-item" data-v2-action="dispatch-order" data-id="${esc(o.id)}">
            <div class="v2-item-main">
              <div class="v2-item-title"><strong>${esc(o.id)}</strong><span>· ${esc(o.material)} (${o.quantity} tấn mẫu)</span></div>
              <div class="v2-item-sub">${esc(o.from)} → ${esc(o.to)}</div>
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
        const dotCls = v.gps === 'stale' || v.gps === 'offline' ? 'v2-dot-amber' : ord ? 'v2-dot-blue' : 'v2-dot-green';
        const subText = ord ? `${ord.id} · ${ord.to}` : v.gps === 'stale' ? 'Chưa cập nhật GPS mẫu' : 'Sẵn sàng nhận đơn';
        return `<button type="button" class="v2-tile ${isLight ? 'v2-card-light' : 'v2-card-dark'}" data-v2-action="track-vehicle" data-id="${esc(v.plate)}">
          <div class="v2-tile-top">
            <span class="v2-tile-ico">${icon(v.gps === 'stale' ? 'alert' : 'truck')}</span>
            ${isLight ? `<span class="${pillCls}">${stText}</span>` : `<span class="v2-dot ${dotCls}"></span>`}
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
        sub: 'Kiểm tra tín hiệu trong màn GPS ↗',
        act: 'track-vehicle',
        id: v.plate,
      })),
      ...pendingOrders.slice(0, 1).map((o) => ({
        col: 'amber',
        title: `${o.id} chờ phân công`,
        sub: `${o.material} · ${o.from} → ${o.to}`,
        act: 'dispatch-order',
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
            ${buildMapMarkup(s.vehicles, activeOrders, 'Bản đồ đội xe')}
          </section>
          <div class="v2-mid-col">
            <section class="v2-mid-panel v2-card-dark">
              <div class="v2-card-hd">
                <div>
                  <h3>Hàng chờ phân xe hôm nay</h3>
                  <div class="v2-hd-sub">Bấm đơn để mở phân công · Dữ liệu mẫu</div>
                </div>
                <span class="v2-tag v2-tag-amber">${pendingOrders.length} đơn</span>
              </div>
              <div class="v2-list">${queueRows}</div>
            </section>
            <div class="v2-kpi-row">
              <button type="button" class="v2-kpi v2-kpi-amber" data-v2-action="go-page" data-id="orders">
                <div class="v2-kpi-top"><span>Đơn chờ xử lý</span><span class="v2-tag v2-tag-amber">${pendingOrders.length}</span></div>
                <strong>${String(pendingOrders.length).padStart(2, '0')}</strong>
              </button>
              <button type="button" class="v2-kpi v2-kpi-blue" data-v2-action="go-page" data-id="gps">
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
          <button type="button" class="v2-flt-btn active" data-v2-action="go-page" data-id="orders">${icon('order')}<span>Đơn hàng</span></button>
          <button type="button" class="v2-flt-btn" data-v2-action="go-page" data-id="fleet">${icon('truck')}<span>Đội xe</span></button>
          <button type="button" class="v2-flt-btn" data-v2-action="go-page" data-id="gps">${icon('pin')}<span>Bản đồ</span></button>
          <button type="button" class="v2-flt-btn" data-v2-action="go-tickets">${icon('alert')}<span>Ticket (${openTickets.length})</span></button>
        </div>
        <div class="v2-action-card v2-card-light">
          <h4>Điều phối nhanh</h4>
          <div class="v2-action-l1">${focusOrder ? `${esc(focusOrder.id)} · ${esc(focusOrder.material)}` : 'Chưa có đơn chờ'}</div>
          <div class="v2-action-l2">${focusOrder ? `${esc(focusOrder.from)} → ${esc(focusOrder.to)}` : 'Tạo đơn mới ở mục Đơn hàng'}</div>
          <button type="button" class="v2-action-btn" data-v2-action="quick-assign" ${focusOrder && focusOrder.status === 'pending' ? '' : 'disabled'}>Duyệt phân công</button>
        </div>
      </aside>`;
  }

  function renderAdminBento() {
    const s = api.snapshot();
    const wf = readJson(WF_KEY, { tickets: [] });
    const gov = readJson(GOV_KEY, { changes: [], maintenance: [] });
    const pendingOrders = s.orders.filter((o) => o.status === 'pending');
    const activeOrders = s.orders.filter((o) => ['assigned', 'running'].includes(o.status));
    const openTickets = (wf.tickets || []).filter((t) => t.status === 'open');
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
        const isAct = x.month === activeBar.month;
        return `<button type="button" class="v2-bar-col ${isAct ? 'active' : ''}" data-v2-action="admin-bar" data-id="${x.month}" title="Tháng ${x.month}: ${x.total} đơn (${x.done} hoàn thành)">
          <span class="v2-bar-num">${x.total}</span>
          <div class="v2-bar-track">
            <div class="v2-bar-fill" style="height:${Math.max(hPct, x.total ? 12 : 4)}%">
              <span class="v2-bar-done" style="height:${donePct}%"></span>
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
              <div class="v2-q-title">${esc(o.id)} · ${esc(o.material)} (${o.quantity} tấn mẫu)</div>
              <div class="v2-q-sub">${esc(o.from)} → ${esc(o.to)}</div>
            </div>
          </button>`
        )
        .join('') || '<div class="v2-q-sub">Không có đơn chưa phân xe.</div>';

    const firstChange = pendingChanges[0];

    v2Root.innerHTML = `
      <div class="v2-main">
        <div class="v2-top-grid">
          <section class="v2-hero v2-card-light">
            ${buildMapMarkup(s.vehicles, activeOrders, 'Bản đồ đội xe toàn công ty')}
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
                <div class="v2-kpi-top"><span>Chờ duyệt quyền</span><span class="v2-tag v2-tag-amber">${pendingChanges.length}</span></div>
                <strong>${String(pendingChanges.length).padStart(2, '0')}</strong>
              </button>
              <button type="button" class="v2-kpi v2-kpi-green" data-v2-action="admin-page" data-id="tickets">
                <div class="v2-kpi-top"><span>Ticket mở</span><span class="v2-tag v2-tag-green">${openTickets.length}</span></div>
                <strong>${String(openTickets.length).padStart(2, '0')}</strong>
              </button>
            </div>
          </div>
        </div>
        <div class="v2-bottom-row">
          <button type="button" class="v2-tile v2-card-light" data-v2-action="admin-page" data-id="maintenance">
            <div class="v2-tile-top"><span class="v2-tile-ico">${icon('switch-account')}</span><span class="v2-pill-solid-amber">Chờ duyệt</span></div>
            <div><div class="v2-tile-title">Đổi vai trò</div><div class="v2-tile-sub">${pendingChanges.length} hồ sơ chờ phê duyệt</div></div>
          </button>
          <button type="button" class="v2-tile v2-card-dark" data-v2-action="admin-page" data-id="activity">
            <div class="v2-tile-top"><span class="v2-tile-ico">${icon('activity')}</span><span class="v2-dot v2-dot-blue"></span></div>
            <div><div class="v2-tile-title">Hoạt động Điều phối</div><div class="v2-tile-sub">${roles.snapshot().audit.length} thao tác đã ghi nhận</div></div>
          </button>
          <button type="button" class="v2-tile v2-card-light" data-v2-action="admin-page" data-id="tickets">
            <div class="v2-tile-top"><span class="v2-tile-ico">${icon('message')}</span><span class="v2-pill-solid-blue">Chỉ đọc</span></div>
            <div><div class="v2-tile-title">Hồ sơ Ticket</div><div class="v2-tile-sub">${openTickets.length} sự cố đang theo dõi</div></div>
          </button>
          <button type="button" class="v2-tile v2-card-dark" data-v2-action="admin-page" data-id="maintenance">
            <div class="v2-tile-top"><span class="v2-tile-ico">${icon('gear')}</span><span class="v2-dot v2-dot-amber"></span></div>
            <div><div class="v2-tile-title">Yêu cầu bảo trì</div><div class="v2-tile-sub">${pendingMaint.length} phiếu gửi System Admin</div></div>
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
          <button type="button" class="v2-flt-btn active" data-v2-action="admin-page" data-id="fleet">${icon('pin')}<span>Đội xe</span></button>
          <button type="button" class="v2-flt-btn" data-v2-action="admin-page" data-id="approvals">${icon('order')}<span>Nhật ký</span></button>
          <button type="button" class="v2-flt-btn" data-v2-action="admin-page" data-id="tickets">${icon('message')}<span>Ticket</span></button>
          <button type="button" class="v2-flt-btn" data-v2-action="admin-page" data-id="maintenance">${icon('gear')}<span>Bảo trì</span></button>
        </div>
        <div class="v2-action-card v2-card-light">
          <h4>Phê duyệt đổi vai trò</h4>
          <div class="v2-action-l1">${firstChange ? esc(firstChange.name) : 'Không có yêu cầu chờ duyệt'}</div>
          <div class="v2-action-l2">${firstChange ? esc(firstChange.reason) : 'Xem nhật ký hoặc tạo yêu cầu bảo trì'}</div>
          <button type="button" class="v2-action-btn" data-v2-action="admin-page" data-id="maintenance">Xem hồ sơ duyệt</button>
        </div>
      </aside>`;
  }

  function renderSystemAdminBento() {
    const rSnap = roles.snapshot();
    const gov = readJson(GOV_KEY, { changes: [], maintenance: [], jobs: [] });
    const activeUsers = (rSnap.users || []).filter((u) => !u.deleted && u.active);
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
                <div class="v2-kpi-top"><span>Chờ đổi quyền</span><span class="v2-tag v2-tag-amber">${pendingChanges.length}</span></div>
                <strong>${String(pendingChanges.length).padStart(2, '0')}</strong>
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
            <div class="v2-tile-top"><span class="v2-tile-ico">${icon('layers')}</span><span class="v2-dot v2-dot-blue"></span></div>
            <div><div class="v2-tile-title">Thay đổi quyền</div><div class="v2-tile-sub">${pendingChanges.length} yêu cầu đang theo dõi</div></div>
          </button>
          <button type="button" class="v2-tile v2-card-light" data-v2-action="system-page" data-id="connections">
            <div class="v2-tile-top"><span class="v2-tile-ico">${icon('pin')}</span><span class="v2-pill-solid-green">Kết nối</span></div>
            <div><div class="v2-tile-title">Đồng bộ GPS Taris</div><div class="v2-tile-sub">Chu kỳ 10 phút · Kiểm tra kết nối</div></div>
          </button>
          <button type="button" class="v2-tile v2-card-dark" data-v2-action="system-page" data-id="security">
            <div class="v2-tile-top"><span class="v2-tile-ico">${icon('alert')}</span><span class="v2-dot v2-dot-red"></span></div>
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
            <div><div class="v2-q-title">${pendingChanges.length} yêu cầu đổi vai trò</div><div class="v2-q-sub">Thực hiện đúng phạm vi đã duyệt</div></div>
          </button>
          <button type="button" class="v2-q-item" data-v2-action="system-page" data-id="security">
            <span class="v2-dot v2-dot-green"></span>
            <div><div class="v2-q-title">An ninh & nhật ký chỉ đọc</div><div class="v2-q-sub">Đối chiếu bằng chứng đăng nhập</div></div>
          </button>
        </div>
        <div class="v2-flt-row">
          <button type="button" class="v2-flt-btn active" data-v2-action="system-page" data-id="accounts">${icon('switch-account')}<span>Tài khoản</span></button>
          <button type="button" class="v2-flt-btn" data-v2-action="system-page" data-id="changes">${icon('layers')}<span>Quyền</span></button>
          <button type="button" class="v2-flt-btn" data-v2-action="system-page" data-id="connections">${icon('gear')}<span>Kết nối</span></button>
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

  function sync() {
    const role = roles.role();
    const eligible = isDesktop() && !isRoleHome() && role !== 'driver';
    const activeV2 = uiStyle === 'v2' && eligible;
    const showBento = activeV2 && shouldShowBento();

    styleSwitch.querySelectorAll('[data-ui-style]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.uiStyle === uiStyle));
    });

    document.body.classList.toggle('ui-v2', activeV2);
    document.body.classList.toggle('ui-v2-bento-active', showBento);
    v2Root.hidden = !showBento;

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
    if (action === 'dispatch-order') {
      const picker = $('#dispatch-order');
      if (picker && [...picker.options].some((o) => o.value === id)) {
        picker.value = id;
        picker.dispatchEvent(new Event('change', { bubbles: true }));
      }
      $('#assign')?.click();
      return;
    }
    if (action === 'quick-assign') {
      $('#assign')?.click();
      return;
    }
    if (action === 'track-vehicle') {
      const gpsBtn = document.querySelector('.sidebar nav button[data-page="GPS"]');
      gpsBtn?.click();
      setTimeout(() => {
        document.querySelector(`[data-action="gps-select"][data-id="${CSS.escape(id)}"]`)?.click();
      }, 30);
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

  // Đồng bộ lại khi đổi vai trò, đổi trang, cập nhật dữ liệu mẫu hoặc thay đổi kích thước cửa sổ
  window.addEventListener('fleet:role-render', () => requestAnimationFrame(sync));
  window.addEventListener('fleet:render', () => requestAnimationFrame(sync));
  window.addEventListener('fleet:commit', () => requestAnimationFrame(sync));
  window.addEventListener('popstate', () => requestAnimationFrame(sync));
  window.addEventListener('resize', () => requestAnimationFrame(sync));

  sync();
})();
