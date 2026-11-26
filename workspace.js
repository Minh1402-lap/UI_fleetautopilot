/* UI thử nghiệm Fleet Autopilot — dữ liệu vận hành mẫu lưu cục bộ trong trình duyệt, không phải backend thật.
 * Trách nhiệm:
 * - Quản lý đơn hàng (đơn vị chuẩn viên/kg/m³, nhóm ưu tiên khách, phạm vi ≤100 km, hạn giao),
 *   đội xe (Ben / Cẩu / Đầu kéo / xe dự phòng + IMEI Taris mẫu) và tài xế dùng chung cho Mẫu 1, Mẫu 2, Mẫu 3.
 * - Cung cấp các thao tác tiếp nhận đơn, lọc xe phù hợp loại hàng, duyệt phân công V1, xóa đơn có gõ xác nhận "Nhập lại". */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const key = 'fleet-autopilot-workspace-v3', sampleDay = '2026-11-16';
  const stamp = () => new Date().toISOString();
  const time = (value) => value ? new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }) : '—';
  const date = (value) => value ? value.split('-').reverse().join('/') : '—';
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (v) => String(v ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const icon = (name) => `<svg aria-hidden="true"><use href="#${name}"/></svg>`;

  const labels = {
    pending: 'Chờ phân xe',
    assigned: 'Chờ tài xế xác nhận',
    running: 'Đang chạy',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
    ready: 'Sẵn sàng',
    awaiting_check: 'Chờ Điều phối xác nhận sẵn sàng',
    maintenance: 'Bảo trì',
    fresh: 'Có tín hiệu mẫu',
    stale: 'Chưa cập nhật',
    offline: 'Mất tín hiệu mẫu',
    active: 'Đang làm việc',
    off: 'Tạm nghỉ',
  };
  const customerGroups = ['Công trình lớn', 'Vựa VLXD', 'Thầu công trình', 'Khách lẻ'];
  const units = ['m³', 'kg', 'viên'];
  const vehicleTypes = ['Xe ben', 'Xe cẩu lớn', 'Xe cẩu nhỏ', 'Xe đầu kéo'];

  const formatNum = (n) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(Number(n) || 0);
  const qtyText = (o) => `${formatNum(o?.quantity)} ${o?.unit || 'm³'}`;
  const badge = (status, text) => `<span class="badge" data-status="${status === 'ready' || status === 'fresh' || status === 'active' ? 'completed' : status === 'stale' || status === 'maintenance' || status === 'off' ? 'pending' : status === 'offline' || status === 'cancelled' ? 'neutral' : status}"><span class="status-dot" aria-hidden="true"></span><span>${esc(text || labels[status] || status)}</span></span>`;

  // Khớp loại hàng với nhóm xe theo tab gen trong Sheet công ty (Cẩu: gạch; Ben/Đầu kéo: đá, cát, đất, bột đá)
  function cargoMatchesVehicle(material, vehicleType) {
    const m = norm(material), t = norm(vehicleType);
    if (m.includes('gach')) return t.includes('cau');
    if (m.includes('cat') || m.includes('da') || m.includes('dat') || m.includes('bot')) return t.includes('ben') || t.includes('dau keo');
    return true;
  }

  function seed() {
    return {
      version: 3,
      selectedOrder: 'ĐH-1045',
      selectedVehicle: '51C-732.18',
      settings: { company: 'Fleet Autopilot', dispatcher: 'Lê Hoàng Nam', toasts: true, motion: true },
      drivers: [
        { id: 'TX-1', name: 'Tài xế An (mẫu)', phone: '0901-xxx-001', status: 'active' },
        { id: 'TX-2', name: 'Tài xế Bình (mẫu)', phone: '0901-xxx-002', status: 'active' },
        { id: 'TX-3', name: 'Tài xế Châu (mẫu)', phone: '0901-xxx-003', status: 'active' },
        { id: 'TX-4', name: 'Tài xế Dũng (mẫu)', phone: '0901-xxx-004', status: 'active' },
        { id: 'TX-5', name: 'Tài xế Giang (mẫu)', phone: '0901-xxx-005', status: 'active' },
        { id: 'TX-6', name: 'Tài xế Hải (mẫu)', phone: '0901-xxx-006', status: 'active' },
      ],
      vehicles: [
        { plate: '51C-732.18', type: 'Xe ben', cargoNote: 'Đá, cát', capacityText: '15 m³', capacity: 15, eta: 18, availability: 'ready', gps: 'fresh', imei: 'TR-86120401', backup: false, x: 95, y: 205, driverId: 'TX-1', updated: '2026-11-16T03:20:00.000Z' },
        { plate: '51D-110.46', type: 'Xe cẩu lớn', cargoNote: 'Gạch', capacityText: '10.000 viên', capacity: 10000, eta: 21, availability: 'ready', gps: 'fresh', imei: 'TR-86120402', backup: false, x: 220, y: 145, driverId: 'TX-2', updated: '2026-11-16T03:21:00.000Z' },
        { plate: '51C-905.27', type: 'Xe đầu kéo', cargoNote: 'Đá, cát, bột đá', capacityText: '28.000 kg', capacity: 28000, eta: 24, availability: 'ready', gps: 'fresh', imei: 'TR-86120403', backup: false, x: 370, y: 225, driverId: 'TX-3', updated: '2026-11-16T03:19:00.000Z' },
        { plate: '51C-481.66', type: 'Xe ben', cargoNote: 'Đá, cát', capacityText: '15 m³', capacity: 15, eta: 16, availability: 'ready', gps: 'stale', imei: 'TR-86120404', backup: false, x: 455, y: 112, driverId: 'TX-4', updated: '2026-11-16T02:50:00.000Z' },
        { plate: '51D-218.09', type: 'Xe cẩu nhỏ', cargoNote: 'Gạch (dự phòng)', capacityText: '6.000 viên', capacity: 6000, eta: 27, availability: 'ready', gps: 'fresh', imei: 'TR-86120405', backup: true, x: 290, y: 75, driverId: 'TX-5', updated: '2026-11-16T03:22:00.000Z' },
        { plate: '51C-660.25', type: 'Xe ben', cargoNote: 'Đá, cát', capacityText: '15 m³', capacity: 15, eta: 30, availability: 'maintenance', gps: 'offline', imei: 'TR-86120406', backup: false, x: 535, y: 235, driverId: 'TX-6', updated: '2026-11-16T01:10:00.000Z' },
      ],
      orders: [
        { id: 'ĐH-1046', customerGroup: 'Công trình lớn', customer: 'Công trình Bình An (mẫu)', material: 'Đá 1×2', quantity: 15, unit: 'm³', distanceKm: 32, from: 'Mỏ Long Phước', to: 'Công trình Bình An', day: sampleDay, slot: '14:00', deadlineNote: 'Trong ngày', status: 'pending', plate: '', note: '' },
        { id: 'ĐH-1045', customerGroup: 'Công trình lớn', customer: 'Công trình Q.9 (mẫu)', material: 'Cát xây dựng', quantity: 15, unit: 'm³', distanceKm: 24, from: 'Mỏ Tân Hòa', to: 'Công trình Q.9', day: sampleDay, slot: '10:30', deadlineNote: 'Gấp · 10:30', status: 'pending', plate: '', note: '' },
        { id: 'ĐH-1047', customerGroup: 'Vựa VLXD', customer: 'Vựa Minh Phát Q.2 (mẫu)', material: 'Gạch Block nguyên', quantity: 8000, unit: 'viên', distanceKm: 42, from: 'Kho Phú Mỹ', to: 'Vựa Minh Phát Q.2', day: sampleDay, slot: '11:30', deadlineNote: 'Trong 2 ngày', status: 'assigned', workflowStage: 'awaiting', plate: '51D-110.46', note: 'Chờ tài xế xác nhận (không tự hết hạn).' },
        { id: 'ĐH-1044', customerGroup: 'Vựa VLXD', customer: 'Nhà máy Bê tông Q.2 (mẫu)', material: 'Cát nhà máy', quantity: 18500, unit: 'kg', distanceKm: 28, from: 'Mỏ Tân Hòa', to: 'Nhà máy Bê tông Q.2', day: sampleDay, slot: '10:00', deadlineNote: 'Trong ngày', status: 'running', workflowStage: 'delivered', actualQuantity: 18500, plate: '51C-481.66', note: 'Đã gửi ảnh 2 đầu · Chờ Điều phối kiểm tra duyệt hoàn thành.' },
        { id: 'ĐH-1043', customerGroup: 'Thầu công trình', customer: 'Thầu Nam Long Q.9 (mẫu)', material: 'Gạch tuynel', quantity: 6000, unit: 'viên', distanceKm: 19, from: 'Kho Long Phước', to: 'Công trình Q.9', day: sampleDay, slot: '09:00', deadlineNote: 'Hoàn thành', status: 'completed', workflowStage: 'completed', completedAt: '2026-11-16T02:57:00.000Z', plate: '51D-218.09', note: '' },
        { id: 'ĐH-1042', customerGroup: 'Khách lẻ', customer: 'Khách lẻ (chưa bắt buộc tên)', material: 'Đất đắp', quantity: 15, unit: 'm³', distanceKm: 18, from: 'Mỏ Phước Bình', to: 'Thủ Đức', day: '2026-11-15', slot: '16:00', deadlineNote: 'Hoàn thành', status: 'completed', workflowStage: 'completed', completedAt: '2026-11-15T09:10:00.000Z', plate: '51C-905.27', note: '' },
      ],
      activity: [
        { text: 'Phân công mẫu 51D-110.46 cho ĐH-1047', detail: '8.000 viên gạch Block · Đang chờ tài xế xác nhận', actor: 'Lê Hoàng Nam', at: '2026-11-16T03:26:00.000Z' },
        { text: 'Xe 51C-481.66 gửi bằng chứng 2 đầu cho ĐH-1044', detail: '18.500 kg cát nhà máy · Chờ Điều phối duyệt hoàn thành', actor: 'Tài xế Dũng (mẫu)', at: '2026-11-16T03:24:00.000Z' },
        { text: 'Hoàn thành đơn ĐH-1043', detail: 'Đã giao 6.000 viên gạch tuynel · Xác nhận xe 51D-218.09 sẵn sàng', actor: 'Lê Hoàng Nam', at: '2026-11-16T02:57:00.000Z' },
      ],
    };
  }

  function valid(s) {
    return (
      s?.version === 3 &&
      Array.isArray(s.orders) &&
      Array.isArray(s.vehicles) &&
      Array.isArray(s.drivers) &&
      Array.isArray(s.activity) &&
      s.settings &&
      s.orders.every((o) => o && typeof o.id === 'string' && typeof o.material === 'string' && Number.isFinite(o.quantity) && o.quantity > 0 && ['pending', 'assigned', 'running', 'completed', 'cancelled'].includes(o.status) && typeof o.day === 'string') &&
      s.vehicles.every((v) => v && typeof v.plate === 'string' && Number.isFinite(v.x) && Number.isFinite(v.y)) &&
      s.drivers.every((d) => d && typeof d.id === 'string' && typeof d.name === 'string')
    );
  }

  let state = seed(), storageFailed = false;
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (valid(saved)) state = saved;
  } catch {}

  const routes = { overview: 'Tổng quan', orders: 'Đơn hàng', dispatch: 'Điều phối', fleet: 'Xe & tài xế', gps: 'GPS', reports: 'Báo cáo' };
  const routeKeys = Object.keys(routes), navToRoute = Object.fromEntries(Object.entries(routes).map(([k, v]) => [v, k]));
  let page = routeKeys.includes(new URLSearchParams(location.search).get('page')) ? new URLSearchParams(location.search).get('page') : 'dispatch';
  if (new URLSearchParams(location.search).get('page') === 'settings') {
    const url = new URL(location.href);
    url.searchParams.set('page', 'dispatch');
    history.replaceState(null, '', url);
  }
  let orderQuery = '', orderStatus = 'all', orderDay = '', orderPage = 1, fleetQuery = '', fleetFilter = 'all', fleetTab = 'vehicles', reportTab = 'orders', gpsFilter = 'all', gpsPlate = state.vehicles[0]?.plate, gpsZoom = 1, mapZoom = 1;
  const orderPageSize = 5;
  // Mặc định lọc trọn tháng của ngày mẫu để khớp báo cáo theo tháng
  let reportFrom = '2026-11-01', reportTo = '2026-11-30', toastTimer, onConfirm = null;
  const modal = $('#modal'), title = $('#modal-title'), copy = $('#modal-copy'), content = $('#modal-content'), confirm = $('#confirm-modal'), searchModal = $('#search-modal');

  function toast(text) {
    if (!state.settings.toasts) return;
    clearTimeout(toastTimer);
    $('#toast').textContent = text;
    $('#toast').hidden = false;
    toastTimer = setTimeout(() => ($('#toast').hidden = true), 3200);
  }
  function formError(text) {
    const el = $('#editor-error');
    if (el) { el.hidden = false; el.textContent = text; }
  }
  function save() {
    try { localStorage.setItem(key, JSON.stringify(state)); storageFailed = false; }
    catch { storageFailed = true; $('#toast').hidden = false; $('#toast').textContent = 'Trình duyệt chưa lưu được dữ liệu. Thay đổi hiện chỉ ở phiên này.'; }
  }
  function log(text, detail = '', actor = state.settings.dispatcher) {
    state.activity.unshift({ text, detail, actor, at: stamp() });
    state.activity = state.activity.slice(0, 60);
  }
  function commit(text, detail = '', actor = state.settings.dispatcher) {
    if (text) log(text, detail, actor);
    save();
    render();
    window.dispatchEvent(new CustomEvent('fleet:commit', { detail: { text, detail, actor } }));
  }
  function order(id) { return state.orders.find((o) => o.id === id); }
  function vehicle(plate) { return state.vehicles.find((v) => v.plate === plate); }
  function driver(id) { return state.drivers.find((d) => d.id === id); }
  function activeOrder(plate) { return state.orders.find((o) => o.plate === plate && ['assigned', 'running'].includes(o.status)); }
  function vehicleStatus(v) { return activeOrder(v.plate)?.status || v.availability; }
  function counts() {
    return {
      pending: state.orders.filter((o) => o.status === 'pending').length,
      assigned: state.orders.filter((o) => o.status === 'assigned').length,
      running: state.orders.filter((o) => o.status === 'running').length,
      completed: state.orders.filter((o) => o.status === 'completed').length,
      ready: state.vehicles.filter((v) => vehicleStatus(v) === 'ready').length,
    };
  }
  function candidates(o) {
    if (!o) return [];
    // Lọc điều kiện cứng: xe sẵn sàng, tài xế đang làm việc, loại xe phù hợp loại hàng (không tự khóa công thức công bằng)
    return state.vehicles.filter((v) => vehicleStatus(v) === 'ready' && driver(v.driverId)?.status === 'active' && cargoMatchesVehicle(o.material, v.type));
  }
  function alerts() {
    const vehicleAlerts = state.vehicles.flatMap((v) => [
      ...(v.availability === 'maintenance' ? [{ kind: 'maintenance', title: v.plate + ' đang bảo trì', text: 'Kiểm tra trước khi đưa xe trở lại hoạt động.', plate: v.plate }] : []),
      ...(v.availability === 'awaiting_check' ? [{ kind: 'check', title: v.plate + ' chờ xác nhận sẵn sàng', text: 'Cần Điều phối xác nhận trước khi nhận chuyến mới.', plate: v.plate }] : []),
      ...(v.gps === 'stale' ? [{ kind: 'stale', title: v.plate + ' chưa cập nhật GPS Taris', text: 'Chu kỳ 10 phút · Kiểm tra tín hiệu trước khi gọi tài xế.', plate: v.plate }] : []),
    ]);
    // Cảnh báo hạn giao (deadline) khi đơn chờ chưa có xe phù hợp theo Sheet Q&A
    const deadlineAlerts = state.orders
      .filter((o) => o.status === 'pending' && candidates(o).length === 0)
      .map((o) => ({ kind: 'deadline', title: `${o.id} chưa có xe phù hợp`, text: `Hạn giao: ${date(o.day)} ${o.slot || ''} (${o.deadlineNote || 'cần theo dõi'})`, orderId: o.id }));
    return [...deadlineAlerts, ...vehicleAlerts];
  }
  function selectedOrder() {
    return state.orders.find((o) => o.id === state.selectedOrder && o.status !== 'cancelled') || state.orders.find((o) => o.status === 'pending') || state.orders.find((o) => o.status !== 'cancelled');
  }
  function openModal(name, text, extra = null, action = null, actionLabel = 'Xác nhận mô phỏng') {
    modal.classList.remove('assignment-review', 'attention-review');
    modal.querySelector('.attention-note')?.remove();
    $('#cancel-modal').textContent = 'Đóng';
    confirm.textContent = actionLabel;
    title.textContent = name;
    copy.textContent = text;
    content.replaceChildren();
    if (extra) content.append(extra);
    onConfirm = action;
    confirm.hidden = !action;
    if (!modal.open) modal.showModal();
  }
  function htmlNode(html) { const el = document.createElement('div'); el.innerHTML = html; return el; }

  function showAttention() {
    const items = alerts();
    const rows = items.map((a) => {
      const stale = a.kind === 'stale', deadline = a.kind === 'deadline', o = a.plate ? activeOrder(a.plate) : null;
      const context = deadline ? a.text : stale ? (o ? `Đang thực hiện đơn <strong>${esc(o.id)}</strong> · ${esc(o.from)} → ${esc(o.to)}` : 'Chưa có chuyến đang thực hiện.') : a.text;
      return `<article class="attention-item"><div class="attention-priority${stale || deadline ? '' : ' watch'}"><i aria-hidden="true"></i>${deadline ? 'Cảnh báo hạn giao' : stale ? 'Cần kiểm tra GPS' : 'Cần theo dõi'}</div><h3>${esc(a.title)}</h3><p>${context}</p>${deadline ? actionButton('Xem đơn →', 'detail-order', a.orderId, 'attention-link') : actionButton(icon(stale ? 'pin' : 'truck') + (stale ? 'Xem hành trình' : 'Xem xe') + ' <span aria-hidden="true">→</span>', stale ? 'track-vehicle' : 'detail-vehicle', a.plate, 'attention-link')}</article>`;
    }).join('');
    openModal('Cần xử lý', items.length ? 'Kiểm tra các vấn đề ảnh hưởng đến điều phối và hạn giao.' : 'Hiện không có mục cần xử lý trong dữ liệu mẫu.', htmlNode(rows));
    modal.classList.add('attention-review');
    title.insertAdjacentHTML('beforeend', `<span class="attention-count">${items.length} mục</span>`);
    const note = htmlNode(`<span class="attention-note">${icon('alert')}Dữ liệu mô phỏng · Chưa kết nối GPS Taris</span>`).firstElementChild;
    modal.querySelector('.modal-actions').prepend(note);
  }

  function closeModal() { modal.close(); onConfirm = null; }
  $('#close-modal').onclick = closeModal;
  $('#cancel-modal').onclick = closeModal;
  confirm.onclick = () => {
    const action = onConfirm;
    if (action && action() === false) return;
    if (action === reset) window.dispatchEvent(new Event('fleet:reset'));
    closeModal();
  };
  modal.addEventListener('close', () => { onConfirm = null; });
  for (const dialog of [modal, searchModal]) {
    dialog.addEventListener('click', (e) => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
    });
  }

  function setPage(next, { push = true, focus = false } = {}) {
    if (!routeKeys.includes(next)) return;
    page = next;
    if (push) {
      const url = new URL(location.href);
      url.searchParams.delete('flow');
      url.searchParams.set('page', next);
      history.pushState(null, '', url);
    }
    render();
    window.scrollTo(0, 0);
    if (focus) $('#main').focus({ preventScroll: true });
  }
  window.addEventListener('popstate', () => {
    const value = new URLSearchParams(location.search).get('page');
    setPage(routeKeys.includes(value) ? value : 'dispatch', { push: false });
  });
  $$('[data-page]').forEach((button) => {
    button.disabled = false;
    button.title = button.dataset.page;
    button.onclick = () => setPage(navToRoute[button.dataset.page], { focus: true });
  });

  function actionButton(label, action, id, className = 'text-button') {
    return `<button type="button" class="${className}" data-action="${action}"${id ? ` data-id="${esc(id)}"` : ''}>${label}</button>`;
  }
  function pageHead(kicker, name, subtitle, actions = '', ico = 'order') {
    return `<section class="page-heading"><span class="heading-icon">${icon(ico)}</span><h1>${name}</h1><p>${subtitle}</p></section>${actions ? `<div class="workspace-actions-bar" aria-label="${esc(kicker)}">${actions}</div>` : ''}`;
  }
  function metric(label, value, symbol, action) {
    const tag = action ? 'button' : 'div';
    return `<${tag} class="stat"${action ? ` data-action="${action}"` : ''}><span class="stat-icon">${icon(symbol)}</span><span>${label}<strong>${value}</strong></span></${tag}>`;
  }
  function empty(text, action = '') {
    return `<div class="empty-state">${icon('order')}<strong>${text}</strong><p>Thử thay đổi bộ lọc hoặc thêm dữ liệu mẫu.</p>${action}</div>`;
  }
  function timeline(limit = 5) {
    return `<ol class="timeline workspace-timeline">${[...state.activity].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, limit).map((a) => `<li><div><strong>${esc(a.text)}</strong><p>${esc(a.detail)}</p></div><time>${time(a.at)}</time></li>`).join('')}</ol>`;
  }

  function orderRows(list, compact = false, readOnly = false) {
    return list.map((o) => `<tr>
      <td>${actionButton(esc(o.id), 'detail-order', o.id)}<small>${esc(o.customerGroup || 'Khách')} · ${esc(o.customer || 'Khách lẻ')}</small></td>
      <td>${esc(o.material)}<small>${esc(qtyText(o))}${o.distanceKm ? ` · ${o.distanceKm} km` : ''}</small></td>
      <td><span class="route-cell" title="${esc(o.from + ' → ' + o.to)}">${esc(o.from)} <span>→</span> ${esc(o.to)}</span></td>
      ${compact ? '' : `<td>${date(o.day)}<small>${esc(o.slot || 'Chưa đặt giờ')}${o.deadlineNote ? ' · ' + esc(o.deadlineNote) : ''}</small></td>`}
      <td>${badge(o.status)}</td>
      <td>${!readOnly && o.status === 'pending' ? actionButton('Phân xe →', 'dispatch-order', o.id) : !readOnly && ['assigned', 'running'].includes(o.status) ? `<button type="button" class="text-button" data-workflow-action="trip-review" data-id="${esc(o.id)}">Kiểm chuyến →</button>` : actionButton('Chi tiết →', 'detail-order', o.id)}</td>
    </tr>`).join('');
  }
  function ordersTable(list, compact = false, readOnly = false) {
    return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Đơn hàng / nhóm khách</th><th>Vật liệu & đơn vị</th><th>Hành trình</th>${compact ? '' : '<th>Hạn giao mẫu</th>'}<th>Trạng thái</th><th><span class="sr-only">Thao tác</span></th></tr></thead><tbody>${orderRows(list, compact, readOnly)}</tbody></table></div>`;
  }

  function overview() {
    const c = counts(), a = alerts(), active = state.orders.filter((o) => !['completed', 'cancelled'].includes(o.status));
    return pageHead('KHÔNG GIAN VẬN HÀNH', 'Tổng quan vận chuyển', 'Theo dõi đơn hàng, trạng thái xác nhận tài xế, đội xe và việc cần làm trong dữ liệu mẫu.', actionButton('Tiếp nhận đơn', 'new-order', null, 'primary'), 'home') +
      `<div class="stats workspace-stats">${metric('Chờ phân xe', c.pending, 'order', 'go-orders-pending')}${metric('Chờ TX xác nhận', c.assigned, 'alert', 'go-orders-assigned')}${metric('Đang chạy', c.running, 'truck', 'go-gps')}${metric('Xe sẵn sàng', c.ready, 'truck', 'go-fleet')}</div>
      <div class="workspace-columns"><section class="panel"><div class="panel-heading"><h2>${icon('order')}Đơn cần theo dõi</h2>${actionButton('Tất cả đơn →', 'go-orders')}</div>${active.length ? ordersTable(active, true) : empty('Chưa có đơn đang xử lý.')}</section>
      <section class="panel attention-panel"><div class="panel-heading"><h2>${icon('alert')}Cần chú ý</h2><span class="count-label">${a.length} mục mẫu</span></div>${a.map((item) => `<button class="attention-row" data-action="${item.kind === 'deadline' ? 'detail-order' : item.kind === 'stale' ? 'track-vehicle' : 'detail-vehicle'}" data-id="${esc(item.orderId || item.plate)}"><span class="attention-dot"></span><span><strong>${esc(item.title)}</strong><small>${esc(item.text)}</small></span><span class="attention-target">${item.kind === 'deadline' ? 'Đơn ↗' : item.kind === 'stale' ? 'GPS ↗' : 'Chi tiết ↗'}</span></button>`).join('') || '<p class="subtle">Không có mục cần chú ý.</p>'}<p class="section-note">Cảnh báo hạn giao và tín hiệu GPS Taris (chu kỳ 10 phút) trên dữ liệu mẫu.</p></section></div>
      <div class="workspace-columns equal"><section class="panel"><div class="panel-heading"><h2>${icon('chart')}Tình hình đơn hàng</h2><span class="subtle">Toàn bộ dữ liệu mẫu</span></div>${['pending', 'assigned', 'running', 'completed', 'cancelled'].map((s) => { const n = state.orders.filter((o) => o.status === s).length; return `<div class="distribution-row"><span>${labels[s]}</span><div class="bar-track"><i style="width:${state.orders.length ? n / state.orders.length * 100 : 0}%"></i></div><strong>${n}</strong></div>`; }).join('')}</section>
      <section class="panel"><div class="panel-heading"><h2>${icon('activity')}Hoạt động gần đây</h2><span class="subtle">Lưu trong trình duyệt</span></div>${timeline(4)}</section></div>`;
  }

  function ordersView() {
    const list = state.orders.filter((o) => (orderStatus === 'all' || o.status === orderStatus) && (!orderDay || o.day === orderDay) && norm(Object.values(o).join(' ')).includes(norm(orderQuery)));
    const totalPages = Math.max(1, Math.ceil(list.length / orderPageSize));
    if (orderPage > totalPages) orderPage = totalPages;
    const paged = list.slice((orderPage - 1) * orderPageSize, orderPage * orderPageSize);
    const pendingList = state.orders.filter((o) => o.status === 'pending');
    const activeList = state.orders.filter((o) => ['assigned', 'running'].includes(o.status));
    const doneList = state.orders.filter((o) => ['completed', 'cancelled'].includes(o.status));
    const priorityGroups = ['Công trình lớn', 'Vựa', 'Thầu công trình', 'Khách lẻ'];
    const compactOrderList = (items, emptyText, mode) =>
      items.length
        ? `<div class="bento-mini-list">${items
            .slice(0, 5)
            .map(
              (o) => `<div class="bento-mini-row">
                <div class="bento-mini-main">
                  <strong>${actionButton(esc(o.id), 'detail-order', o.id)} · ${esc(o.material)} (${esc(qtyText(o))})</strong>
                  <small>${esc(o.customerGroup || 'Khách')} · ${esc(o.from)} → ${esc(o.to)}${o.plate ? ` · ${esc(o.plate)}` : ''}</small>
                </div>
                <div class="bento-mini-side">
                  ${badge(o.status)}
                  ${
                    mode === 'pending'
                      ? actionButton('Phân xe →', 'dispatch-order', o.id)
                      : mode === 'active'
                      ? `<button type="button" class="text-button" data-workflow-action="trip-review" data-id="${esc(o.id)}">Kiểm chuyến →</button>`
                      : actionButton('Chi tiết →', 'detail-order', o.id)
                  }
                </div>
              </div>`
            )
            .join('')}</div>`
        : `<p class="subtle">${emptyText}</p>`;

    return pageHead('QUẢN LÝ VẬN CHUYỂN', 'Đơn hàng', 'Tiếp nhận từ Sale, phân loại nhóm ưu tiên (Công trình lớn → Vựa → Thầu → Lẻ) và theo dõi đơn vị chuẩn.', actionButton('Xuất CSV', 'export-orders', null, 'secondary') + actionButton('+ Tiếp nhận đơn', 'new-order', null, 'primary'), 'order') +
      `<div class="stats workspace-stats">${metric('Chờ phân xe', pendingList.length, 'order', 'go-orders-pending')}${metric('Chờ TX xác nhận', state.orders.filter((o) => o.status === 'assigned').length, 'alert', 'go-orders-assigned')}${metric('Đang chạy', state.orders.filter((o) => o.status === 'running').length, 'truck')}${metric('Hoàn thành', state.orders.filter((o) => o.status === 'completed').length, 'layers')}</div>
      <div class="workspace-columns equal">
        <section class="panel v2-card-dark"><div class="panel-heading"><h2>${icon('order')}Đơn chờ phân xe</h2><span class="count-label">${pendingList.length} đơn</span></div>${compactOrderList(pendingList, 'Hiện không có đơn chờ phân xe.', 'pending')}</section>
        <section class="panel v2-card-light"><div class="panel-heading"><h2>${icon('truck')}Đang chạy & Chờ tài xế</h2><span class="count-label">${activeList.length} đơn</span></div>${compactOrderList(activeList, 'Hiện không có chuyến đang chạy hoặc chờ tài xế.', 'active')}</section>
      </div>
      <div class="workspace-columns equal">
        <section class="panel v2-card-light"><div class="panel-heading"><h2>${icon('chart')}Nhóm ưu tiên khách hàng</h2><span class="subtle">Thứ tự V1</span></div>${priorityGroups.map((g) => { const n = state.orders.filter((o) => (o.customerGroup || '').toLowerCase().includes(g.toLowerCase().split(' ')[0])).length; return `<div class="distribution-row"><span>${g}</span><div class="bar-track"><i style="width:${state.orders.length ? n / state.orders.length * 100 : 0}%"></i></div><strong>${n}</strong></div>`; }).join('')}<p class="section-note">Ưu tiên: Công trình lớn → Vựa → Thầu công trình → Khách lẻ.</p></section>
        <section class="panel v2-card-dark"><div class="panel-heading"><h2>${icon('layers')}Hoàn thành & Đã hủy</h2><span class="count-label">${doneList.length} đơn</span></div>${compactOrderList(doneList, 'Chưa có đơn hoàn thành hoặc đã hủy.', 'done')}</section>
      </div>
      <section class="panel v2-card-dark"><div class="panel-heading"><h2>${icon('order')}Toàn bộ sổ đơn & Bộ lọc</h2><span class="count-label">${list.length} đơn</span></div><p id="order-source-note" class="workflow-source">Sale gửi thông tin qua kênh ngoài website; Điều phối tiếp nhận đơn (≤100 km, đơn vị viên/kg/m³) tại đây.</p><div class="filter-bar"><label class="field search-field"><span>Tìm đơn hàng</span><input id="orders-query" type="search" placeholder="Mã đơn, nhóm khách, vật liệu, hành trình…" value="${esc(orderQuery)}"></label><label class="field"><span>Trạng thái</span><select id="orders-status"><option value="all">Tất cả trạng thái</option>${['pending', 'assigned', 'running', 'completed', 'cancelled'].map((k) => `<option value="${k}" ${orderStatus === k ? 'selected' : ''}>${labels[k]}</option>`).join('')}</select></label><label class="field"><span>Ngày giao mẫu</span><input id="orders-day" type="date" value="${esc(orderDay)}"></label>${actionButton('Xóa lọc', 'clear-order-filters', null, 'secondary')}</div>
      <div class="results-heading"><strong>${list.length} đơn hàng</strong><span>Trang ${orderPage}/${totalPages} · Gạch: viên · Cát/đá nhà máy: kg · Thông thường: m³ · Phạm vi ≤100 km</span></div>
      ${paged.length ? ordersTable(paged) + `<div class="table-pagination" aria-label="Phân trang đơn hàng"><span>Hiển thị ${(orderPage - 1) * orderPageSize + 1}–${Math.min(orderPage * orderPageSize, list.length)} / ${list.length} đơn</span><div class="pagination-controls"><button type="button" class="secondary" data-action="order-page-prev" ${orderPage <= 1 ? 'disabled' : ''}>← Trang trước</button><span>Trang ${orderPage} / ${totalPages}</span><button type="button" class="secondary" data-action="order-page-next" ${orderPage >= totalPages ? 'disabled' : ''}>Trang sau →</button></div></div>` : empty('Không tìm thấy đơn phù hợp.', actionButton('Tạo đơn mới', 'new-order', null, 'secondary'))}
      <p class="section-note">Xóa/hủy đơn yêu cầu gõ xác nhận mã đơn ("Nhập lại") và ghi nhận lịch sử.</p></section>`;
  }

  function fleetView() {
    const vehicles = state.vehicles.filter((v) => (fleetFilter === 'all' || vehicleStatus(v) === fleetFilter) && norm(v.plate + ' ' + (driver(v.driverId)?.name || '') + ' ' + v.type + ' ' + (v.cargoNote || '')).includes(norm(fleetQuery)));
    const drivers = state.drivers.filter((d) => norm(d.name + ' ' + d.id + ' ' + d.phone).includes(norm(fleetQuery)));
    const readyCount = state.vehicles.filter((v) => vehicleStatus(v) === 'ready').length;
    const activeVehCount = state.vehicles.filter((v) => ['assigned', 'running'].includes(vehicleStatus(v))).length;
    const activeDrvCount = state.drivers.filter((d) => d.status === 'active').length;
    const gpsFresh = state.vehicles.filter((v) => v.gps === 'fresh').length;
    const gpsStale = state.vehicles.filter((v) => v.gps === 'stale').length;
    const gpsOffline = state.vehicles.filter((v) => v.gps === 'offline').length;
    const maintCount = state.vehicles.filter((v) => ['maintenance', 'awaiting_check'].includes(vehicleStatus(v))).length;
    const typeCounts = [
      ['Xe ben', state.vehicles.filter((v) => /ben/i.test(v.type)).length],
      ['Xe cẩu', state.vehicles.filter((v) => /cẩu/i.test(v.type)).length],
      ['Xe đầu kéo', state.vehicles.filter((v) => /đầu kéo/i.test(v.type)).length],
      ['Xe dự phòng', state.vehicles.filter((v) => v.backup).length],
    ];

    const tabSwitch = `<div class="v2-fleet-tabs" role="tablist" aria-label="Chuyển bảng xe và tài xế"><button type="button" role="tab" class="v2-fleet-tab ${fleetTab === 'vehicles' ? 'active' : ''}" data-action="fleet-tab" data-id="vehicles" aria-selected="${fleetTab === 'vehicles'}">Đội xe (${vehicles.length})</button><button type="button" role="tab" class="v2-fleet-tab ${fleetTab === 'drivers' ? 'active' : ''}" data-action="fleet-tab" data-id="drivers" aria-selected="${fleetTab === 'drivers'}">Tài xế (${drivers.length})</button></div>`;
    const fleetFilterBar = `<div class="filter-bar fleet-inline-filter">${tabSwitch}<label class="field search-field"><span>Tìm nhanh xe hoặc tài xế</span><input id="fleet-query" type="search" placeholder="Biển số, loại xe, tên tài xế hoặc số điện thoại…" value="${esc(fleetQuery)}"></label><label class="field"><span>Tình trạng xe</span><select id="fleet-status"><option value="all">Tất cả</option>${['ready', 'assigned', 'running', 'awaiting_check', 'maintenance'].map((s) => `<option value="${s}" ${fleetFilter === s ? 'selected' : ''}>${labels[s]}</option>`).join('')}</select></label></div>`;
    return pageHead('NGUỒN LỰC VẬN CHUYỂN', 'Xe & tài xế', 'Phân loại Ben / Cẩu / Đầu kéo khớp loại hàng, xe dự phòng và mã thiết bị GPS Taris mẫu.', actionButton('+ Thêm xe', 'new-vehicle', null, 'primary') + actionButton('+ Thêm tài xế', 'new-driver', null, 'secondary') + actionButton('Xuất CSV xe', 'export-fleet', null, 'secondary') + actionButton('Xuất CSV tài xế', 'export-drivers', null, 'secondary'), 'truck') +
      `<div class="stats workspace-stats">${metric('Tổng đội xe', state.vehicles.length, 'truck')}${metric('Xe sẵn sàng', readyCount, 'layers')}${metric('Đang chạy / Chờ TX', activeVehCount, 'pin')}${metric('Tài xế hoạt động', activeDrvCount, 'switch-account')}</div>
      <div class="workspace-columns fleet-bento-cols">
        <section class="panel v2-card-light"><div class="panel-heading"><h2>${icon('truck')}Đội xe vận chuyển</h2><span class="count-label">${vehicles.length} xe</span></div>${fleetTab === 'vehicles' ? fleetFilterBar : ''}${vehicles.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Xe / loại</th><th>Hàng phù hợp & sức chứa</th><th>Tài xế</th><th>Tình trạng</th><th>GPS mẫu</th><th>Thao tác</th></tr></thead><tbody>${vehicles.map((v) => { const d = driver(v.driverId); return `<tr><td>${actionButton(esc(v.plate), 'detail-vehicle', v.plate)}<small>${esc(v.type)}${v.backup ? ' · Dự phòng' : ''}</small></td><td>${esc(v.cargoNote || '—')}<small>${esc(v.capacityText || '—')}</small></td><td>${d ? `<strong>${esc(d.name)}</strong><small>${esc(d.id)}</small>` : 'Chưa gán'}</td><td>${badge(vehicleStatus(v))}</td><td>${badge(v.gps)}</td><td>${actionButton('GPS', 'track-vehicle', v.plate)} · ${actionButton('Sửa', 'edit-vehicle', v.plate)}${v.availability === 'awaiting_check' ? ` · <button type="button" class="text-button" data-workflow-action="vehicle-ready" data-id="${esc(v.plate)}">Xác nhận sẵn sàng</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>` : empty('Không có xe phù hợp.')}</section>
        <section class="panel v2-card-dark"><div class="panel-heading"><h2>${icon('switch-account')}Danh sách tài xế</h2><span class="count-label">${drivers.length} tài xế</span></div>${fleetTab === 'drivers' ? fleetFilterBar : ''}${drivers.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Tài xế</th><th>Xe đang gắn</th><th>Liên hệ</th><th>Tình trạng</th><th>Thao tác</th></tr></thead><tbody>${drivers.map((d) => { const attached = state.vehicles.find((v) => v.driverId === d.id); return `<tr><td><strong>${esc(d.name)}</strong><small>${esc(d.id)}</small></td><td>${attached ? actionButton(esc(attached.plate), 'detail-vehicle', attached.plate) + `<small>${esc(attached.type)}</small>` : 'Chưa gắn xe'}</td><td>${esc(d.phone || 'Chưa có')}</td><td>${badge(d.status)}</td><td>${actionButton('Sửa', 'edit-driver', d.id)}</td></tr>`; }).join('')}</tbody></table></div>` : empty('Không có tài xế phù hợp.')}</section>
      </div>
      <div class="workspace-columns equal">
        <section class="panel v2-card-dark"><div class="panel-heading"><h2>${icon('pin')}Tín hiệu GPS Taris & Bảo trì</h2><span class="subtle">Chu kỳ 10 phút</span></div><div class="distribution-row"><span>Có tín hiệu mẫu</span><div class="bar-track"><i style="width:${state.vehicles.length ? gpsFresh / state.vehicles.length * 100 : 0}%"></i></div><strong>${gpsFresh}</strong></div><div class="distribution-row"><span>Chưa cập nhật</span><div class="bar-track"><i style="width:${state.vehicles.length ? gpsStale / state.vehicles.length * 100 : 0}%"></i></div><strong>${gpsStale}</strong></div><div class="distribution-row"><span>Mất tín hiệu mẫu</span><div class="bar-track"><i style="width:${state.vehicles.length ? gpsOffline / state.vehicles.length * 100 : 0}%"></i></div><strong>${gpsOffline}</strong></div><div class="distribution-row"><span>Bảo trì / Chờ kiểm tra</span><div class="bar-track"><i style="width:${state.vehicles.length ? maintCount / state.vehicles.length * 100 : 0}%"></i></div><strong>${maintCount}</strong></div></section>
        <section class="panel v2-card-light"><div class="panel-heading"><h2>${icon('layers')}Phân loại xe & Quy tắc ghép hàng</h2><span class="subtle">Đội xe</span></div>${typeCounts.map(([label, n]) => `<div class="distribution-row"><span>${label}</span><div class="bar-track"><i style="width:${state.vehicles.length ? n / state.vehicles.length * 100 : 0}%"></i></div><strong>${n}</strong></div>`).join('')}<p class="section-note">Cẩu chở gạch; Ben chở đá/cát; Đầu kéo chở đá/cát/bột đá. Xe dự phòng dùng khi tài xế rảnh thay xe bảo trì.</p></section>
      </div>`;
  }

  function gpsView() {
    const list = state.vehicles.filter((v) => gpsFilter === 'all' || v.gps === gpsFilter);
    if (!list.some((v) => v.plate === gpsPlate)) gpsPlate = list[0]?.plate;
    const v = vehicle(gpsPlate), o = v ? activeOrder(v.plate) : null;
    const canDispatch = v && vehicleStatus(v) === 'ready' && driver(v.driverId)?.status === 'active' && state.orders.some((x) => x.status === 'pending' && cargoMatchesVehicle(x.material, v.type));
    return pageHead('THEO DÕI HÀNH TRÌNH', 'GPS & vị trí xe', 'Sơ đồ mô phỏng · Nguồn GPS Taris tối đa 1 lần/10 phút (chưa kết nối API thật).', actionButton('Cập nhật vị trí mẫu', 'simulate-gps', null, 'secondary'), 'pin') +
      `<div class="gps-workspace"><section class="panel gps-list"><div class="panel-heading"><h2>${icon('truck')}Đội xe</h2><span class="count-label">${list.length} xe</span></div><label class="field"><span>Lọc tín hiệu mẫu</span><select id="gps-filter"><option value="all">Tất cả tín hiệu</option>${['fresh', 'stale', 'offline'].map((s) => `<option value="${s}" ${gpsFilter === s ? 'selected' : ''}>${labels[s]}</option>`).join('')}</select></label><div class="gps-vehicle-list">${list.map((x) => `<button id="gps-list-${esc(encodeURIComponent(x.plate))}" class="gps-vehicle ${x.plate === gpsPlate ? 'selected' : ''}" aria-pressed="${x.plate === gpsPlate}" data-action="gps-select" data-id="${esc(x.plate)}"><span><strong>${esc(x.plate)}</strong><small>${esc(x.type)} · ${esc(driver(x.driverId)?.name || 'Chưa có tài xế')}</small></span>${badge(x.gps)}</button>`).join('') || '<p class="subtle">Không có xe phù hợp.</p>'}</div></section>
      <section class="panel"><div class="panel-heading"><h2>${icon('pin')}Sơ đồ vị trí mẫu</h2><span class="subtle">Tách riêng GPS xe Taris & GPS điện thoại</span></div>
      <div class="map workspace-map"><svg class="fleet-map" viewBox="0 0 620 300" role="group" aria-label="Sơ đồ minh họa vị trí các xe trong dữ liệu mẫu"><rect width="620" height="300"/><g class="map-roads" fill="none"><path d="M-20 90 170 10 350 90 650 20M0 210 160 130 360 200 650 120M100 0 220 300M240-20 370 300M390 0 520 300M530-20 650 230M-20 270 220 170 470 280 640 210M0 145 180 70 460 150 620 85"/></g><path class="map-river" d="M330-20C300 60 450 25 385 95S470 165 440 220 400 260 455 330" fill="none"/>${list.map((x) => `<g id="gps-marker-${esc(encodeURIComponent(x.plate))}" role="button" tabindex="0" aria-label="Chọn xe ${esc(x.plate)}" data-action="gps-select" data-id="${esc(x.plate)}" class="fleet-marker ${x.plate === gpsPlate ? 'chosen' : ''}" transform="translate(${x.x},${x.y})"><circle r="${x.plate === gpsPlate ? 9 : 6}"/><rect x="-41" y="14" width="82" height="20" rx="4"/><text text-anchor="middle" y="27">${esc(x.plate)}</text></g>`).join('')}</svg><div class="map-tools"><button data-action="gps-in" aria-label="Phóng to sơ đồ" ${gpsZoom >= 1.6 ? 'disabled' : ''}>+</button><button data-action="gps-out" aria-label="Thu nhỏ sơ đồ" ${gpsZoom <= 1 ? 'disabled' : ''}>−</button></div><span class="map-caption">Vị trí mẫu · GPS Taris chu kỳ 10 phút</span></div>
      ${v ? `<div class="gps-summary"><div><span class="review-label">Xe đang chọn</span><strong>${esc(v.plate)} · ${esc(v.type)} (${esc(v.capacityText)})</strong></div><div><span class="review-label">Đơn đang thực hiện</span><strong>${o ? esc(o.id) + ' (' + labels[o.status] + ')' : 'Xe sẵn sàng'}</strong></div><div><span class="review-label">Cập nhật mẫu</span><strong>${time(v.updated)}</strong></div><div class="gps-summary-actions">${canDispatch ? actionButton('Phân xe →', 'dispatch-with-vehicle', v.plate, 'primary') : ''}${actionButton('Chi tiết xe →', 'detail-vehicle', v.plate)}</div></div>` : '<p class="subtle">Chọn bộ lọc khác để xem xe.</p>'}</section></div>`;
  }

  function reportData() { return state.orders.filter((o) => o.day >= reportFrom && o.day <= reportTo); }
  function reportsView() {
    const list = reportData();
    // 4 chỉ số độc lập phản ánh tổng quan tức thời: tổng đơn, đơn còn tồn, tỷ lệ xe có chuyến/tổng đội xe, và ticket sự cố đang mở
    const remainingOrders = list.filter((o) => ['pending', 'assigned', 'running'].includes(o.status)).length;
    const activeVehicles = state.vehicles.filter((v) => ['assigned', 'running'].includes(vehicleStatus(v))).length;
    let ticketList = window.FleetWorkflow?.tickets?.();
    if (!ticketList) {
      try { ticketList = JSON.parse(localStorage.getItem('fleet-autopilot-workflow-v2') || '{}').tickets || []; } catch { ticketList = []; }
    }
    const openTickets = ticketList.filter((t) => t.status === 'open').length;
    const materials = [...new Set(list.map((o) => o.material))];
    const monthVehicles = state.vehicles.map((v) => {
      const trips = state.orders.filter((o) => o.plate === v.plate && o.status === 'completed').length;
      const st = v.availability === 'awaiting_check' ? `<button type="button" class="text-button" data-workflow-action="vehicle-ready" data-id="${esc(v.plate)}">Xác nhận sẵn sàng</button>` : badge(vehicleStatus(v));
      return `<tr><td><strong>${esc(v.plate)}</strong><small>${esc(v.type)}</small></td><td>${trips} chuyến</td><td>${st}</td></tr>`;
    }).join('');
    const reportTabs = `<div class="v2-report-tabs" role="tablist" aria-label="Chuyển bảng báo cáo"><button type="button" role="tab" class="v2-fleet-tab ${reportTab === 'orders' ? 'active' : ''}" data-action="report-tab" data-id="orders" aria-selected="${reportTab === 'orders'}">Chi tiết trong tháng (${list.length})</button><button type="button" role="tab" class="v2-fleet-tab ${reportTab === 'vehicles' ? 'active' : ''}" data-action="report-tab" data-id="vehicles" aria-selected="${reportTab === 'vehicles'}">Việc theo xe trong tháng (${state.vehicles.length})</button></div>`;
    return pageHead('HIỆU QUẢ VẬN CHUYỂN', 'Báo cáo', 'Tổng hợp từ đơn hàng mẫu theo tháng; tách riêng từng đơn vị viên / kg / m³ (không cộng gộp sai đơn vị).', actionButton('Xuất báo cáo CSV', 'export-reports', null, 'primary'), 'chart') +
      `<section class="panel v2-card-dark report-filters"><div class="filter-bar">${reportTabs}<label class="field"><span>Từ ngày</span><input id="report-from" type="date" value="${esc(reportFrom)}"></label><label class="field"><span>Đến ngày</span><input id="report-to" type="date" value="${esc(reportTo)}"></label><div class="report-filter-summary"><strong>${list.length} đơn trong tháng</strong><small>Ngày minh họa: ${date(sampleDay)} · Không suy ra doanh thu/lợi nhuận</small></div></div>${reportFrom > reportTo ? '<p class="form-error" role="alert">Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</p>' : ''}</section>
      <div class="stats workspace-stats">${metric('Tổng đơn trong tháng', list.length, 'order')}${metric('Đơn còn tồn', remainingOrders, 'chart')}${metric('Xe có chuyến', `${activeVehicles}/${state.vehicles.length}`, 'truck')}${metric('Ticket mở', openTickets, 'alert')}</div>
      <div class="workspace-columns equal"><section class="panel v2-card-light"><div class="panel-heading"><h2>${icon('truck')}Việc theo xe trong tháng</h2><span class="subtle">Tham khảo</span></div><div id="month-jobs" class="table-wrap"><table class="data-table"><thead><tr><th>Xe / loại</th><th>Hoàn thành T11</th><th>Trạng thái</th></tr></thead><tbody>${monthVehicles}</tbody></table></div><p class="section-note">Thống kê tham khảo tháng hiện tại; công thức đo công bằng còn chờ chốt.</p></section>
      <section class="panel v2-card-dark"><div class="panel-heading"><h2>${icon('layers')}Số đơn theo vật liệu</h2><span class="subtle">Tách theo đơn vị chuẩn</span></div>${materials.map((m) => { const grp = list.filter((o) => o.material === m); const u = grp[0]?.unit || 'm³'; const q = grp.reduce((n, o) => n + o.quantity, 0); return `<div class="material-row"><div><strong>${esc(m)}</strong><span>${grp.length} đơn · ${formatNum(q)} ${esc(u)}</span></div><div class="bar-track"><i style="width:${list.length ? grp.length / list.length * 100 : 0}%"></i></div></div>`; }).join('') || '<p class="subtle">Không có dữ liệu.</p>'}<p class="section-note">Không cộng gộp viên, kg và m³ thành một tổng tải trọng khi chưa có hệ số quy đổi.</p></section></div>
      <section class="panel v2-card-dark"><div class="panel-heading"><h2>${icon('order')}Chi tiết trong tháng</h2><span class="count-label">${list.length} đơn</span></div>${list.length ? ordersTable(list, false, true) : empty('Không có đơn trong tháng đã chọn.')}</section>`;
  }

  function renderDispatch() {
    const o = selectedOrder();
    if (!o) {
      $('#dispatch-order').innerHTML = '<option>Chưa có đơn hàng</option>';
      $('.order-card h3').textContent = 'Chưa có đơn hàng để phân xe';
      $('.order-card p').textContent = 'Tạo đơn mới ở mục Đơn hàng.';
      $('.vehicles').replaceChildren();
      $('#assign').disabled = true;
      $('#suggest').disabled = true;
      $('#dispatch-note').textContent = 'Không có đơn hàng đang hoạt động trong dữ liệu mẫu.';
      $$('[data-summary]').forEach((el) => (el.querySelector('strong').textContent = '0'));
      $('.trips tbody').replaceChildren();
      $('#timeline').innerHTML = timeline(3).replace(/^<ol[^>]*>|<\/ol>$/g, '');
      return;
    }
    state.selectedOrder = o.id;
    const options = candidates(o), available = options.some((v) => v.plate === state.selectedVehicle);
    if (o.status === 'pending' && !available) state.selectedVehicle = options[0]?.plate || '';
    const picker = $('#dispatch-order');
    picker.innerHTML = state.orders.filter((x) => x.status !== 'cancelled').map((x) => `<option value="${esc(x.id)}" ${o.id === x.id ? 'selected' : ''}>${esc(x.id)} · ${esc(x.customerGroup || '')} · ${esc(x.material)} (${esc(qtyText(x))}) · ${labels[x.status]}</option>`).join('');
    $('.order-card h3').innerHTML = `${esc(o.id)} <span>·</span> ${esc(o.material)} <span>(${esc(qtyText(o))})</span>`;
    $('.order-card p').innerHTML = `${icon('pin')}${esc(o.from)}<span class="route-arrow">→</span>${icon('pin')}${esc(o.to)} · ${esc(o.customerGroup || '')}${o.distanceKm ? ` · ${o.distanceKm} km` : ''}${o.slot ? ` · Hẹn ${esc(o.slot)}` : ''}`;
    $('.vehicles').innerHTML = o.status === 'pending'
      ? (options.slice(0, 3).map((v, i) => `<button class="vehicle ${v.plate === state.selectedVehicle ? 'selected' : ''}" aria-pressed="${v.plate === state.selectedVehicle}" data-vehicle="${esc(v.plate)}"><span class="rank">${i + 1}</span>${icon('truck')}<strong>${esc(v.plate)}</strong><span class="eta">${esc(v.type)} · ${esc(v.capacityText)}</span></button>`).join('') || `<p class="subtle">Không có xe phù hợp loại hàng (${esc(o.material)}). Đơn giữ trạng thái chờ — cảnh báo hạn giao: ${date(o.day)} ${esc(o.slot || '')}.</p>`)
      : `<div class="assigned-summary">${icon('truck')}<strong>${esc(o.plate || 'Chưa có xe')}</strong>${badge(o.status)}</div>`;
    $('#assign').disabled = o.status === 'pending' && !options.length;
    $('#assign').innerHTML = o.status === 'pending' ? 'Duyệt phân công <span>→</span>' : 'Xem hồ sơ chuyến <span>→</span>';
    $('#suggest').disabled = o.status !== 'pending' || !options.length;
    $('#dispatch-note').textContent = o.status === 'pending'
      ? (state.selectedVehicle ? `Đang chọn xe ${state.selectedVehicle} · Công bằng việc tháng trước, tuyến sau (công thức chờ chốt) · Điều phối duyệt.` : 'Chưa có xe phù hợp loại hàng trong dữ liệu mẫu.')
      : `Đơn ${o.id} · ${labels[o.status]}. Không tự hết hạn khi tài xế chưa phản hồi.`;

    const c = counts(), summary = { 'Đơn chờ': c.pending, 'Chuyến đang chạy': c.running + c.assigned, 'Xe sẵn sàng': c.ready, 'Cần xử lý': alerts().length };
    $$('[data-summary]').forEach((el) => (el.querySelector('strong').textContent = summary[el.dataset.summary] ?? 0));
    const recent = state.orders.filter((x) => ['running', 'completed', 'assigned'].includes(x.status)).slice(0, 4);
    $('.trips tbody').innerHTML = recent.map((x) => `<tr><td>${actionButton(esc(x.id), 'detail-order', x.id)}</td><td>${esc(x.material)} <span>(${esc(qtyText(x))})</span></td><td>${esc(x.from)} → ${esc(x.to)}</td><td>${badge(x.status)}</td><td>${esc(x.slot || '—')}</td></tr>`).join('');
    $('#timeline').innerHTML = timeline(3).replace(/^<ol[^>]*>|<\/ol>$/g, '');

    const texts = $$('.gps .map-art text');
    if (texts[0]) texts[0].textContent = o.from;
    if (texts[1]) texts[1].textContent = o.to;
    $('.gps .map-art').setAttribute('aria-label', 'Sơ đồ hành trình mẫu: ' + o.from + ' đến ' + o.to);

    let mapLayer = $('.gps .map-art .dispatch-map-vehicles');
    if (!mapLayer) { $('.gps .map-art').insertAdjacentHTML('beforeend', '<g class="dispatch-map-vehicles"></g>'); mapLayer = $('.gps .map-art .dispatch-map-vehicles'); }
    const mapVehicles = o.status === 'pending' ? options : state.vehicles.filter((v) => v.plate === o.plate);
    mapLayer.innerHTML = mapVehicles.map((v) => {
      const chosen = o.status === 'pending' ? v.plate === state.selectedVehicle : true;
      return `<g class="fleet-marker dispatch-vehicle-marker ${chosen ? 'chosen' : ''}" role="button" tabindex="0" data-vehicle="${esc(v.plate)}" aria-label="Chọn xe ${esc(v.plate)} (${esc(v.type)})" transform="translate(${v.x},${v.y})"><title>${esc(v.plate)} · ${esc(v.type)} · ${esc(v.capacityText)}</title><circle r="${chosen ? 9 : 6}"/><rect x="-46" y="13" width="92" height="20" rx="4"/><text text-anchor="middle" y="26">${esc(v.plate)}</text></g>`;
    }).join('');
    const activeVehicle = vehicle(o.status === 'pending' ? state.selectedVehicle : o.plate), activeDriver = activeVehicle ? driver(activeVehicle.driverId) : null;
    let mapSummary = $('#dispatch-map-summary');
    if (!mapSummary) { $('#dispatch-view .panel.gps').insertAdjacentHTML('beforeend', '<div id="dispatch-map-summary" class="dispatch-map-summary"></div>'); mapSummary = $('#dispatch-map-summary'); }
    mapSummary.innerHTML = activeVehicle
      ? `<div><span class="review-label">${o.status === 'pending' ? 'Xe đang chọn trên sơ đồ' : 'Xe phụ trách chuyến'}</span><strong>${esc(activeVehicle.plate)} · ${esc(activeVehicle.type)} (${esc(activeVehicle.capacityText)})</strong><small>${esc(activeDriver?.name || 'Chưa gán tài xế')}</small></div><div class="dispatch-map-actions">${badge(activeVehicle.gps)}${actionButton('Mở GPS →', 'track-vehicle', activeVehicle.plate)}</div>`
      : '<span class="subtle">Bấm chọn xe trên sơ đồ hoặc danh sách bên trái để xem thông tin nhanh.</span>';
    $('.gps .map-art').style.transform = `scale(${mapZoom})`;
    $('#map-out').disabled = mapZoom <= 1;
    $('#map-in').disabled = mapZoom >= 1.6;
  }

  function centerMobileNav() {
    if (innerWidth <= 600) {
      const nav = $('.sidebar nav'), active = nav.querySelector('[aria-current=page]');
      if (active) nav.scrollLeft = active.offsetLeft - nav.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
    }
  }

  function render() {
    const focusedId = $('#workspace-view').contains(document.activeElement) ? document.activeElement.id : null;
    document.documentElement.dataset.motion = state.settings.motion ? 'on' : 'off';
    $('.brand-label').textContent = state.settings.company;
    $('.brand').setAttribute('aria-label', state.settings.company);
    $('.account').setAttribute('aria-label', 'Tài khoản ' + state.settings.dispatcher);
    $('.account-name').textContent = state.settings.dispatcher;
    $('.crumb').innerHTML = `${icon('home')}<span>/</span>${routes[page]}`;
    $$('[data-page]').forEach((button) => {
      const active = button.dataset.page === routes[page];
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    centerMobileNav();
    const isBentoV2 =
      window.FleetUIStyle?.get?.() === 'v2' &&
      window.innerWidth >= 760 &&
      (page === 'dispatch' || page === 'overview');
    $('#dispatch-view').hidden = page !== 'dispatch';
    $('#workspace-view').hidden = page === 'dispatch';
    $('#workspace-view').dataset.workspacePage = page;
    $('#workspace-view').dataset.fleetTab = fleetTab;
    $('#workspace-view').dataset.reportTab = reportTab;
    if (!isBentoV2) {
      if (page === 'dispatch') renderDispatch();
      else {
        $('#workspace-view').innerHTML = ({ overview, orders: ordersView, fleet: fleetView, gps: gpsView, reports: reportsView })[page]();
        if (page === 'gps') $('.fleet-map').style.transform = `scale(${gpsZoom})`;
      }
      $$('#workspace-view .table-wrap').forEach((w) => {
        w.tabIndex = 0;
        w.setAttribute('role', 'region');
        w.setAttribute('aria-label', 'Bảng dữ liệu có thể cuộn ngang');
        const hint = document.createElement('p');
        hint.className = 'table-scroll-hint';
        hint.textContent = 'Cuộn ngang để xem đầy đủ →';
        hint.hidden = w.scrollWidth <= w.clientWidth + 1;
        w.insertAdjacentElement('beforebegin', hint);
      });
    }
    document.title = routes[page] + ' — Fleet Autopilot · Bản thử';
    if (focusedId) document.getElementById(focusedId)?.focus({ preventScroll: true });
    window.dispatchEvent(new Event('fleet:render'));
  }

  // Xác nhận xóa/hủy đơn chủ ý ("Nhập lại" đúng mã đơn + lý do) theo C03 và Q&A
  function confirmDeleteOrder(id) {
    const o = order(id);
    if (!o) return;
    editForm(
      'Xác nhận xóa / hủy đơn ' + o.id,
      `<p class="workflow-note full-field">Quy tắc "Nhập lại": gõ đúng mã đơn <strong>${esc(o.id)}</strong> để xác nhận chủ ý hủy/xóa đơn sai. Hệ thống giữ lại bản ghi nhật ký.</p>` +
        field(`Gõ lại mã đơn (${o.id})`, 'confirmCode', '', 'text', `required placeholder="${esc(o.id)}"`) +
        field('Lý do hủy / xóa đơn', 'reason', '', 'text', 'required maxlength="200"'),
      (data) => {
        const code = String(data.get('confirmCode') || '').trim().toUpperCase();
        const reason = String(data.get('reason') || '').trim();
        if (code !== o.id.toUpperCase()) {
          formError(`Vui lòng nhập chính xác mã đơn "${o.id}" để xác nhận.`);
          return false;
        }
        if (!reason) { formError('Vui lòng ghi lý do hủy/xóa đơn.'); return false; }
        if (o.plate) {
          const v = vehicle(o.plate);
          if (v) v.availability = 'awaiting_check';
          o.previousPlate = o.plate;
          o.plate = '';
        }
        o.status = 'cancelled';
        o.cancelReason = reason;
        commit(`Hủy/xóa đơn ${o.id} (đã gõ xác nhận)`, reason);
        toast(`Đã hủy đơn mẫu ${o.id} và ghi nhật ký.`);
      }
    );
  }

  function details(o) {
    if (!o) return;
    // Đọc ảnh xác nhận 2 đầu từ FleetRoles.snapshot().evidence nếu đơn đã phân xe
    const allEv = (window.FleetRoles?.snapshot?.()?.evidence || []).filter((e) => e.order === o.id);
    const pickupEv = allEv.filter((e) => e.kind === 'pickup');
    const deliveryEv = allEv.filter((e) => e.kind !== 'pickup');
    const renderProofSlot = (title, items, emptyText) => {
      const latest = items[0];
      return `<div class="detail-proof-card">
        <span class="detail-proof-title">${title}</span>
        ${latest
          ? `<strong>${esc(latest.filename || 'Đã gửi ảnh')}</strong><small>${time(latest.at)}${latest.gps ? ` · GPS ${esc(latest.gps.lat)}, ${esc(latest.gps.lon)}` : ''}</small>`
          : `<span class="detail-proof-empty">${emptyText}</span>`}
      </div>`;
    };
    const proofSection = o.status !== 'pending'
      ? `<div class="detail-proof-section">
          <div class="detail-proof-heading">Ảnh xác nhận 2 đầu</div>
          <div class="detail-proof-grid">
            ${renderProofSlot('1. Ảnh lấy hàng (đầu nhận)', pickupEv, 'Chưa có ảnh đầu nhận')}
            ${renderProofSlot('2. Ảnh giao hàng (đầu giao)', deliveryEv, 'Chưa có ảnh đầu giao')}
          </div>
        </div>`
      : '';
    const extra = htmlNode(
      `<dl class="detail-grid">
        <div><dt>Nhóm khách ưu tiên</dt><dd>${esc(o.customerGroup || '—')}</dd></div>
        <div><dt>Khách hàng / Vựa / Thầu</dt><dd>${esc(o.customer || 'Khách lẻ (tùy chọn)')}</dd></div>
        <div><dt>Vật liệu & khối lượng</dt><dd>${esc(o.material)} · ${esc(qtyText(o))}</dd></div>
        <div><dt>Khoảng cách giao</dt><dd>${o.distanceKm ? `${o.distanceKm} km (≤100 km)` : 'Chưa nhập'}</dd></div>
        <div><dt>Điểm lấy → Điểm giao</dt><dd>${esc(o.from)} → ${esc(o.to)}</dd></div>
        <div><dt>Hạn giao mẫu</dt><dd>${date(o.day)} · ${esc(o.slot || 'Chưa đặt giờ')} ${o.deadlineNote ? `(${esc(o.deadlineNote)})` : ''}</dd></div>
        <div><dt>Xe phụ trách</dt><dd>${esc(o.plate || 'Chưa phân xe')}${o.supportPlate ? ` · Xe hỗ trợ: ${esc(o.supportPlate)}` : ''}</dd></div>
      </dl>
      ${proofSection}
      <div class="trip-status"><span>Trạng thái mẫu</span>${badge(o.status)}</div>
      ${o.note ? `<p class="modal-copy">${esc(o.note)}</p>` : ''}
      ${o.cancelReason ? `<p class="modal-copy">Lý do hủy/xóa: ${esc(o.cancelReason)}</p>` : ''}
      <div class="detail-actions">
        ${o.status === 'pending' ? actionButton('Chỉnh sửa', 'edit-order', o.id, 'secondary') + actionButton('Chuyển sang Điều phối →', 'dispatch-order', o.id, 'primary') : ''}
        ${['assigned', 'running'].includes(o.status) ? `<button type="button" class="primary" data-workflow-action="trip-review" data-id="${esc(o.id)}">Kiểm bằng chứng & ngoại lệ →</button>` : ''}
        ${o.status === 'completed' ? `<button type="button" class="secondary" data-workflow-action="trip-review" data-id="${esc(o.id)}">Xem bằng chứng 2 đầu →</button>` : ''}
        ${o.status === 'pending' ? actionButton('Xóa / Hủy đơn (nhập xác nhận)', 'cancel-order', o.id, 'text-button danger-text') : ''}
      </div>`
    );
    openModal('Chi tiết ' + o.id, 'Thông tin đơn hàng mẫu theo quy tắc đơn vị và nhóm ưu tiên hiện hành.', extra);
  }

  function vehicleDetail(v) {
    if (!v) return;
    const o = activeOrder(v.plate), d = driver(v.driverId);
    openModal('Xe ' + v.plate, 'Thông tin xe và thiết bị GPS Taris mẫu.', htmlNode(
      `<dl class="detail-grid">
        <div><dt>Loại xe</dt><dd>${esc(v.type)}${v.backup ? ' (Xe dự phòng)' : ''}</dd></div>
        <div><dt>Hàng phù hợp & sức chứa</dt><dd>${esc(v.cargoNote || '—')} · ${esc(v.capacityText || '—')}</dd></div>
        <div><dt>Tài xế</dt><dd>${esc(d?.name || 'Chưa gán')}</dd></div>
        <div><dt>IMEI Taris mẫu</dt><dd>${esc(v.imei || 'Chưa ghép')}</dd></div>
        <div><dt>Đơn đang thực hiện</dt><dd>${esc(o?.id || 'Chưa có')}</dd></div>
      </dl>
      <div class="detail-actions">${badge(vehicleStatus(v))}${badge(v.gps)}${v.availability === 'awaiting_check' ? `<button type="button" class="primary" data-workflow-action="vehicle-ready" data-id="${esc(v.plate)}">Xác nhận sẵn sàng</button>` : ''}${actionButton('Chỉnh sửa thông tin', 'edit-vehicle', v.plate, 'secondary')}${actionButton('Xem trên sơ đồ →', 'track-vehicle', v.plate, 'primary')}</div>`
    ));
  }

  function confirmAssignment(orderId = selectedOrder()?.id, plate = state.selectedVehicle) {
    if (document.body.dataset.role !== 'dispatch') return;
    const o = order(orderId), v = vehicle(plate);
    if (!o) { toast('Chưa có đơn hàng để phân xe.'); return; }
    if (o.status !== 'pending') { details(o); return; }
    if (!v || !candidates(o).includes(v)) { toast('Vui lòng chọn xe sẵn sàng phù hợp loại hàng.'); return; }
    const fragment = $('#assignment-review-template').content.cloneNode(true);
    fragment.querySelector('.review-id').textContent = o.id;
    fragment.querySelector('.review-material h3').textContent = `${o.material} (${o.customerGroup || ''})`;
    fragment.querySelector('.review-weight strong').textContent = formatNum(o.quantity);
    fragment.querySelector('.review-weight span').textContent = o.unit || 'm³';
    fragment.querySelectorAll('.review-route strong')[0].textContent = o.from;
    fragment.querySelectorAll('.review-route strong')[1].textContent = o.to;
    fragment.querySelector('[data-review-plate]').textContent = `${v.plate} · ${v.type}`;
    openModal('Duyệt phân công (V1)', 'Mọi phân công do Điều phối duyệt. Sau duyệt, đơn chuyển sang "Chờ tài xế xác nhận" (không tự hết hạn).', fragment, () => {
      const latest = order(orderId), selected = vehicle(plate);
      if (document.body.dataset.role !== 'dispatch' || latest?.status !== 'pending' || !selected || !candidates(latest).includes(selected)) { toast('Dữ liệu mẫu đã thay đổi. Chọn lại xe.'); return false; }
      latest.status = 'assigned';
      latest.workflowStage = 'awaiting';
      latest.plate = plate;
      commit('Đã duyệt phân công ' + plate + ' cho ' + latest.id, `${qtyText(latest)} · ${latest.from} → ${latest.to}`);
      toast('Đã lưu phân công mẫu (Chờ tài xế xác nhận).');
    });
    modal.classList.add('assignment-review');
    $('#cancel-modal').textContent = 'Quay lại';
    confirm.append(document.createTextNode(' →'));
  }

  const field = (label, name, value = '', type = 'text', attrs = '') => `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
  function editForm(name, html, handler) {
    const wrap = htmlNode(`<form id="editor-form" class="editor-form">${html}<p id="editor-error" class="form-error full-field" role="alert" hidden></p><button type="submit" hidden>Lưu</button></form>`);
    openModal(name, 'Chỉnh sửa dữ liệu mẫu, chỉ lưu trong trình duyệt.', wrap, () => {
      const f = $('#editor-form');
      if (!f.reportValidity()) return false;
      return handler(new FormData(f));
    }, 'Lưu dữ liệu mẫu');
    $('#editor-form').onsubmit = (e) => { e.preventDefault(); confirm.click(); };
  }

  function editOrder(id) {
    const o = order(id);
    if (o && o.status !== 'pending') { toast('Chỉ chỉnh sửa đơn chờ trong bản thử.'); return; }
    editForm(
      o ? 'Chỉnh sửa ' + o.id : 'Tiếp nhận đơn từ Sale',
      `<label class="field"><span>Nhóm ưu tiên đơn</span><select name="customerGroup">${customerGroups.map((g) => `<option value="${esc(g)}" ${o?.customerGroup === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select></label>` +
        field('Tên Vựa / Chủ thầu (Khách lẻ tùy chọn)', 'customer', o?.customer || '', 'text', 'maxlength="100" placeholder="Để trống nếu là khách lẻ"') +
        field('Vật liệu (không có xi măng)', 'material', o?.material || '', 'text', 'required maxlength="80" placeholder="Gạch Block / Cát xây dựng / Đá 1×2"') +
        field('Số lượng', 'quantity', o?.quantity || '', 'number', 'required min="1" max="100000" step="any"') +
        `<label class="field"><span>Đơn vị chuẩn</span><select name="unit">${units.map((u) => `<option value="${esc(u)}" ${(o?.unit || 'm³') === u ? 'selected' : ''}>${esc(u)} (${u === 'viên' ? 'Gạch' : u === 'kg' ? 'Cát/đá nhà máy' : 'Cát/đá thường'})</option>`).join('')}</select></label>` +
        field('Điểm lấy hàng', 'from', o?.from || '', 'text', 'required maxlength="150" placeholder="VD: Mỏ Long Phước"') +
        field('Điểm giao / nhận hàng', 'to', o?.to || '', 'text', 'required maxlength="150" placeholder="VD: Công trình Bình An"') +
        `<p class="subtle full-field" style="margin:0">${o?.distanceKm ? `Khoảng cách tuyến hiện tại: ${o.distanceKm} km (tự tính từ Google Maps).` : 'Khoảng cách (km, ≤100 km) tự tính sau khi Google Maps vẽ đường từ Điểm lấy → Điểm giao.'}</p>` +
        field('Ngày giao dự kiến', 'day', o?.day || sampleDay, 'date', 'required') +
        field('Giờ hẹn giao', 'slot', o?.slot || '', 'time') +
        `<label class="field full-field"><span>Hạn giao / ghi chú Sale</span><textarea name="note" rows="2" maxlength="500" placeholder="VD: Giao trong 2 ngày, tối đa 5 ngày...">${esc(o?.note || '')}</textarea></label>`,
      (data) => {
        const values = Object.fromEntries(data);
        if (values.customerGroup !== 'Khách lẻ' && !values.customer.trim()) {
          formError('Vui lòng nhập tên Công trình / Vựa / Chủ thầu (chỉ Khách lẻ được để trống).');
          return false;
        }
        if (norm(values.material).includes('xi mang')) {
          formError('Xi măng nằm ngoài phạm vi vật liệu hiện tại (gạch, cát, đá, đất).');
          return false;
        }
        const dist = o?.distanceKm ?? null;
        for (const k of ['material', 'from', 'to']) {
          if (!values[k].trim()) { formError('Vui lòng nhập đầy đủ vật liệu, điểm lấy và điểm giao.'); return false; }
        }
        values.customer = values.customer.trim() || 'Khách lẻ (chưa bắt buộc tên)';
        values.quantity = Number(values.quantity);
        values.distanceKm = dist;
        values.deadlineNote = values.slot ? `Hẹn ${values.slot}` : 'Theo lịch ngày';
        if (o) Object.assign(o, values);
        else {
          const n = Math.max(1047, ...state.orders.map((x) => Number(x.id.replace(/\D/g, '')) || 0)) + 1;
          state.orders.unshift({ ...values, id: 'ĐH-' + n, status: 'pending', plate: '' });
        }
        commit(o ? 'Đã sửa đơn mẫu ' + o.id : 'Tiếp nhận đơn mới từ Sale', `${values.material} · ${qtyText(values)} · ${values.customerGroup}`);
        toast('Đã lưu đơn hàng mẫu.');
      }
    );
  }

  function editVehicle(plate) {
    const v = vehicle(plate), busy = v && activeOrder(v.plate);
    editForm(
      v ? 'Chỉnh sửa xe ' + v.plate : 'Thêm xe mẫu',
      field('Biển số', 'plate', v?.plate, 'text', `required maxlength="20" ${v ? 'readonly' : ''}`) +
        `<label class="field"><span>Loại xe</span><select name="type" ${busy ? 'disabled' : ''}>${vehicleTypes.map((t) => `<option value="${esc(t)}" ${(v?.type || 'Xe ben') === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>` +
        field('Sức chứa hiển thị (VD: 15 m³ / 10.000 viên)', 'capacityText', v?.capacityText || '15 m³', 'text', 'required maxlength="40"') +
        field('Mã IMEI GPS Taris (mẫu)', 'imei', v?.imei || '', 'text', 'maxlength="30"') +
        `<label class="field"><span>Tài xế</span><select name="driverId" ${busy ? 'disabled' : ''}><option value="">Chưa gán</option>${state.drivers.filter((d) => d.id === v?.driverId || !state.vehicles.some((x) => x.driverId === d.id)).map((d) => `<option value="${esc(d.id)}" ${v?.driverId === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></label>` +
        `<label class="field full-field"><span>Tình trạng xe</span><select name="availability" ${busy ? 'disabled' : ''}><option value="ready" ${v?.availability === 'ready' ? 'selected' : ''}>Sẵn sàng</option><option value="awaiting_check" ${v?.availability === 'awaiting_check' ? 'selected' : ''}>Chờ Điều phối xác nhận sẵn sàng</option><option value="maintenance" ${v?.availability === 'maintenance' ? 'selected' : ''}>Bảo trì</option></select>${busy ? '<small>Xe có đơn đang thực hiện; loại xe, tài xế và tình trạng được giữ nguyên.</small>' : ''}</label>`,
      (data) => {
        const values = Object.fromEntries(data);
        values.plate = values.plate.trim().toUpperCase();
        if (!values.plate) { formError('Vui lòng nhập biển số.'); return false; }
        if (!v && state.vehicles.some((x) => x.plate === values.plate)) { formError('Biển số đã có trong dữ liệu mẫu.'); return false; }
        values.cargoNote = norm(values.type).includes('cau') ? 'Gạch' : norm(values.type).includes('dau keo') ? 'Đá, cát, bột đá' : 'Đá, cát';
        if (busy) { values.availability = v.availability; values.driverId = v.driverId; values.type = v.type; }
        if (v) Object.assign(v, values);
        else state.vehicles.push({ ...values, capacity: 15, eta: 25, gps: 'offline', backup: false, x: 320, y: 160, updated: null });
        commit(v ? 'Đã cập nhật xe mẫu' : 'Đã thêm xe mẫu', values.plate);
        toast('Đã lưu thông tin xe.');
      }
    );
  }

  function editDriver(id) {
    const d = driver(id);
    editForm(
      d ? 'Chỉnh sửa tài xế' : 'Thêm tài xế mẫu',
      field('Tên hiển thị', 'name', d?.name, 'text', 'required maxlength="80"') +
        field('Liên hệ (không bắt buộc)', 'phone', d?.phone, 'tel', 'maxlength="30"') +
        `<label class="field full-field"><span>Tình trạng</span><select name="status"><option value="active">Đang làm việc</option><option value="off" ${d?.status === 'off' ? 'selected' : ''}>Tạm nghỉ</option></select></label>`,
      (data) => {
        const values = Object.fromEntries(data);
        if (!values.name.trim()) { formError('Vui lòng nhập tên tài xế.'); return false; }
        const attached = state.vehicles.find((v) => v.driverId === id);
        if (values.status === 'off' && attached && activeOrder(attached.plate)) { formError('Tài xế đang gắn với xe có chuyến mẫu chưa hoàn thành.'); return false; }
        if (d) Object.assign(d, values);
        else state.drivers.push({ ...values, id: 'TX-' + (Math.max(0, ...state.drivers.map((x) => Number(x.id.replace(/\D/g, '')) || 0)) + 1) });
        commit(d ? 'Đã sửa tài xế mẫu' : 'Đã thêm tài xế mẫu', values.name);
        toast('Đã lưu tài xế.');
      }
    );
  }

  function transitionOrder(id, next) {
    if (next === 'cancelled') { confirmDeleteOrder(id); return; }
    const o = order(id), expected = { running: 'assigned', completed: 'running' }[next];
    if (!o || o.status !== expected) return;
    openModal(next === 'running' ? 'Bắt đầu chuyến mẫu' : 'Hoàn thành chuyến mẫu', `${o.id} · ${o.material} · ${qtyText(o)}\n${o.from} → ${o.to}`, null, () => {
      o.status = next;
      commit('Đơn ' + o.id + ': ' + labels[next], o.plate || o.material);
      toast('Đã cập nhật trạng thái mẫu.');
    });
  }

  function csv(name, rows) { download(name, '\ufeff' + rows.map((row) => row.map((v) => '"' + String(v ?? '').replace(/^[=+\-@]/, "'$&").replace(/"/g, '""') + '"').join(',')).join('\r\n'), 'text/csv;charset=utf-8'); }
  function download(name, text, type) { const url = URL.createObjectURL(new Blob([text], { type })), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Đã tạo tệp dữ liệu mẫu.'); }
  function exportOrders(list, name) { csv(name, [['Mã đơn', 'Nhóm khách', 'Khách hàng', 'Vật liệu', 'Số lượng', 'Đơn vị', 'Km', 'Điểm lấy', 'Điểm giao', 'Ngày', 'Giờ', 'Trạng thái', 'Xe'], ...list.map((o) => [o.id, o.customerGroup || '', o.customer, o.material, o.quantity, o.unit || 'm³', o.distanceKm || '', o.from, o.to, o.day, o.slot, labels[o.status], o.plate])]); }
  function reset() { state = seed(); orderQuery = ''; orderStatus = 'all'; orderDay = ''; orderPage = 1; fleetQuery = ''; fleetFilter = 'all'; gpsPlate = state.vehicles[0].plate; mapZoom = 1; gpsZoom = 1; save(); render(); toast('Đã khôi phục dữ liệu mẫu.'); }

  function actions(action, id) {
    if (action === 'noop') return;
    if (action.startsWith('go-')) {
      if (modal.open) closeModal();
      const target = action.slice(3);
      if (target === 'orders-pending') { orderStatus = 'pending'; setPage('orders', { focus: true }); }
      else if (target === 'orders-assigned') { orderStatus = 'assigned'; setPage('orders', { focus: true }); }
      else setPage(target, { focus: true });
      return;
    }
    switch (action) {
      case 'new-order': editOrder(); break;
      case 'edit-order': editOrder(id); break;
      case 'detail-order': details(order(id)); break;
      case 'dispatch-order': if (modal.open) closeModal(); state.selectedOrder = id; save(); setPage('dispatch', { focus: true }); break;
      case 'dispatch-with-vehicle': {
        if (modal.open) closeModal();
        const v = vehicle(id);
        const cur = selectedOrder();
        const targetOrder = cur && cur.status === 'pending' && v && cargoMatchesVehicle(cur.material, v.type) ? cur : state.orders.find((o) => o.status === 'pending' && (!v || cargoMatchesVehicle(o.material, v.type))) || state.orders.find((o) => o.status === 'pending');
        if (targetOrder) state.selectedOrder = targetOrder.id;
        state.selectedVehicle = id;
        save();
        setPage('dispatch', { focus: true });
        break;
      }
      case 'order-status-pill': orderStatus = id; orderPage = 1; render(); break;
      case 'order-page-prev': if (orderPage > 1) { orderPage--; render(); } break;
      case 'order-page-next': orderPage++; render(); break;
      case 'start-order': transitionOrder(id, 'running'); break;
      case 'complete-order': transitionOrder(id, 'completed'); break;
      case 'cancel-order': confirmDeleteOrder(id); break;
      case 'new-vehicle': editVehicle(); break;
      case 'edit-vehicle': editVehicle(id); break;
      case 'detail-vehicle': vehicleDetail(vehicle(id)); break;
      case 'new-driver': editDriver(); break;
      case 'edit-driver': editDriver(id); break;
      case 'fleet-tab': fleetTab = id; fleetQuery = ''; render(); break;
      case 'report-tab': reportTab = id; render(); break;
      case 'track-vehicle': if (modal.open) closeModal(); gpsPlate = id; gpsFilter = 'all'; setPage('gps', { focus: true }); break;
      case 'gps-select': gpsPlate = id; render(); break;
      case 'gps-in': gpsZoom = Math.min(1.6, +(gpsZoom + 0.2).toFixed(1)); render(); break;
      case 'gps-out': gpsZoom = Math.max(1, +(gpsZoom - 0.2).toFixed(1)); render(); break;
      case 'simulate-gps': state.vehicles.forEach((v) => { if (v.gps !== 'offline') { v.x = 80 + (v.x + 23) % 450; v.y = 55 + (v.y + 11) % 180; v.updated = stamp(); v.gps = 'fresh'; } }); commit('Đã cập nhật vị trí mô phỏng', 'GPS Taris mẫu · Chu kỳ 10 phút'); toast('Đã thay đổi vị trí mẫu trên sơ đồ.'); break;
      case 'clear-order-filters': orderQuery = ''; orderStatus = 'all'; orderDay = ''; orderPage = 1; render(); break;
      case 'export-orders': exportOrders(state.orders.filter((o) => (orderStatus === 'all' || o.status === orderStatus) && (!orderDay || o.day === orderDay) && norm(Object.values(o).join(' ')).includes(norm(orderQuery))), 'don-hang-mau.csv'); break;
      case 'export-fleet': csv('doi-xe-mau.csv', [['Biển số', 'Loại xe', 'Hàng phù hợp', 'Sức chứa', 'IMEI Taris', 'Tài xế', 'Trạng thái'], ...state.vehicles.map((v) => [v.plate, v.type, v.cargoNote, v.capacityText, v.imei || '', driver(v.driverId)?.name, labels[vehicleStatus(v)]])]); break;
      case 'export-reports': if (reportFrom > reportTo) { toast('Vui lòng kiểm tra khoảng ngày báo cáo.'); return; } exportOrders(reportData(), 'bao-cao-van-chuyen-mau.csv'); break;
      case 'export-drivers': csv('tai-xe-mau.csv', [['Mã tài xế', 'Tên', 'Liên hệ', 'Xe đang gắn', 'Tình trạng'], ...state.drivers.map((d) => [d.id, d.name, d.phone, state.vehicles.find((v) => v.driverId === d.id)?.plate || '', labels[d.status]])]); break;
      case 'export-json': download('fleet-autopilot-du-lieu-mau.json', JSON.stringify(state, null, 2), 'application/json'); break;
      case 'reset-confirm': openModal('Khôi phục dữ liệu mẫu', 'Các đơn, xe, tài xế, cài đặt và lịch sử mẫu đã sửa sẽ được thay bằng bộ dữ liệu ban đầu. Nền đang chọn được giữ nguyên.', null, reset, 'Khôi phục mẫu'); break;
    }
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (el && !el.disabled) actions(el.dataset.action, el.dataset.id);
    const vb = e.target.closest('[data-vehicle]');
    if (vb) { state.selectedVehicle = vb.dataset.vehicle; save(); renderDispatch(); }
  });
  document.addEventListener('keydown', (e) => {
    const dm = e.target.closest('.dispatch-vehicle-marker[data-vehicle]');
    if (dm && ['Enter', ' '].includes(e.key)) { e.preventDefault(); state.selectedVehicle = dm.dataset.vehicle; save(); renderDispatch(); return; }
    const marker = e.target.closest('.fleet-marker');
    if (marker && ['Enter', ' '].includes(e.key)) { e.preventDefault(); actions('gps-select', marker.dataset.id); }
  });
  function liveFilter(id, value) {
    const pos = document.activeElement?.selectionStart;
    const mapping = { 'orders-query': () => { orderQuery = value; orderPage = 1; }, 'fleet-query': () => (fleetQuery = value) };
    mapping[id]();
    render();
    const el = $('#' + id);
    el.focus({ preventScroll: true });
    if (pos !== null) el.setSelectionRange(pos, pos);
  }
  document.addEventListener('input', (e) => {
    if (e.target.closest('#editor-form')) { const error = $('#editor-error'); if (error) error.hidden = true; }
    if (['orders-query', 'fleet-query'].includes(e.target.id)) liveFilter(e.target.id, e.target.value);
  });
  document.addEventListener('change', (e) => {
    const el = e.target;
    switch (el.id) {
      case 'orders-status': orderStatus = el.value; orderPage = 1; render(); break;
      case 'orders-day': orderDay = el.value; orderPage = 1; render(); break;
      case 'fleet-status': fleetFilter = el.value; render(); break;
      case 'gps-filter': gpsFilter = el.value; render(); break;
      case 'report-from': reportFrom = el.value || '0000-01-01'; render(); break;
      case 'report-to': reportTo = el.value || '9999-12-31'; render(); break;
    }
  });
  $('#dispatch-order').onchange = (e) => { state.selectedOrder = e.target.value; save(); renderDispatch(); };
  $('#assign').onclick = () => confirmAssignment();
  $('#suggest').onclick = () => {
    const options = candidates(selectedOrder());
    if (options.length) {
      state.selectedVehicle = options[0].plate;
      save();
      renderDispatch();
      toast('Đã chọn phương án AI V1 mẫu (công bằng trước tuyến sau — công thức chờ chốt).');
    }
  };
  $('#all-trips').onclick = () => { orderStatus = 'all'; setPage('orders', { focus: true }); };
  $$('[data-summary]').forEach((el) => (el.onclick = () => {
    if (el.dataset.summary === 'Đơn chờ') { orderStatus = 'pending'; setPage('orders', { focus: true }); }
    else if (el.dataset.summary === 'Chuyến đang chạy') setPage('gps', { focus: true });
    else if (el.dataset.summary === 'Xe sẵn sàng') setPage('fleet', { focus: true });
    else showAttention();
  }));
  $('#notifications').onclick = () => openModal('Hoạt động gần đây', 'Các thay đổi mẫu trong trình duyệt này.', htmlNode(timeline(8)));
  $('#reset-demo').onclick = () => actions('reset-confirm');
  $('.brand').onclick = (e) => { e.preventDefault(); setPage('overview', { focus: true }); };
  $('#map-in').onclick = () => { mapZoom = Math.min(1.6, +(mapZoom + 0.2).toFixed(1)); renderDispatch(); };
  $('#map-out').onclick = () => { mapZoom = Math.max(1, +(mapZoom - 0.2).toFixed(1)); renderDispatch(); };
  function searchResults(value) {
    const list = state.orders.filter((o) => norm(Object.values(o).join(' ')).includes(norm(value)));
    $('#search-results').innerHTML = list.length
      ? list.map((o) => `<button class="dialog-row" data-search-order="${esc(o.id)}"><span><strong>${esc(o.id)} · ${esc(o.material)} (${esc(qtyText(o))})</strong><small>${esc(o.from)} → ${esc(o.to)}</small></span>${badge(o.status)}</button>`).join('')
      : '<p class="empty">Không tìm thấy đơn hàng phù hợp.</p>';
  }
  $('#search').placeholder = 'Tìm đơn, xe, hành trình…';
  $('#search').setAttribute('aria-label', 'Tìm đơn hàng theo mã, vật liệu, hành trình hoặc xe');
  $('#search').oninput = (e) => { orderQuery = e.target.value; orderStatus = 'all'; orderDay = ''; if (page !== 'orders') setPage('orders'); else render(); $('#search').focus({ preventScroll: true }); };
  $('#open-search').onclick = () => { searchResults(''); searchModal.showModal(); $('#mobile-search-input').value = ''; $('#mobile-search-input').focus(); };
  $('#mobile-search-input').oninput = (e) => searchResults(e.target.value);
  $('#close-search').onclick = () => searchModal.close();
  $('#search-results').onclick = (e) => { const button = e.target.closest('[data-search-order]'); if (button) { searchModal.close(); details(order(button.dataset.searchOrder)); } };
  document.addEventListener('keydown', (e) => { if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && !modal.open && !searchModal.open) { e.preventDefault(); if ($('#search').getClientRects().length) $('#search').focus(); else $('#open-search').click(); } });
  window.addEventListener('resize', () => { centerMobileNav(); $$('#workspace-view .table-wrap').forEach((w) => { if (w.previousElementSibling?.classList.contains('table-scroll-hint')) w.previousElementSibling.hidden = w.scrollWidth <= w.clientWidth + 1; }); });
  document.fonts.ready.then(centerMobileNav);

  // Cập nhật trực tiếp số Ticket mở khi workflow.js phát sự kiện đồng bộ, tránh gọi render() gây vòng lặp
  window.addEventListener('fleet:workflow-sync', () => {
    if (page !== 'reports') return;
    const count = (window.FleetWorkflow?.tickets?.() || []).filter((t) => t.status === 'open').length;
    const el = $('#workspace-view .stats .stat:last-child strong');
    if (el) el.textContent = String(count);
  });
  window.addEventListener('storage', (e) => {
    if (e.key !== key) return;
    try {
      // Dùng cùng bộ kiểm tra snapshot v3 như lúc tải trang.
      const saved = JSON.parse(localStorage.getItem(key));
      if (valid(saved)) {
        state = saved;
        render();
      }
    } catch {}
  });
  window.FleetPreview = { snapshot: () => state, openModal, toast, render, commit, setPage, qtyText, candidates, alerts, confirmAssignment, confirmDeleteOrder, cargoMatchesVehicle, labels, formatNum };
  render();
})();
