/* Quy trình vận hành UI thử nghiệm (dữ liệu mẫu lưu trong trình duyệt, chưa phải kiểm quyền backend).
 * Trách nhiệm:
 * - Ticket 2 chiều Tài xế ↔ Điều phối, tiếp nhận cảnh báo Khẩn cấp 1 nút (ảnh tự chụp + metadata), Điều phối đóng chỉ đọc.
 * - Đối chiếu bằng chứng 2 đầu (ảnh đầu nhận + đầu giao + GPS điện thoại), duyệt hoàn thành & xác nhận xe sẵn sàng.
 * - Xử lý ngoại lệ 4 nhánh (Chờ / Điều xe hỗ trợ khi xe hư sửa-niêm phong / Phân lại / Hủy có gõ xác nhận "Nhập lại").
 * - Hỗ trợ gửi yêu cầu quên TK/MK cho tài xế lên hàng chờ System Admin và xem thử luồng Đăng nhập / Passkey / Khôi phục mã 1 lần. */
(() => {
  'use strict';
  const api = window.FleetPreview, roles = window.FleetRoles, $ = (s) => document.querySelector(s), key = 'fleet-autopilot-workflow-v2';
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (n) => `<svg aria-hidden="true"><use href="#${n}"/></svg>`, now = () => new Date().toISOString(), uid = (p) => p + '-' + crypto.randomUUID();
  const clock = (v) => v ? new Date(v).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'short' }) : '—';
  const role = () => roles.role(), actor = () => role() === 'driver' ? 'Tài xế' : role() === 'admin_system' ? 'Phạm Huy Hoàng' : 'Lê Hoàng Nam';
  const btn = (label, action, id = '', cls = 'secondary') => `<button type="button" class="${cls}" data-workflow-action="${action}" data-id="${esc(id)}">${label}</button>`;
  const badge = (label, type = 'pending') => `<span class="badge" data-status="${type}"><span class="status-dot" aria-hidden="true"></span>${esc(label)}</span>`;
  const panel = (title, html, ico = 'layers', extra = '') => `<section class="panel"><div class="panel-heading"><h2>${icon(ico)}${title}</h2>${extra}</div>${html}</section>`;
  const detail = (rows) => `<dl class="role-details">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v ?? '—')}</dd></div>`).join('')}</dl>`;
  const input = (label, name, value = '', type = 'text', attrs = '') => `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" required maxlength="150" ${attrs}></label>`;
  const qtyText = (o) => api.qtyText ? api.qtyText(o) : `${o?.quantity || 0} ${o?.unit || 'm³'}`;
  // Ưu tiên lấy chuyến theo đúng tài xế đang xem từ FleetRoles.driverTrip để không bị chuyến của tài xế khác che
  const currentTrip = () => roles.driverTrip ? roles.driverTrip() : (api.snapshot().orders.find((o) => o.status === 'assigned') || api.snapshot().orders.find((o) => o.status === 'running'));

  function seedTickets() {
    return {
      version: 2,
      tickets: [
        {
          id: 'T-EMG-0002',
          code: 'TK-0002',
          kind: 'Khẩn cấp',
          emergency: true,
          description: 'Hồ sơ mẫu để xem cách nhận biết một kênh Khẩn cấp.',
          order: 'ĐH-1044',
          plate: '51C-481.66',
          driver: 'Tài xế Dũng (mẫu)',
          filename: '',
          phoneGps: '',
          status: 'open',
          at: '2026-11-16T03:35:00.000Z',
          messages: [
            { id: 'M-201', by: 'Hệ thống (Khẩn cấp 1 nút)', role: 'driver', text: 'Hồ sơ minh họa, chưa có ảnh chụp từ thiết bị.', at: '2026-11-16T03:35:00.000Z' },
          ],
        },
        {
          id: 'T-ROAD-0001',
          code: 'TK-0001',
          kind: 'Đường',
          emergency: false,
          description: 'Đường vào công trình Q.2 đang ngập cục bộ, xin xác nhận vòng sang tuyến Xa lộ Hà Nội (+4 km).',
          order: 'ĐH-1044',
          plate: '51C-481.66',
          driver: 'Tài xế Dũng (mẫu)',
          filename: '',
          phoneGps: '',
          status: 'open',
          at: '2026-11-16T03:32:00.000Z',
          messages: [
            { id: 'M-101', by: 'Tài xế Dũng (mẫu)', role: 'driver', text: 'Đường vào công trình Q.2 đang ngập cục bộ, xin xác nhận vòng sang tuyến Xa lộ Hà Nội (+4 km).', at: '2026-11-16T03:32:00.000Z' },
            { id: 'M-102', by: 'Lê Hoàng Nam', role: 'dispatch', text: 'Đã xác nhận, di chuyển tuyến vòng và gửi đủ ảnh 2 đầu khi tới nơi.', at: '2026-11-16T03:34:00.000Z' },
          ],
        },
      ],
    };
  }

  let state = seedTickets(), filter = 'open', ticketId = '', lastRole = role(), composeDraft = '', adminPlate = '';
  let composeImageUrl = '', composeImageName = '', composeAudioUrl = '', composeVoiceDuration = '';
  let voiceSession = null, stopVoice = null, shownTicketId = '';
  const safeMediaUrl = (url, type) => {
    const mime = type === 'data:image/' ? /^data:image\/(jpeg|png|webp|gif|avif);base64,/i : /^data:audio\/(webm|ogg|mp4|mpeg|wav|aac)(?:;[^,]+)*;base64,/i;
    return typeof url === 'string' && url.length <= 1400000 && mime.test(url) ? url : '';
  };
  function formatMessageText(text) {
    const raw = String(text ?? '');
    const coordRe = /(-?\d{1,2}\.\d{3,6})\s*,\s*(-?\d{1,3}\.\d{3,6})/g;
    let out = '';
    let last = 0;
    for (const m of raw.matchAll(coordRe)) {
      const idx = m.index ?? 0;
      out += esc(raw.slice(last, idx));
      const lat = Number(m[1]);
      const lon = Number(m[2]);
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        out += `<button type="button" class="ticket-gps-link" data-workflow-action="view-gps" data-lat="${lat}" data-lon="${lon}" title="Xem vị trí trên bản đồ">${icon('pin')}<span>${esc(m[0])}</span></button>`;
      } else {
        out += esc(m[0]);
      }
      last = idx + m[0].length;
    }
    return out + esc(raw.slice(last));
  }
  function openGpsModal(lat, lon, label = '') {
    const nLat = Number(lat);
    const nLon = Number(lon);
    if (!Number.isFinite(nLat) || !Number.isFinite(nLon)) return;
    const q = `${nLat},${nLon}`;
    modal(
      `Vị trí GPS điện thoại${label ? ` · ${label}` : ''}`,
      `${detail([['Tọa độ', q], ['Nguồn', 'GPS điện thoại tài xế (tách riêng GPS xe Taris)']])}
      <div class="ticket-gps-map-wrap">
        <iframe class="ticket-gps-iframe" title="Bản đồ vị trí ${esc(q)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed"></iframe>
      </div>
      <div class="workflow-inline-actions">
        <a class="primary ticket-gmaps-link" href="https://www.google.com/maps?q=${encodeURIComponent(q)}" target="_blank" rel="noopener noreferrer">Mở trên Google Maps ↗</a>
      </div>`
    );
  }
  const activeDriver = () => {
    currentTrip();
    return api.snapshot().drivers.find((driver) => driver.id === roles.activeDriver());
  };
  const belongsToDriver = (ticket, driver) => Boolean(driver && (ticket.driverId ? ticket.driverId === driver.id : ticket.driver === driver.name));
  const serializeTicketWrite = (action) => navigator.locks ? navigator.locks.request(key, action) : Promise.resolve().then(action);

  function mergeLegacyOpenTickets() {
    // Giữ hội thoại cũ khi phiên bản trước đã mở nhiều kênh cho cùng tài xế.
    const current = new Map();
    const open = state.tickets.filter((ticket) => ticket.status === 'open').sort((a, b) => Number(b.emergency) - Number(a.emergency));
    for (const ticket of open) {
      const owner = ticket.driverId || api.snapshot().drivers.find((driver) => driver.name === ticket.driver)?.id || ticket.driver;
      if (!owner) continue;
      const first = current.get(owner);
      if (!first) { current.set(owner, ticket); continue; }
      const ids = new Set(first.messages.map((message) => message.id));
      first.messages.push(...ticket.messages.filter((message) => !ids.has(message.id)));
      first.messages.sort((a, b) => String(a.at).localeCompare(String(b.at)));
      Object.assign(ticket, { status: 'closed', resolution: `Lịch sử đã chuyển vào ${first.code}` });
    }
  }
  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      if (value?.version === 2 && Array.isArray(value.tickets) && value.tickets.every((t) => t && typeof t.id === 'string' && ['open', 'closed'].includes(t.status) && Array.isArray(t.messages))) state = value;
    } catch {}
    mergeLegacyOpenTickets();
  }
  function persist(next) {
    try { localStorage.setItem(key, JSON.stringify(next)); state = next; return true; }
    catch { api.toast('Chưa lưu được. Nội dung vẫn còn trên màn hình, bạn hãy thử lại.'); return false; }
  }
  read();
  ticketId = new URLSearchParams(location.search).get('ticket') || '';
  if (ticketId) { const requested = state.tickets.find((t) => t.id === ticketId); if (requested) filter = requested.status; }

  const screen = document.createElement('section'); screen.id = 'workflow-view'; screen.hidden = true; $('#main').insertBefore(screen, $('#main footer'));
  const navButton = document.createElement('button'); navButton.dataset.workflowAction = 'tickets'; navButton.title = 'Sự cố & ticket'; navButton.innerHTML = icon('alert') + '<span class="nav-label">Sự cố & ticket</span>'; $('.sidebar nav').append(navButton);
  const loginButton = document.createElement('button'); loginButton.className = 'icon-button'; loginButton.setAttribute('aria-label', 'Xem luồng Đăng nhập / Passkey / Khôi phục'); loginButton.title = 'Đăng nhập · Passkey · Khôi phục (Xem thử)'; loginButton.dataset.workflowAction = 'login'; loginButton.innerHTML = icon('home'); $('.header-actions').insertBefore(loginButton, $('.role-selector'));

  function modal(title, html, onSubmit) {
    const node = document.createElement('div');
    node.innerHTML = html;
    api.openModal(title, 'Bản thử giao diện · Dữ liệu chỉ lưu trên trình duyệt.', node);
    const form = node.querySelector('form');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        if (!form.reportValidity()) return;
        const result = onSubmit(new FormData(form), form);
        if (result === false) return;
        $('#modal').close();
        api.render();
      };
    }
  }

  function gotoTickets(id = '') {
    if (ticketId !== id) resetCompose();
    ticketId = id;
    const url = new URL(location.href);
    if (phoneTicketsMount()) url.searchParams.set('phone_view', 'tickets');
    else url.searchParams.set('flow', 'tickets');
    if (role() === 'admin') url.searchParams.set('admin_page', 'tickets');
    if (id) url.searchParams.set('ticket', id); else url.searchParams.delete('ticket');
    history.pushState(null, '', url);
    sync();
    window.scrollTo(0, 0);
    $('#main')?.focus({ preventScroll: true });
  }
  function leaveTickets() {
    resetCompose();
    const url = new URL(location.href);
    url.searchParams.delete('flow');
    url.searchParams.delete('ticket');
    if (url.searchParams.get('admin_page') === 'tickets') url.searchParams.set('admin_page', 'overview');
    if (phoneTicketsMount()) url.searchParams.set('phone_view', 'more');
    history.replaceState(null, '', url);
    document.body.removeAttribute('data-workflow');
    screen.hidden = true;
  }

  function phoneTicketsMount() {
    return document.querySelector('#management-phone:not([hidden]) .management-page.is-current [data-phone-ticket-workspace]');
  }

  function showTickets() {
    read();
    const mount = phoneTicketsMount();
    const view = mount || screen;
    const driver = role() === 'driver' ? activeDriver() : null;
    const list = state.tickets.filter((t) => (role() !== 'driver' || belongsToDriver(t, driver)) && (filter === 'all' || t.status === filter));
    list.sort((a, b) => Number(b.emergency && b.status === 'open') - Number(a.emergency && a.status === 'open'));
    const ticket = list.find((t) => t.id === ticketId) || (mount ? null : list[0]);
    if (shownTicketId !== (ticket?.id || '') || ticket?.status === 'closed') resetCompose();
    shownTicketId = ticket?.id || '';
    ticketId = shownTicketId;
    const leftTools = `<div class="ticket-panel-tools"><select id="ticket-filter" aria-label="Trạng thái ticket"><option value="open" ${filter === 'open' ? 'selected' : ''}>Đang mở</option><option value="closed" ${filter === 'closed' ? 'selected' : ''}>Đã đóng</option><option value="all" ${filter === 'all' ? 'selected' : ''}>Tất cả</option></select>${role() === 'driver' ? btn('+ Mới', 'new-report', '', 'primary') : ''}</div>`;
    const rightTools = `<div class="ticket-panel-tools">${ticket && ticket.status === 'open' && role() === 'dispatch' ? `${btn('Đóng ticket', 'ticket-close', ticket.id)}${ticket.order ? btn(`Xử lý ${ticket.order}`, 'trip-exception', ticket.order) : ''}` : ''}${btn('Quay lại', 'leave-tickets')}</div>`;
    const back = mount && ticket ? btn('← Kênh', 'ticket-select') : '';
    const scroll = view.querySelector('.ticket-messages');
    const wasAtEnd = !scroll || scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 30;
    const scrollTop = scroll?.scrollTop || 0;
    const editor = view.querySelector('#ticket-message');
    const selection = editor && editor === document.activeElement ? [editor.selectionStart, editor.selectionEnd] : null;
    view.innerHTML = `<section class="page-heading"><span class="heading-icon">${icon('alert')}</span><h1>Sự cố & Ticket</h1></section>
      <div class="workflow-grid ticket-workspace ${ticket ? 'ticket-thread-open' : ''}">` +
      panel('Kênh ticket', `<div class="ticket-channels-list">${list.map((t) => `<button type="button" class="ticket-card" data-workflow-action="ticket-select" data-id="${esc(t.id)}" aria-current="${ticket?.id === t.id}"><strong>#${esc(t.code)} · ${t.emergency ? 'KHẨN CẤP 1 NÚT' : esc(t.kind)}</strong><small>${esc(t.description.slice(0, 95))}</small><small>${esc(t.order || 'Không gắn chuyến')} · ${esc(t.plate || 'Chưa có xe')}</small>${badge(t.status === 'closed' ? 'Đã đóng' : t.emergency ? 'Khẩn cấp · Mở' : 'Đang mở', t.status === 'closed' ? 'completed' : t.emergency ? 'neutral' : 'pending')}</button>`).join('') || '<p class="empty">Chưa có ticket trong nhóm này.</p>'}</div>`, 'order', leftTools) +
      panel(ticket ? `#${esc(ticket.code)} · ${ticket.emergency ? 'Khẩn cấp' : esc(ticket.kind)}` : 'Trao đổi', ticket ? thread(ticket) : '<p class="empty">Chọn một kênh để xem hội thoại.</p>', 'activity', back + rightTools) +
      '</div>';
    const messages = view.querySelector('.ticket-messages');
    if (messages) messages.scrollTop = wasAtEnd ? messages.scrollHeight : scrollTop;
    const nextEditor = view.querySelector('#ticket-message');
    if (selection && nextEditor) { nextEditor.focus({ preventScroll: true }); nextEditor.setSelectionRange(...selection); }
  }

  function renderMessageMedia(m) {
    const img = safeMediaUrl(m.imageUrl, 'data:image/')
      ? `<figure class="ticket-msg-media"><img class="ticket-msg-img" src="${esc(m.imageUrl)}" alt="${esc(m.imageName || 'Ảnh đính kèm ticket')}">${m.imageName ? `<figcaption>${esc(m.imageName)}</figcaption>` : ''}</figure>`
      : m.imageName
      ? `<div class="ticket-msg-file">Ảnh đính kèm: ${esc(m.imageName)}</div>`
      : '';
    const audio = safeMediaUrl(m.audioUrl, 'data:audio/')
      ? `<div class="ticket-msg-voice"><audio class="ticket-msg-audio" controls src="${esc(m.audioUrl)}"></audio>${m.voiceDuration ? `<small>Thoại · ${esc(m.voiceDuration)}</small>` : ''}</div>`
      : m.voiceDuration
      ? `<div class="ticket-msg-voice-pill"><span>Tin nhắn thoại</span><strong>${esc(m.voiceDuration)}</strong></div>`
      : '';
    return img + audio;
  }

  function thread(t) {
    const metaBadges = `<div class="ticket-meta-bar">
      <span><strong>Chuyến / xe:</strong> ${esc(t.order || '—')} · ${esc(t.plate || '—')}</span>
      <span><strong>Tài xế:</strong> ${esc(t.driver)}</span>
      <span><strong>Lúc:</strong> ${clock(t.at)}</span>
      ${t.phoneGps ? `<span><strong>GPS ĐT:</strong> ${formatMessageText(t.phoneGps)}</span>` : ''}
    </div>`;
    return metaBadges +
      `<div class="ticket-messages" role="log" aria-label="Lịch sử trao đổi">${t.messages.map((m) => `<article class="ticket-message ${m.role === role() ? 'own' : ''}"><strong>${esc(m.by)}</strong><time>${clock(m.at)}</time>${m.text ? `<p>${formatMessageText(m.text)}</p>` : ''}${renderMessageMedia(m)}</article>`).join('')}</div>` +
      (t.status === 'closed'
        ? `<div class="workflow-note">${badge('Hồ sơ chỉ đọc', 'completed')}${detail([['Kết quả xử lý', t.resolution], ['Người đóng', t.closedBy], ['Thời gian đóng', clock(t.closedAt)]])}<p>Giữ nguyên hội thoại. Đóng ticket không thay đổi trạng thái chuyến hoặc xe.</p></div>`
        : role() === 'admin'
        ? '<p class="workflow-note">Admin chỉ đọc toàn bộ hồ sơ và hội thoại. Chỉ Tài xế/Điều phối trao đổi; Điều phối ghi kết quả và đóng ticket.</p>'
        : `<form id="ticket-message-form" class="ticket-compose">
            <label for="ticket-message" class="sr-only">Nội dung trao đổi</label>
            ${composeImageUrl || composeVoiceDuration ? `<div class="ticket-compose-preview">
              ${safeMediaUrl(composeImageUrl, 'data:image/') ? `<span class="ticket-preview-chip"><img src="${esc(composeImageUrl)}" alt="Xem trước ảnh"><span>${esc(composeImageName || 'Ảnh chụp')}</span><button type="button" data-workflow-action="clear-chat-image" aria-label="Bỏ ảnh">×</button></span>` : ''}
              ${composeVoiceDuration ? `<span class="ticket-preview-chip"><span>Thoại (${esc(composeVoiceDuration)})</span><button type="button" data-workflow-action="clear-chat-voice" aria-label="Bỏ ghi âm">×</button></span>` : ''}
            </div>` : ''}
            <div class="ticket-compose-bar">
              <label class="secondary ticket-file-btn" title="Chọn hoặc chụp ảnh">${icon('camera')}<span>Ảnh</span><input class="sr-only" id="ticket-chat-photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" capture="environment"></label>
              <button type="button" class="secondary ticket-voice-btn" data-workflow-action="toggle-voice" ${voiceSession && !stopVoice ? 'disabled' : ''}>${stopVoice ? 'Dừng ghi' : voiceSession ? 'Đang xử lý…' : 'Ghi âm'}</button>
              <textarea id="ticket-message" name="message" rows="1" maxlength="2000" placeholder="Nhắn tin, gửi ảnh hoặc ghi âm...">${esc(composeDraft)}</textarea>
              <button class="primary ticket-send-btn" type="submit" ${voiceSession ? 'disabled' : ''}>Gửi</button>
            </div>
          </form>${role() === 'dispatch' ? '' : '<p class="workflow-note">Điều phối ghi kết quả và đóng ticket sau khi xử lý.</p>'}`);
  }

  function reportPage() {
    return `<form id="incident-form" class="role-form"><fieldset class="incident-kinds"><legend>Loại sự cố</legend><div><label><input type="radio" name="kind" value="Xe" checked>${icon('truck')}<span>Xe</span></label><label><input type="radio" name="kind" value="Đường">${icon('pin')}<span>Đường</span></label></div></fieldset>${detail([['Chuyến', currentTrip()?.id || 'Không gắn chuyến'], ['Xe', currentTrip()?.plate || 'Chưa có xe']])}<label>Mô tả<textarea name="description" rows="3" maxlength="500" required></textarea></label><label>Ảnh đính kèm (không bắt buộc)<input name="photo" type="file" accept="image/*" capture="environment"></label><p class="workflow-note">Chỉ tạo ticket sau khi gửi báo cáo thành công. Nút Khẩn cấp 1 chạm trên Phone sẽ tự chụp & gửi thẳng.</p><button class="primary">Gửi báo cáo & mở ticket</button></form>`;
  }

  function stage(o) { return o.workflowStage || (o.status === 'assigned' ? 'awaiting' : 'accepted'); }
  const stageNames = { awaiting: 'Chờ tài xế xác nhận', accepted: 'Đã nhận chuyến', picked_up: 'Đã lấy hàng (đã chụp đầu nhận)', delivered: 'Chờ Điều phối duyệt hoàn thành (đủ 2 đầu)', needs_more: 'Cần bổ sung bằng chứng', paused: 'Đang chờ xử lý ngoại lệ', completed: 'Hoàn thành' };

  function tripActions(o) {
    const st = stage(o);
    return `<ol class="workflow-steps">${[['awaiting', 'Nhận chuyến'], ['accepted', 'Lấy hàng'], ['picked_up', 'Giao hàng'], ['delivered', 'Duyệt hoàn thành']].map(([k, v]) => `<li ${st === k ? 'aria-current="step"' : ''}>${v}</li>`).join('')}</ol><p>${badge(stageNames[st] || 'Đang thực hiện', st === 'delivered' ? 'pending' : 'running')}</p><div class="workflow-inline-actions">${st === 'awaiting' ? btn('Nhận chuyến', 'trip-accept', o.id, 'primary') + btn('Từ chối có lý do', 'trip-decline', o.id) : st === 'accepted' ? btn('Xác nhận lấy hàng', 'trip-pickup', o.id, 'primary') : ['picked_up', 'needs_more'].includes(st) ? btn('Gửi bằng chứng giao hàng', 'trip-evidence', o.id, 'primary') : ''}</div><p class="workflow-note">Không đặt đồng hồ đếm ngược tự hết hạn; Điều phối liên hệ trực tiếp nếu tài xế chưa phản hồi.</p>`;
  }

  function completedMonth(plate) {
    const month = '2026-11';
    return api.snapshot().orders.filter((o) => o.plate === plate && o.status === 'completed' && (o.completedAt || o.day).slice(0, 7) === month).length;
  }

  function adminFleetMap() {
    const original = $('#dispatch-view .map-art'), svg = original.cloneNode(true);
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', 'Sơ đồ vị trí xe mẫu, chọn xe để xem thông tin');
    for (const node of [...svg.children]) if ((node.tagName.toLowerCase() === 'g' && node !== svg.querySelector('g')) || (node.tagName.toLowerCase() === 'path' && node.getAttribute('stroke-linecap') === 'round')) node.remove();
    svg.insertAdjacentHTML('beforeend', api.snapshot().vehicles.map((v) => {
      const d = api.snapshot().drivers.find((x) => x.id === v.driverId), name = d?.name || 'Chưa gán tài xế', short = name.replace('Tài xế ', '').replace(' (mẫu)', '');
      return `<g class="admin-marker ${v.plate === adminPlate ? 'chosen' : ''}" data-gps="${esc(v.gps)}" role="button" tabindex="0" data-workflow-action="admin-vehicle" data-id="${esc(v.plate)}" aria-label="Xem xe ${esc(v.plate)}, ${esc(name)}" transform="translate(${v.x},${v.y})"><title>${esc(v.plate)} · ${esc(name)}</title><circle r="${v.plate === adminPlate ? 10 : 7}"/><rect x="-51" y="15" width="102" height="37" rx="4"/><text x="0" y="29" text-anchor="middle">${esc(v.plate)}</text><text x="0" y="43" text-anchor="middle">${esc(short.length > 16 ? short.slice(0, 15) + '…' : short)}</text></g>`;
    }).join(''));
    return `<div class="map admin-tracking-map">${svg.outerHTML}<span class="map-caption">Vị trí mẫu · GPS Taris chu kỳ 10 phút</span></div>`;
  }

  function adminMonitoring() {
    const s = api.snapshot(), v = s.vehicles.find((x) => x.plate === adminPlate) || s.vehicles[0];
    if (!v) return '';
    adminPlate = v.plate;
    const o = s.orders.find((x) => x.plate === v.plate && ['assigned', 'running'].includes(x.status)), drv = s.drivers.find((d) => d.id === v.driverId);
    const users = roles.snapshot().users, activities = roles.snapshot().audit.filter((a) => a.actor === s.settings.dispatcher || a.actor === 'Điều phối' || users.some((u) => u.name === a.actor && u.role === 'dispatch'));
    return `<div id="admin-monitoring" class="role-wide"><div class="workflow-grid">` +
      panel('Vị trí đội xe', adminFleetMap() + `<div class="admin-vehicle-list" aria-label="Chọn xe theo dõi">${s.vehicles.map((x) => `<button type="button" data-workflow-action="admin-vehicle" data-id="${esc(x.plate)}" aria-pressed="${x.plate === adminPlate}"><span><strong>${esc(x.plate)}</strong><small>${esc(x.type)} · ${esc(s.drivers.find((d) => d.id === x.driverId)?.name || 'Chưa gán tài xế')}</small></span><span>${badge(x.gps === 'offline' ? 'Mất tín hiệu mẫu' : x.gps === 'stale' ? 'Vị trí cũ' : 'Có tín hiệu mẫu', x.gps === 'offline' ? 'neutral' : x.gps === 'stale' ? 'pending' : 'completed')}</span></button>`).join('')}</div>`, 'pin') +
      panel('Xe đang theo dõi', detail([['Biển số', v.plate], ['Loại xe', v.type], ['Tài xế', drv?.name || 'Chưa gán'], ['Chuyến đang thực hiện', o?.id || 'Chưa có'], ['Điểm lấy → giao', o ? `${o.from} → ${o.to}` : '—'], ['Dữ liệu GPS Taris lúc', v.updated ? clock(v.updated) : 'Chưa có'], ['Tình trạng GPS', v.gps === 'offline' ? 'Mất tín hiệu mẫu' : v.gps === 'stale' ? 'Chưa cập nhật' : 'Có tín hiệu mẫu']]) + `<p class="workflow-note">Vị trí gắn với xe Taris (chu kỳ 10 phút), tách riêng GPS điện thoại tài xế.</p>${btn('Xem ticket đang mở (Chỉ đọc)', 'tickets', '', 'primary')}`, 'truck') +
      `</div></div><div id="admin-dispatch-activity" class="role-wide"><div class="workflow-grid">` +
      panel('Tổng quan hoạt động Điều phối', detail([['Tổng thao tác ghi nhận', `${activities.length} lượt`], ['Đơn đang chờ phân xe', `${s.orders.filter((x) => x.status === 'pending').length} đơn`], ['Chuyến đang chạy / Chờ TX', `${s.orders.filter((x) => ['assigned', 'running'].includes(x.status)).length} chuyến`], ['Phạm vi quyền Admin', 'Chỉ đọc (không duyệt phân công)']]) + `<p class="workflow-note">Phân công V1 và xử lý ngoại lệ do Điều phối thực hiện; Admin giám sát toàn công ty.</p>`, 'chart') +
      panel('Hoạt động Điều phối', `<div class="table-wrap" tabindex="0" role="region" aria-label="Nhật ký hoạt động Điều phối"><table class="role-table"><thead><tr><th>Thời gian</th><th>Điều phối viên</th><th>Thao tác</th><th>Đơn / chuyến</th></tr></thead><tbody>${activities.map((a) => `<tr><td>${clock(a.at)}</td><td>${esc(a.actor)}</td><td>${esc(a.action)}</td><td>${esc(a.order || '—')}</td></tr>`).join('') || '<tr><td colspan="4">Chưa có thao tác Điều phối được ghi nhận.</td></tr>'}</tbody></table></div><p class="workflow-note">Hiển thị các thao tác Điều phối đã ghi nhận (chỉ đọc). Admin không duyệt phân công hay đổi role tài khoản.</p>`, 'activity') +
      `</div></div>`;
  }

  const adminPages = {
    overview: ['Tổng quan', 'Thống kê đơn 6/12 tháng, giám sát vận hành toàn công ty.', 'chart'],
    approvals: ['Nhật ký vận hành', 'Tra cứu lịch sử phân công và hoạt động Điều phối (chỉ đọc).', 'order'],
    fleet: ['Bản đồ đội xe', 'Theo dõi vị trí, chuyến và trạng thái GPS Taris từng xe.', 'pin'],
    activity: ['Hoạt động Điều phối', 'Các thao tác đã ghi nhận của Điều phối viên.', 'activity'],
    tickets: ['Sự cố & ticket', 'Xem hội thoại và hồ sơ xử lý sự cố (chế độ chỉ đọc).', 'alert'],
    maintenance: ['Bảo trì & Cảnh báo', 'Gửi yêu cầu bảo trì sang System Admin và theo dõi thông báo khóa tài khoản khẩn cấp.', 'gear'],
  };
  function adminPage() { const p = new URLSearchParams(location.search); return p.get('flow') === 'tickets' ? 'tickets' : Object.hasOwn(adminPages, p.get('admin_page')) ? p.get('admin_page') : 'overview'; }
  function navigateAdmin(page) {
    if (!Object.hasOwn(adminPages, page)) return;
    const url = new URL(location.href);
    url.searchParams.set('admin_page', page);
    url.searchParams.delete('ticket');
    if (page === 'tickets') url.searchParams.set('flow', 'tickets'); else url.searchParams.delete('flow');
    history.pushState(null, '', url);
    roles.render();
    window.scrollTo(0, 0);
    $('#main').focus({ preventScroll: true });
  }
  function renderAdminPage() {
    const page = adminPage(), titles = adminPages[page], root = $('#role-view');
    root.dataset.adminPage = page;
    const groups = [...root.querySelector('.role-grid').children];
    for (const [i, node] of groups.entries()) {
      const content = i < 4 ? ['approvals', 'approvals', 'overview', 'maintenance'][i] : node.id === 'admin-monitoring' ? 'fleet' : 'activity';
      node.dataset.adminContent = content;
      node.hidden = page === 'overview' ? i >= 4 : content !== page;
    }
    root.querySelector('.stats').hidden = page !== 'overview';
    root.querySelector('h1').textContent = titles[0];
    root.querySelector('.page-heading p').textContent = titles[1];
    root.querySelector('.heading-icon').innerHTML = icon(titles[2]);
    $('.crumb').innerHTML = `${icon('home')}<span>/</span>${esc(titles[0].toLocaleUpperCase('vi'))}`;
    document.title = titles[0] + ' - Fleet Autopilot';
    $('.role-nav').innerHTML = Object.entries(adminPages).map(([id, [title, , ico]]) => `<button id="admin-nav-${id === 'fleet' ? 'map' : id}" data-workflow-action="admin-page" data-id="${id}" class="${page === id ? 'active' : ''}" ${page === id ? 'aria-current="page"' : ''} title="${title}">${icon(ico)}<span class="nav-label">${title}</span></button>`).join('');
  }

  function enhance() {
    const openTickets = state.tickets.filter((t) => t.status === 'open').length;
    navButton.title = `Sự cố & ticket · ${openTickets} đang mở`;
    navButton.setAttribute('aria-label', navButton.title);
    navButton.querySelector('.nav-label').textContent = `Sự cố & ticket (${openTickets})`;
    if (role() === 'admin') {
      const metric = $('#role-view .stats .stat:last-child strong');
      if (metric) metric.textContent = api.snapshot().orders.filter((o) => o.status === 'pending').length + openTickets;
      if (!$('#admin-monitoring')) $('#role-view .role-grid')?.insertAdjacentHTML('beforeend', adminMonitoring());
      renderAdminPage();
    }
    if (role() === 'driver') {
      const form = $('#incident-form');
      if (form) {
        form.outerHTML = reportPage();
        const list = $('#role-view .driver-layout .panel:nth-of-type(3)');
        if (list) list.innerHTML = `<div class="panel-heading"><h2>${icon('order')}Ticket sự cố</h2></div><p class="workflow-note">${openTickets} ticket đang mở; hồ sơ đã đóng vẫn được giữ.</p>${btn('Xem ticket & trao đổi', 'tickets', '', 'primary')}`;
      }
      const o = currentTrip(), orderEl = $('#role-view .driver-order');
      if (orderEl && o && !$('#driver-workflow')) orderEl.insertAdjacentHTML('afterend', `<div id="driver-workflow">${tripActions(o)}</div>`);
      const actions = $('#role-view .driver-actions');
      if (actions && !actions.querySelector('[data-workflow-action=tickets]')) actions.insertAdjacentHTML('beforeend', btn('Ticket & trao đổi', 'tickets'));
    }
    if (role() === 'dispatch') {
      $('.page-heading p').textContent = 'Tiếp nhận đơn từ Sale, duyệt phân công V1, đối chiếu bằng chứng 2 đầu và xử lý ngoại lệ.';
      $('#suggest').setAttribute('title', 'AI đề xuất V1: công bằng việc tháng trước, tuyến sau (công thức chờ chốt)');
      $('.list-label').innerHTML = 'Xe đủ điều kiện <span>Công bằng trước · Tuyến sau (chưa chốt công thức)</span>';
      for (const candidate of document.querySelectorAll('.vehicle[data-vehicle]')) {
        if (!candidate.querySelector('.workflow-candidate-note')) {
          candidate.insertAdjacentHTML('beforeend', `<small class="workflow-candidate-note">${completedMonth(candidate.dataset.vehicle)} chuyến T11 · Tham khảo</small>`);
        }
      }
      const dispatch = $('#dispatch-view .dispatch');
      if (!$('#dispatch-workflow-note')) dispatch.insertAdjacentHTML('beforeend', '<p id="dispatch-workflow-note" class="workflow-note">1 xe 1 đơn, không ghép/chia thường lệ (xe hỗ trợ khi hư là ngoại lệ Điều phối quyết). Công bằng trước tuyến sau — chưa chốt công thức xếp hạng.</p>');
      if (!$('#dispatch-workflow-actions')) {
        dispatch.insertAdjacentHTML('beforeend', `<div id="dispatch-workflow-actions" class="workflow-inline-actions">${btn(`Sự cố & Khẩn cấp (${openTickets})`, 'tickets')}${btn('Kiểm bằng chứng 2 đầu', 'trip-list')}${btn('Hỗ trợ quên mật khẩu', 'help-recovery')}</div>`);
      }
      if (new URLSearchParams(location.search).get('page') === 'orders' && !$('#order-source-note')) {
        $('#workspace-view .panel')?.insertAdjacentHTML('afterbegin', '<p id="order-source-note" class="workflow-source">Sale gửi thông tin qua kênh ngoài website; Điều phối tiếp nhận đơn (≤100 km, đơn vị viên/kg/m³) tại đây.</p>');
      }
      if (new URLSearchParams(location.search).get('page') === 'reports' && !$('#month-jobs')) {
        $('#workspace-view').insertAdjacentHTML('beforeend', panel('Việc theo xe trong tháng (tham khảo)', `<div id="month-jobs" class="table-wrap"><table class="role-table"><thead><tr><th>Xe</th><th>Loại xe</th><th>Chuyến hoàn thành T11</th><th>Trạng thái</th></tr></thead><tbody>${api.snapshot().vehicles.map((v) => `<tr><td>${esc(v.plate)}</td><td>${esc(v.type)}</td><td>${completedMonth(v.plate)}</td><td>${v.availability === 'awaiting_check' ? btn('Xác nhận sẵn sàng', 'vehicle-ready', v.plate, 'primary') : esc(v.availability === 'ready' ? 'Sẵn sàng' : 'Bảo trì')}</td></tr>`).join('')}</tbody></table></div><p class="workflow-note">Thống kê tham khảo tháng hiện tại; công thức đo công bằng còn chờ chốt.</p>`, 'chart'));
      }
    }
    if (role() === 'admin_system') {
      const section = $('#role-view .role-grid .panel');
      if (section && !$('#provision-account')) section.insertAdjacentHTML('beforeend', '<p id="provision-account" class="workflow-note">Tài khoản nội bộ do System Admin cấp và quản lý phân quyền thường; cấp role quản trị cần người công ty chỉ định duyệt.</p>');
      const old = $('[data-role-action=user-new]');
      if (old) { old.textContent = 'Cấp tài khoản'; old.dataset.workflowAction = 'provision'; delete old.dataset.roleAction; }
    }
  }

  function sync() {
    const r = role();
    const params = new URLSearchParams(location.search);
    if (lastRole !== r) { resetCompose(); ticketId = ''; lastRole = r; }
    read();
    enhance();
    const phone = matchMedia('(max-width: 759px)').matches;
    const show = !phone && (params.get('flow') === 'tickets' || (r === 'admin' && adminPage() === 'tickets')) && ['dispatch', 'driver', 'admin'].includes(r);
    if (!show && !(phone && params.get('phone_view') === 'tickets')) resetCompose();
    if (show || (phone && params.get('phone_view') === 'tickets')) ticketId = params.get('ticket') || '';
    screen.hidden = !show;
    if (show) {
      document.body.dataset.workflow = 'tickets';
      showTickets();
      if (r === 'dispatch') {
        document.querySelectorAll('.sidebar nav button[data-page]').forEach((b) => {
          b.classList.remove('active');
          b.removeAttribute('aria-current');
        });
        navButton.classList.add('active');
        navButton.setAttribute('aria-current', 'page');
        const crumb = $('.crumb');
        if (crumb) crumb.innerHTML = `${icon('home')}<span>/</span>Sự cố & ticket`;
      }
      document.title = 'Sự cố & ticket - Fleet Autopilot';
    } else {
      document.body.removeAttribute('data-workflow');
      navButton.classList.remove('active');
      navButton.removeAttribute('aria-current');
    }
    window.dispatchEvent(new Event('fleet:workflow-sync'));
  }

  // Kiểm bằng chứng 2 đầu (đầu nhận + đầu giao + GPS điện thoại vs GPS Taris)
  function tripReview(o) {
    if (!o || !['admin', 'dispatch'].includes(role())) return;
    const allEv = roles.snapshot().evidence.filter((e) => e.order === o.id);
    const pickupEv = allEv.filter((e) => e.kind === 'pickup');
    const deliveryEv = allEv.filter((e) => e.kind === 'delivery');
    const veh = api.snapshot().vehicles.find((v) => v.plate === o.plate);
    const evList = (items, emptyText) => items.map((e) => `<div class="role-row"><div><strong>${esc(e.filename)}</strong><small>${clock(e.at)} · GPS điện thoại: ${esc(e.gps?.lat)}, ${esc(e.gps?.lon)}</small></div></div>`).join('') || `<p class="workflow-note">${emptyText}</p>`;

    modal('Kiểm bằng chứng 2 đầu · ' + o.id,
      detail([
        ['Nhóm khách & vật liệu', `${o.customerGroup || '—'} · ${o.material} (${qtyText(o)})`],
        ['Xe phụ trách', `${o.plate || '—'}${o.supportPlate ? ` · Xe hỗ trợ: ${o.supportPlate}` : ''}`],
        ['Tiến độ chuyến', stageNames[stage(o)] || o.status],
        ['Lượng thực lấy', o.actualQuantity ? `${api.formatNum ? api.formatNum(o.actualQuantity) : o.actualQuantity} ${o.unit || 'm³'}` : 'Chưa xác nhận'],
        ['Tín hiệu GPS xe Taris', veh ? `${veh.gps === 'fresh' ? 'Có tín hiệu mẫu' : veh.gps === 'stale' ? 'Chưa cập nhật' : 'Mất tín hiệu'} (${clock(veh.updated)})` : '—'],
        ['Yêu cầu bổ sung / Ngoại lệ', [o.evidenceNote, o.exceptionReason].filter(Boolean).join(' · ') || '—'],
      ]) +
      `<h3>1. Ảnh đầu nhận hàng (Pickup)</h3>${evList(pickupEv, 'Chưa có ảnh đầu nhận từ tài xế.')}` +
      `<h3>2. Ảnh đầu giao hàng (Delivery)</h3>${evList(deliveryEv, 'Chưa có ảnh đầu giao từ tài xế.')}` +
      `<div class="workflow-inline-actions">
        ${role() === 'dispatch' && stage(o) === 'delivered' && pickupEv.length && deliveryEv.length ? btn('Duyệt hoàn thành', 'trip-approve', o.id, 'primary') : ''}
        ${role() === 'dispatch' && o.status === 'running' ? btn('Yêu cầu bổ sung bằng chứng', 'trip-supplement', o.id) : ''}
        ${role() === 'dispatch' && ['running', 'assigned'].includes(o.status) ? btn('Xử lý ngoại lệ (4 nhánh)', 'trip-exception', o.id) : ''}
        ${role() === 'dispatch' && veh?.availability === 'awaiting_check' ? btn('Xác nhận xe sẵn sàng', 'vehicle-ready', veh.plate, 'primary') : ''}
      </div>
      <p class="workflow-note">GPS điện thoại làm bằng chứng tách riêng GPS xe Taris. Duyệt hoàn thành mới đóng đơn và cho phép xác nhận xe về Sẵn sàng.</p>`
    );
  }

  // Điều phối hỗ trợ gửi yêu cầu quên tài khoản/mật khẩu cho tài xế lên hàng chờ System Admin (Flow 13)
  function openHelpRecovery() {
    const drivers = api.snapshot().drivers;
    modal('Hỗ trợ gửi yêu cầu quên tài khoản / mật khẩu',
      `<form class="role-form">
        <label>Loại yêu cầu<select name="kind"><option value="password">Quên mật khẩu (cấp mã 1 lần)</option><option value="username">Quên tên tài khoản (bàn giao lại tên)</option></select></label>
        <label>Tài xế cần hỗ trợ<select name="target">${drivers.map((d) => `<option value="${esc(d.name)}">${esc(d.name)} · ${esc(d.id)}</option>`).join('')}</select></label>
        ${input('Ghi chú liên hệ / tình huống', 'note', '', 'text', 'placeholder="VD: Tài xế gọi báo quên mật khẩu tại bãi"')}
        <p class="workflow-note">Điều phối chỉ hỗ trợ chuyển yêu cầu lên hàng chờ System Admin; không xác minh danh tính, không duyệt và không cấp mã thay System Admin.</p>
        <button class="primary">Gửi lên hàng chờ System Admin</button>
      </form>`,
      (f) => {
        const kind = f.get('kind'), target = String(f.get('target') || '').trim(), note = String(f.get('note') || '').trim();
        if (!target || !note) return false;
        if (window.FleetGovernance?.submitRecovery) {
          window.FleetGovernance.submitRecovery({ kind, target, submittedBy: `${actor()} (Điều phối hỗ trợ)`, note });
        }
        api.commit('Hỗ trợ gửi yêu cầu khôi phục TK/MK', `${target} · ${kind === 'username' ? 'Quên tên TK' : 'Quên mật khẩu'}`);
        api.toast('Đã chuyển yêu cầu vào hàng chờ System Admin.');
      }
    );
  }

  // Xem thử cụm màn Đăng nhập + Passkey quản trị + Đổi mật khẩu lần đầu + Quên TK/MK + Nhập mã 1 lần (Flow 04 & 13)
  function authPreview(tabName = 'login') {
    const tabs = [
      ['login', 'Đăng nhập'],
      ['passkey', 'Passkey quản trị'],
      ['first', 'Đổi MK lần đầu'],
      ['forgot', 'Quên TK / MK'],
      ['code', 'Nhập mã 1 lần'],
    ];
    const tabBar = `<div class="workflow-inline-actions" style="margin-bottom:10px">${tabs.map(([k, lbl]) => `<button type="button" class="${tabName === k ? 'primary' : 'secondary'}" data-workflow-action="auth-tab" data-id="${k}">${lbl}</button>`).join('')}</div>`;

    if (tabName === 'passkey') {
      modal('Xác thực Passkey quản trị (Flow 04)', tabBar +
        `<form class="role-form">
          ${badge('Bắt buộc cho Admin & System Admin', 'pending')}
          <p class="workflow-note">Xác thực bằng vân tay, khuôn mặt hoặc mã khóa thiết bị (thay Google Authenticator / SMS OTP). Không có đường bỏ qua bảo vệ.</p>
          <label class="workflow-check"><input type="checkbox" required name="verified">Mô phỏng xác nhận Passkey trên thiết bị hợp lệ</label>
          <button class="primary">Hoàn tất xem thử Passkey</button>
        </form>`,
        () => api.toast('Đã xem thử bước Passkey quản trị (chưa tạo phiên thật).')
      );
      return;
    }
    if (tabName === 'first') {
      modal('Đổi mật khẩu lần đầu (Flow 04.3)', tabBar +
        `<form class="role-form">
          ${input('Mật khẩu mới (dữ liệu thử)', 'password', '', 'password')}
          ${input('Nhập lại mật khẩu mới', 'repeat', '', 'password')}
          <p id="password-error" class="form-error" hidden></p>
          <p class="workflow-note">Bắt buộc khi đăng nhập bằng mật khẩu tạm do System Admin cấp. Đổi xong thu hồi mật khẩu tạm.</p>
          <button class="primary">Xác nhận đổi mật khẩu</button>
        </form>`,
        (f, form) => {
          if (f.get('password') !== f.get('repeat')) {
            form.querySelector('#password-error').hidden = false;
            form.querySelector('#password-error').textContent = 'Hai mật khẩu chưa khớp.';
            return false;
          }
          api.toast('Đã xem thử bước đổi mật khẩu lần đầu.');
        }
      );
      return;
    }
    if (tabName === 'forgot') {
      modal('Gửi yêu cầu quên tài khoản / mật khẩu (Flow 13)', tabBar +
        `<form class="role-form">
          <label>Loại yêu cầu<select name="kind"><option value="password">Quên mật khẩu</option><option value="username">Quên tên tài khoản</option></select></label>
          ${input('Họ tên hoặc tài khoản cần hỗ trợ', 'target')}
          ${input('Ghi chú liên hệ xác minh', 'note')}
          <p class="workflow-note">Không dùng OTP tự động. Yêu cầu chuyển sang hàng chờ System Admin xác minh đúng người rồi mới cấp mã 1 lần.</p>
          <button class="primary">Gửi yêu cầu vào hàng chờ System Admin</button>
        </form>`,
        (f) => {
          const target = String(f.get('target') || '').trim(), note = String(f.get('note') || '').trim();
          if (!target || !note) return false;
          window.FleetGovernance?.submitRecovery?.({ kind: f.get('kind'), target, submittedBy: 'Người dùng (Trang đăng nhập)', note });
          api.toast('Đã gửi yêu cầu khôi phục mẫu sang hàng chờ System Admin.');
        }
      );
      return;
    }
    if (tabName === 'code') {
      modal('Nhập mã khôi phục 1 lần & đặt mật khẩu mới (Flow 13)', tabBar +
        `<form class="role-form">
          ${input('Mã khôi phục 1 lần (System Admin bàn giao)', 'code', '', 'text', 'placeholder="VD: REC-849201"')}
          ${input('Mật khẩu mới', 'password', '', 'password')}
          ${input('Nhập lại mật khẩu mới', 'repeat', '', 'password')}
          <p id="code-error" class="form-error" hidden></p>
          <p class="workflow-note">Mã dùng một lần, có thời hạn và giới hạn thử. Đổi mật khẩu thành công tự thu hồi phiên cũ, không tự đổi role hay bỏ Passkey.</p>
          <button class="primary">Đặt mật khẩu mới (mẫu)</button>
        </form>`,
        (f, form) => {
          if (f.get('password') !== f.get('repeat')) {
            form.querySelector('#code-error').hidden = false;
            form.querySelector('#code-error').textContent = 'Hai mật khẩu chưa khớp.';
            return false;
          }
          api.toast('Đã xem thử bước đặt mật khẩu bằng mã 1 lần (không lưu mật khẩu).');
        }
      );
      return;
    }
    modal('Đăng nhập nội bộ (Flow 04)', tabBar +
      `<form class="role-form">
        ${input('Tài khoản được cấp', 'username')}
        ${input('Mật khẩu (dữ liệu thử)', 'password', '', 'password')}
        <label>Vai trò mô phỏng<select name="simRole"><option value="ordinary">Tài xế / Điều phối (Tài khoản + Mật khẩu)</option><option value="admin">Admin / System Admin (Yêu cầu thêm Passkey)</option></select></label>
        <p class="workflow-note">Không có đăng ký công khai. Tài khoản do System Admin cấp; bản thử không lưu hay xác thực mật khẩu thật.</p>
        <button class="primary">Tiếp tục xem thử</button>
      </form>`,
      (f) => {
        const nextTab = f.get('simRole') === 'admin' ? 'passkey' : 'first';
        setTimeout(() => authPreview(nextTab), 0);
      }
    );
  }

  function changeTrip(o, action, update) { update(); api.commit(o.id + ': ' + action, o.plate || '', actor()); }

  function respondToTrip(orderId, decision, reason = '') {
    if (role() !== 'driver' || !['accept', 'decline'].includes(decision)) return false;
    const o = currentTrip();
    const driver = activeDriver();
    if (!driver || o?.id !== orderId || o.status !== 'assigned') return false;
    const plate = o.plate;
    if (decision === 'accept') {
      o.status = 'running';
      o.workflowStage = 'accepted';
      api.commit(`${o.id}: Tài xế nhận chuyến`, plate, driver.name);
    } else {
      const note = String(reason).trim();
      if (!note || note.length > 500) return false;
      Object.assign(o, { status: 'pending', workflowStage: 'awaiting', previousPlate: plate, plate: '' });
      api.commit(`${o.id}: Từ chối chuyến · ${note}`, plate, driver.name);
    }
    return true;
  }

  function openException(o) {
    if (!o || role() !== 'dispatch' || !['assigned', 'running'].includes(o.status)) return;
    const supportCandidates = api.snapshot().vehicles.filter((v) => v.plate !== o.plate && v.availability === 'ready' && !api.snapshot().orders.some((x) => x.plate === v.plate && ['assigned', 'running'].includes(x.status)));
    modal('Xử lý ngoại lệ · ' + o.id,
      `<form class="role-form">
        <label>Phương án xử lý (4 nhánh Flow 03.4)
          <select name="resolution" id="exc-resolution">
            <option value="hold">1. Chờ xử lý (tạm giữ chuyến)</option>
            <option value="support">2. Xe hư — Điều thêm xe hỗ trợ (sửa chữa / niêm phong)</option>
            <option value="reassign">3. Phân lại xe khác (đưa về chờ phân)</option>
            <option value="cancel">4. Hủy đơn (yêu cầu gõ xác nhận mã đơn)</option>
            <option value="resume">Tiếp tục chuyến đang tạm dừng</option>
          </select>
        </label>
        <label>Xe hỗ trợ (khi chọn nhánh Xe hư)
          <select name="supportPlate">
            <option value="">— Chọn xe hỗ trợ sẵn sàng —</option>
            ${supportCandidates.map((v) => `<option value="${esc(v.plate)}">${esc(v.plate)} · ${esc(v.type)} (${esc(v.capacityText)})</option>`).join('')}
          </select>
        </label>
        <label>Xử lý xe hư (khi chọn nhánh Xe hư)
          <select name="brokenState">
            <option value="maintenance">Đưa xe hư về sửa chữa / bảo dưỡng</option>
            <option value="sealed">Niêm phong xe hư tại chỗ / bãi</option>
          </select>
        </label>
        <label>Gõ mã đơn (${esc(o.id)}) nếu chọn Hủy đơn ("Nhập lại")<input name="confirmCode" placeholder="Chỉ bắt buộc khi chọn Hủy đơn"></label>
        <label>Lý do / diễn biến ngoại lệ<textarea name="reason" required maxlength="1000"></textarea></label>
        <p id="exc-error" class="form-error" hidden></p>
        <p class="workflow-note">Xe hỗ trợ là ngoại lệ vận hành do Điều phối quyết định (liên kết đơn gốc – xe hư – xe hỗ trợ), không phải ghép/chia đơn thường lệ.</p>
        <button class="primary">Lưu phương án ngoại lệ</button>
      </form>`,
      (f, form) => {
        const reason = String(f.get('reason') || '').trim(), resolution = f.get('resolution');
        const err = form.querySelector('#exc-error');
        if (!reason) return false;
        if (resolution === 'support') {
          const sp = String(f.get('supportPlate') || '').trim();
          const brokenState = f.get('brokenState') === 'sealed' ? 'Niêm phong' : 'Sửa chữa / bảo dưỡng';
          if (!sp) { err.hidden = false; err.textContent = 'Vui lòng chọn xe hỗ trợ sẵn sàng cho nhánh Xe hư.'; return false; }
          changeTrip(o, `Ngoại lệ xe hư (${brokenState}) → Điều xe hỗ trợ ${sp}`, () => {
            const brokenVeh = api.snapshot().vehicles.find((v) => v.plate === o.plate);
            if (brokenVeh) brokenVeh.availability = 'maintenance';
            o.brokenPlate = o.plate;
            o.brokenDisposition = brokenState;
            o.supportPlate = sp;
            o.exceptionReason = `Xe hư ${o.plate} (${brokenState}), điều xe hỗ trợ ${sp} · ${reason}`;
          });
          return true;
        }
        if (resolution === 'cancel') {
          const typed = String(f.get('confirmCode') || '').trim().toUpperCase();
          if (typed !== o.id.toUpperCase()) {
            err.hidden = false;
            err.textContent = `Vui lòng gõ đúng mã đơn "${o.id}" để xác nhận chủ ý hủy.`;
            return false;
          }
        }
        changeTrip(o, 'Xử lý ngoại lệ · ' + reason, () => {
          o.exceptionReason = reason;
          if (resolution === 'hold') { o.previousStage = stage(o); o.workflowStage = 'paused'; }
          else if (resolution === 'resume') { o.workflowStage = o.previousStage || stage(o); if (o.workflowStage === 'paused') o.workflowStage = o.actualQuantity ? 'picked_up' : 'accepted'; }
          else {
            const v = api.snapshot().vehicles.find((x) => x.plate === o.plate);
            if (v) v.availability = 'awaiting_check';
            o.previousPlate = o.plate;
            o.plate = '';
            o.status = resolution === 'cancel' ? 'cancelled' : 'pending';
            o.workflowStage = 'awaiting';
            if (resolution === 'cancel') o.cancelReason = reason;
            delete o.actualQuantity;
          }
        });
      }
    );
  }

  function sendMessage(tId, payload) {
    if (!['dispatch', 'driver'].includes(role())) return false;
    const isObj = payload && typeof payload === 'object';
    const clean = String(isObj ? payload.text || '' : payload || '').trim();
    const imageUrl = isObj ? safeMediaUrl(payload.imageUrl, 'data:image/') : '';
    const imageName = isObj ? String(payload.imageName || '').trim() : '';
    const audioUrl = isObj ? safeMediaUrl(payload.audioUrl, 'data:audio/') : '';
    const voiceDuration = isObj ? String(payload.voiceDuration || '').trim() : '';
    if (clean.length > 2000 || (!clean && !imageUrl && !audioUrl)) return false;
    read();
    const t = state.tickets.find((x) => x.id === tId);
    if (!t || t.status !== 'open') { api.toast('Ticket đã đóng. Chỉ có thể đọc hồ sơ.'); return false; }
    const driver = role() === 'driver' ? activeDriver() : null;
    if (role() === 'driver' && !belongsToDriver(t, driver)) return false;
    const next = structuredClone(state);
    next.tickets.find((x) => x.id === tId).messages.push({
      id: uid('M'),
      by: driver?.name || actor(),
      role: role(),
      text: clean,
      ...(imageUrl ? { imageUrl } : {}),
      ...(imageUrl && imageName ? { imageName: imageName.slice(0, 120) } : {}),
      ...(audioUrl ? { audioUrl } : {}),
      ...(audioUrl && voiceDuration ? { voiceDuration: voiceDuration.slice(0, 12) } : {}),
      at: now(),
    });
    if (persist(next)) {
      resetCompose();
      api.render();
      window.dispatchEvent(new Event('fleet:workflow-sync'));
      return true;
    }
    return false;
  }

  function resetCompose() {
    voiceSession?.abort();
    voiceSession = stopVoice = null;
    composeDraft = composeImageUrl = composeImageName = composeAudioUrl = composeVoiceDuration = '';
  }

  async function toggleVoiceRecord() {
    if (!['dispatch', 'driver'].includes(role()) || !document.querySelector('#ticket-message-form')) return;
    if (stopVoice) { stopVoice(); stopVoice = null; showTickets(); return; }
    if (voiceSession) return;
    composeAudioUrl = composeVoiceDuration = '';
    const session = new AbortController();
    voiceSession = session;
    showTickets();
    const finish = () => { voiceSession = stopVoice = null; showTickets(); };
    const fail = () => {
      if (session.signal.aborted) return;
      finish();
      api.toast('Không ghi được âm thanh. Kiểm tra quyền micro hoặc thử lại.');
    };
    try {
      const stop = await window.FleetTicketMedia.recordVoice(session.signal, (audio, duration) => {
        composeAudioUrl = audio;
        composeVoiceDuration = duration;
        finish();
      }, fail);
      if (voiceSession === session) { stopVoice = stop; showTickets(); }
    } catch { fail(); }
  }

  function closeTicket(tId, resolution) {
    if (role() !== 'dispatch') return false;
    const clean = String(resolution || '').trim();
    if (!clean) return false;
    read();
    const t = state.tickets.find((x) => x.id === tId);
    if (!t || t.status !== 'open') return false;
    const next = structuredClone(state);
    Object.assign(next.tickets.find((x) => x.id === tId), { status: 'closed', resolution: clean, closedBy: actor(), closedAt: now() });
    if (persist(next)) { api.render(); window.dispatchEvent(new Event('fleet:workflow-sync')); return true; }
    return false;
  }

  function driverTickets() {
    if (role() !== 'driver') return [];
    read();
    const driver = activeDriver();
    return structuredClone(state.tickets.filter((ticket) => belongsToDriver(ticket, driver)));
  }

  function createTicket(options) {
    const driverId = role() === 'driver' ? activeDriver()?.id : '';
    if (!driverId) return Promise.resolve(null);
    return serializeTicketWrite(() => createDriverTicket(options, driverId));
  }

  function createDriverTicket({ kind, emergency = false, description, imageName = '', imageUrl = '' }, driverId) {
    const driver = activeDriver();
    const clean = String(description || '').trim();
    const image = safeMediaUrl(imageUrl, 'data:image/');
    if (role() !== 'driver' || driver?.id !== driverId || !clean || clean.length > 500 || (emergency && !image)) return null;
    if (!emergency && !['Xe', 'Đường'].includes(kind)) return null;
    read();
    const existing = state.tickets.find((ticket) => ticket.status === 'open' && belongsToDriver(ticket, driver));
    if (existing && !emergency) {
      api.toast('Vui lòng trao đổi trong kênh đang mở cho tới khi Điều phối đóng.');
      return null;
    }
    const order = currentTrip();
    const vehicles = api.snapshot().vehicles.filter((item) => item.driverId === driver.id);
    const vehicle = vehicles.find((item) => item.plate === order?.plate) || vehicles[0];
    const message = { id: uid('M'), by: driver.name, role: 'driver', text: clean, at: now(),
      ...(image ? { imageUrl: image, imageName: String(imageName).slice(0, 120) } : {}) };
    const next = structuredClone(state);
    let ticket = next.tickets.find((item) => item.id === existing?.id);
    if (ticket) {
      // Nâng mức ưu tiên của kênh hiện có và giữ nguyên lịch sử.
      Object.assign(ticket, { emergency: true, kind: 'Khẩn cấp', driverId });
      ticket.messages.push(message);
    } else {
      const lastCode = Math.max(0, ...state.tickets.map((item) => Number(String(item.code).split('-').at(-1)) || 0));
      ticket = { id: uid('T'), code: 'TK-' + String(lastCode + 1).padStart(4, '0'),
        kind: emergency ? 'Khẩn cấp' : kind, emergency, description: clean, order: order?.id || '',
        plate: vehicle?.plate || '', driver: driver.name, driverId, status: 'open', at: message.at, messages: [message] };
      next.tickets.unshift(ticket);
    }
    if (!persist(next)) return null;
    api.commit((emergency ? 'Khẩn cấp · ' : 'Ticket sự cố · ') + ticket.code, (vehicle?.plate || 'Chưa gắn xe') + ' · ' + (order?.id || 'Ngoài chuyến'), driver.name);
    window.dispatchEvent(new Event('fleet:workflow-sync'));
    return ticket;
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-page]')) leaveTickets();
    const b = e.target.closest('[data-workflow-action]');
    if (!b) return;
    const action = b.dataset.workflowAction, id = b.dataset.id, o = api.snapshot().orders.find((x) => x.id === id);
    if (action === 'tickets') gotoTickets();
    if (action === 'ticket-select') gotoTickets(id);
    if (action === 'admin-page' && role() === 'admin') navigateAdmin(id);
    if (action === 'admin-vehicle' && role() === 'admin') { adminPlate = id; roles.render(); }
    if (action === 'admin-map' || action === 'admin-activity') navigateAdmin(action === 'admin-map' ? 'fleet' : 'activity');
    if (action === 'leave-tickets') { leaveTickets(); api.render(); window.dispatchEvent(new Event('fleet:workflow-sync')); }
    if (action === 'new-report' && role() === 'driver' && !driverTickets().some((ticket) => ticket.status === 'open')) { leaveTickets(); roles.openIncidents(); }
    if (action === 'login') authPreview('login');
    if (action === 'auth-tab') authPreview(id);
    if (action === 'help-recovery') openHelpRecovery();
    if (action === 'view-gps') openGpsModal(b.dataset.lat, b.dataset.lon, state.tickets.find((t) => t.id === ticketId)?.code || '');
    if (action === 'toggle-voice') toggleVoiceRecord();
    if (action === 'clear-chat-image') { composeImageUrl = ''; composeImageName = ''; showTickets(); }
    if (action === 'clear-chat-voice') { composeAudioUrl = ''; composeVoiceDuration = ''; showTickets(); }
    if (action === 'ticket-close' && role() === 'dispatch') {
      modal('Đóng ticket', `<form class="role-form"><label>Kết quả / lý do đóng<textarea name="resolution" required maxlength="1000"></textarea></label><p class="workflow-note">Lưu hồ sơ chỉ đọc và khóa hội thoại. Không tự hoàn thành chuyến hoặc giải phóng xe.</p><button class="primary">Đóng & lưu hồ sơ</button></form>`, (f) => closeTicket(id, f.get('resolution')));
    }
    if (action === 'trip-accept') respondToTrip(id, 'accept');
    if (action === 'trip-decline' && role() === 'driver' && o?.id === currentTrip()?.id && o.status === 'assigned') {
      modal('Từ chối chuyến ' + o.id, `<form class="role-form"><label>Lý do từ chối<textarea name="reason" required maxlength="500"></textarea></label><label>Gõ "TU CHOI" để xác nhận chủ ý<input name="confirmWord" required placeholder="TU CHOI"></label><p id="dec-err" class="form-error" hidden></p><button class="primary">Gửi phản hồi</button></form>`, (f, form) => {
        const reason = String(f.get('reason') || '').trim(), word = String(f.get('confirmWord') || '').trim().toUpperCase();
        if (word !== 'TU CHOI' && word !== 'TỪ CHỐI') { form.querySelector('#dec-err').hidden = false; form.querySelector('#dec-err').textContent = 'Vui lòng gõ "TU CHOI" để xác nhận.'; return false; }
        return respondToTrip(id, 'decline', reason);
      });
    }
    if (action === 'trip-pickup' && role() === 'driver' && o?.id === currentTrip()?.id && o.status === 'running' && stage(o) === 'accepted') {
      modal('Xác nhận lấy hàng', `<form class="role-form">${input(`Số lượng thực nhận (${o.unit || 'm³'})`, 'quantity', o.quantity, 'number')}<p class="workflow-note">Ghi số lượng thực tế và chụp ảnh đầu nhận. Chênh lệch trao đổi với Điều phối.</p><button class="primary">Xác nhận đã lấy hàng</button></form>`, (f) => {
        const amount = Number(f.get('quantity'));
        if (!Number.isFinite(amount) || amount <= 0) return false;
        changeTrip(o, 'Khai báo lượng thực lấy; chờ ảnh đầu nhận', () => { o.actualQuantity = amount; });
        setTimeout(() => roles.openCapture('pickup'), 0);
      });
    }
    if (action === 'trip-evidence' && role() === 'driver' && o?.id === currentTrip()?.id && ['picked_up', 'needs_more'].includes(stage(o))) roles.openCapture('delivery');
    if (action === 'trip-list') {
      modal('Kiểm tra chuyến & Bằng chứng 2 đầu', api.snapshot().orders.filter((x) => ['assigned', 'running'].includes(x.status)).map((x) => `<div class="role-row"><div><strong>${esc(x.id)} · ${esc(x.plate)}</strong><small>${esc(x.material)} (${esc(qtyText(x))}) · ${esc(stageNames[stage(x)])}</small></div>${btn('Xem bằng chứng 2 đầu', 'trip-review', x.id, 'primary')}</div>`).join('') || '<p>Không có chuyến cần kiểm tra.</p>');
    }
    if (action === 'trip-review') tripReview(o);
    if (action === 'trip-exception') openException(o);
    if (action === 'trip-supplement' && role() === 'dispatch' && o && o.status === 'running') {
      modal('Yêu cầu bổ sung bằng chứng', `<form class="role-form"><label>Nội dung cần bổ sung (đầu nhận / đầu giao / GPS)<textarea name="note" required maxlength="500"></textarea></label><button class="primary">Gửi yêu cầu</button></form>`, (f) => {
        const note = String(f.get('note') || '').trim();
        if (!note) return false;
        changeTrip(o, 'Yêu cầu bổ sung bằng chứng', () => { o.workflowStage = 'needs_more'; o.evidenceNote = note; });
      });
    }
    if (action === 'trip-approve' && role() === 'dispatch' && o && o.status === 'running' && stage(o) === 'delivered' && ['pickup', 'delivery'].every((kind) => roles.snapshot().evidence.some((e) => e.order === o.id && e.kind === kind))) {
      modal('Duyệt hoàn thành ' + o.id, `<form class="role-form"><label class="workflow-check"><input type="checkbox" name="enough" required>Đã đối chiếu ảnh 2 đầu (đầu nhận + đầu giao) và GPS điện thoại</label><label class="workflow-check"><input type="checkbox" name="ready">Xác nhận xe ${esc(o.plate)} sẵn sàng nhận đơn tiếp theo</label><p class="workflow-note">Nếu chưa tích xác nhận sẵn sàng, xe chuyển sang trạng thái Chờ kiểm tra (không tự coi xe đã về bãi).</p><button class="primary">Duyệt hoàn thành chuyến</button></form>`, (f) => {
        if (!f.has('enough')) return false;
        changeTrip(o, 'Điều phối duyệt hoàn thành', () => {
          o.status = 'completed';
          o.workflowStage = 'completed';
          o.completedAt = now();
          const v = api.snapshot().vehicles.find((x) => x.plate === o.plate);
          if (v) v.availability = f.has('ready') ? 'ready' : 'awaiting_check';
        });
      });
    }
    if (action === 'vehicle-ready' && role() === 'dispatch') {
      const v = api.snapshot().vehicles.find((x) => x.plate === id);
      if (v) modal('Xác nhận xe sẵn sàng', `<form class="role-form"><label class="workflow-check"><input type="checkbox" name="ready" required>Đã kiểm tra xe ${esc(id)} sẵn sàng nhận chuyến mới</label><button class="primary">Xác nhận sẵn sàng</button></form>`, () => { v.availability = 'ready'; api.commit('Xác nhận xe sẵn sàng', id); });
    }
  });

  document.addEventListener('submit', (e) => {
    if (e.target.id === 'incident-form') {
      e.preventDefault(); e.stopImmediatePropagation();
      const form = e.target;
      if (role() !== 'driver' || !form.reportValidity() || form.dataset.sending) return;
      const data = new FormData(form);
      const driverId = activeDriver()?.id;
      form.dataset.sending = 'true';
      (async () => {
        try {
          const file = data.get('photo');
          const photo = file?.size ? await window.FleetTicketMedia.readPhoto(file) : {};
          if (role() !== 'driver' || activeDriver()?.id !== driverId) return;
          const ticket = await createTicket({ kind: data.get('kind'), description: data.get('description'), ...photo });
          if (ticket) gotoTickets(ticket.id);
        } catch (error) { api.toast(error.message || 'Không đọc được ảnh.'); }
        finally { delete form.dataset.sending; }
      })();
    }

    if (e.target.id === 'ticket-message-form') {
      e.preventDefault(); e.stopImmediatePropagation();
      if (voiceSession) return;
      if (sendMessage(ticketId, { text: e.target.message.value, imageUrl: composeImageUrl, imageName: composeImageName, audioUrl: composeAudioUrl, voiceDuration: composeVoiceDuration })) showTickets();
    }
  }, true);

  window.addEventListener('fleet:evidence-saved', (event) => {
    const { order, kind } = event.detail || {};
    const o = api.snapshot().orders.find((item) => item.id === order);
    if (!o || o.status !== 'running') return;
    if (kind === 'pickup' && stage(o) === 'accepted' && o.actualQuantity > 0) {
      changeTrip(o, 'Đã lấy hàng và lưu ảnh đầu nhận', () => { o.workflowStage = 'picked_up'; });
    } else if (kind === 'delivery' && ['picked_up', 'needs_more'].includes(stage(o))) {
      changeTrip(o, 'Gửi bằng chứng giao hàng', () => { o.workflowStage = 'delivered'; });
    }
  });
  document.addEventListener('input', (e) => { if (e.target.id === 'ticket-message') composeDraft = e.target.value; });
  document.addEventListener('keydown', (e) => {
    if (e.target.id === 'ticket-message' && e.key === 'Enter' && !e.isComposing) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const el = e.target;
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        el.value = el.value.slice(0, start) + '\n' + el.value.slice(end);
        el.selectionStart = el.selectionEnd = start + 1;
        composeDraft = el.value;
        return;
      }
      if (!e.shiftKey) {
        e.preventDefault();
        e.target.form?.requestSubmit();
        return;
      }
    }
    const marker = e.target.closest('.admin-marker');
    if (marker && ['Enter', ' '].includes(e.key)) { e.preventDefault(); adminPlate = marker.dataset.id; roles.render(); }
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'ticket-filter') { filter = e.target.value; gotoTickets(); }
    if (e.target.id === 'ticket-chat-photo') {
      const file = e.target.files?.[0];
      if (!file) return;
      const channel = ticketId;
      const sender = role();
      window.FleetTicketMedia.readPhoto(file).then(({ imageUrl, imageName }) => {
        if (channel !== ticketId || sender !== role() || !e.target.isConnected) return;
        composeImageUrl = imageUrl;
        composeImageName = imageName;
        showTickets();
      }).catch((error) => api.toast(error.message || 'Không đọc được ảnh.'));
    }
  });
  document.addEventListener('click', (e) => { const completion = e.target.closest('[data-action="complete-order"],[data-action="start-order"]'); if (completion) { e.preventDefault(); e.stopImmediatePropagation(); tripReview(api.snapshot().orders.find((o) => o.id === completion.dataset.id)); } }, true);
  window.addEventListener('fleet:role-render', sync);
  window.addEventListener('popstate', sync);
  window.addEventListener('pagehide', resetCompose);
  window.addEventListener('storage', (e) => { if (e.key === key) sync(); });
  window.addEventListener('fleet:reset', () => { persist(seedTickets()); ticketId = ''; composeDraft = ''; sync(); });

  function visibleTickets() {
    if (role() === 'driver') return driverTickets();
    if (!['dispatch', 'admin'].includes(role())) return [];
    read();
    return structuredClone(state.tickets);
  }

  window.FleetWorkflow = { tickets: visibleTickets, sync, sendMessage, closeTicket, createTicket, driverTickets, mountTicketWorkspace: showTickets, respondToTrip, openAuthPreview: authPreview, openTripReview: tripReview, openException, openHelpRecovery, stage, stageNames };
  sync();
})();
