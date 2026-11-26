/* Giao diện Phone riêng của Tài xế; kết nối dữ liệu sống với Điều phối (FleetPreview / FleetRoles / FleetWorkflow). */
(() => {
  'use strict';

  const phone = matchMedia('(max-width: 759px)');
  const root = document.createElement('section');
  root.id = 'driver-phone';
  root.hidden = true;
  document.querySelector('#main').append(root);

  let zoom = 1;
  let activeScreen = '';
  let transitionGeneration = 0;
  let transitionTimer = 0;
  let feedbackText = '';
  let rejectOpen = false;
  let selectedTicketId = '';
  let ticketView = 'channels';
  let newTicketOpen = false;
  let demoPhotoName = '';
  let phoneGps = null;
  let chatImageUrl = '';
  let chatImageName = '';
  let chatAudioUrl = '';
  let chatVoiceDuration = '';
  let chatRecording = false;
  let chatRecorder = null;
  let chatStream = null;
  let chatTimer = 0;
  let chatSeconds = 0;
  let chatChunks = [];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const safeMedia = (url, prefix) => (typeof url === 'string' && url.startsWith(prefix) ? url : '');
  const fmtDur = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (name) => `<svg aria-hidden="true"><use href="#${name}"/></svg>`;
  const camera = icon('camera');
  const message = icon('message');

  function ctx() {
    const api = window.FleetPreview;
    const roles = window.FleetRoles;
    const wf = window.FleetWorkflow;
    const s = api?.snapshot?.() || { orders: [], vehicles: [], drivers: [] };
    const o = roles?.driverTrip?.() || null;
    const activeId = roles?.activeDriver?.() || '';
    const drv = s.drivers.find((d) => d.id === activeId) || s.drivers.find((d) => d.id === s.vehicles.find((v) => v.plate === o?.plate)?.driverId) || s.drivers[0] || null;
    const veh = s.vehicles.find((v) => v.plate === o?.plate) || s.vehicles.find((v) => v.driverId === drv?.id) || null;
    const stage = o && wf?.stage ? wf.stage(o) : o?.status === 'running' ? 'accepted' : 'awaiting';
    const qty = o ? (api?.qtyText ? api.qtyText(o) : `${o.quantity} ${o.unit || 'm³'}`) : '';
    return { api, roles, wf, s, o, drv, veh, stage, qty };
  }

  function routeMap(o) {
    const fromLbl = o?.from ? esc(o.from.slice(0, 14)) : 'Lấy hàng';
    const toLbl = o?.to ? esc(o.to.slice(0, 14)) : 'Giao hàng';
    return `<section class="phone-route" aria-label="Bản đồ tuyến đường tài xế">
      <svg class="phone-map" viewBox="0 0 390 720" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Tuyến đường từ điểm lấy hàng tới điểm giao hàng">
        <rect class="phone-map-ground" width="390" height="720"/>
        <g id="phone-map-scene">
          <g class="phone-map-blocks"><path d="M12 20h76v82H12z M115 12h88v70h-88z M232 20h67v92h-67z M322 23h58v72h-58z M8 133h70v86H8z M109 116h86v74h-86z M225 140h69v74h-69z M314 130h66v91h-66z M15 244h84v71H15z M119 230h72v96h-72z M220 248h64v75h-64z M10 350h78v83H10z M112 352h71v71h-71z M217 344h76v88h-76z M318 340h62v83h-62z M18 458h84v85H18z M132 449h70v96h-70z M238 448h64v88h-64z M322 462h60v82h-60z M8 574h78v108H8z M112 570h78v100h-78z M220 568h75v110h-75z M320 570h62v105h-62z"/></g>
          <path class="phone-map-river" d="M417 120C303 178 353 242 287 310S220 426 259 750"/>
          <g class="phone-map-streets"><path d="M-20 114 410 104 M-20 224 410 232 M-20 335 410 347 M-20 449 410 456 M-20 568 410 581 M101-20 102 750 M207-20 207 750 M305-20 305 310 M309 398 309 750 M-20 670 410 365 M-20 35 410 408"/></g>
          <path class="phone-route-edge" d="M76 510V447H132V373H210V280H300V207"/>
          <path class="phone-route-line" d="M76 510V447H132V373H210V280H300V207"/>
          <g class="phone-route-marker"><circle cx="76" cy="510" r="9"/><circle cx="300" cy="207" r="9"/></g>
          <g class="phone-map-label"><rect x="34" y="530" width="116" height="30" rx="9"/><rect x="225" y="158" width="128" height="30" rx="9"/><text x="92" y="550">${fromLbl}</text><text x="289" y="178">${toLbl}</text></g>
        </g>
      </svg>
      <div class="phone-map-tools" aria-label="Điều khiển bản đồ">
        <button type="button" data-phone-action="recenter" aria-label="Đặt lại khung bản đồ">${icon('pin')}</button>
        <button type="button" data-phone-action="zoom-in" aria-label="Phóng to sơ đồ">+</button>
        <button type="button" data-phone-action="zoom-out" aria-label="Thu nhỏ sơ đồ">−</button>
      </div>
    </section>`;
  }

  function emergency() {
    return `<button type="button" class="phone-emergency" data-phone-action="emergency">${icon('alert')}Khẩn cấp</button>`;
  }

  function driverSwitcherBar() {
    const { s, drv } = ctx();
    if (!s.drivers.length) return '';
    return `<div class="phone-driver-bar phone-glass">
      <label for="phone-driver-switcher">${icon('switch-account')}<span>Tài khoản</span></label>
      <select id="phone-driver-switcher" aria-label="Chuyển tài khoản tài xế xem thử">
        ${s.drivers
          .map((d) => {
            const v = s.vehicles.find((x) => x.driverId === d.id);
            return `<option value="${esc(d.id)}" ${d.id === drv?.id ? 'selected' : ''}>${esc(d.name)}${v ? ` · ${esc(v.plate)}` : ''}</option>`;
          })
          .join('')}
      </select>
    </div>`;
  }

  function newTripSheet() {
    const { o, veh, stage, qty, wf } = ctx();
    if (!o) {
      return `<section class="phone-trip-card phone-glass" aria-label="Chưa có chuyến">
        <header class="phone-assignment-heading"><span class="phone-assignment-icon">${icon('truck')}</span><div><h2>Chưa có chuyến</h2><p>${veh ? `Xe ${esc(veh.plate)} chưa được gán đơn` : 'Tài khoản chưa gắn xe'}</p></div></header>
        <div class="phone-status-row"><span class="badge" data-status="neutral">Chờ Điều phối phân công</span></div>
        <p class="phone-feedback" role="status" id="phone-feedback">${esc(feedbackText)}</p>
      </section>`;
    }

    const isAssigned = o.status === 'assigned';
    const stageText = wf?.stageNames?.[stage] || (isAssigned ? 'Chờ bạn phản hồi' : 'Đang thực hiện');
    const heading = isAssigned ? 'Có chuyến mới' : stage === 'delivered' ? 'Đã gửi đủ ảnh 2 đầu' : 'Chuyến đang chạy';
    const sub = `${o.id} · ${o.material} (${qty})${o.plate ? ` · ${o.plate}` : ''}`;

    const actionHtml = isAssigned
      ? rejectOpen
        ? `<form class="phone-inline-form" id="phone-reject-form">
            <label>Lý do từ chối<input name="reason" required maxlength="200" placeholder="VD: Xe đang kẹt hoặc gặp sự cố"></label>
            <label>Gõ "TU CHOI" để xác nhận<input name="confirmWord" required placeholder="TU CHOI"></label>
            <div class="phone-assignment-actions">
              <button type="button" data-phone-action="cancel-reject">Quay lại</button>
              <button type="submit" class="phone-accept">Xác nhận từ chối</button>
            </div>
          </form>`
        : `<div class="phone-assignment-actions"><button type="button" data-phone-action="reject">Từ chối</button><button type="button" class="phone-accept" data-phone-action="accept">Nhận chuyến</button></div>`
      : stage === 'accepted'
      ? `<button type="button" class="phone-accept phone-full-btn" data-phone-screen="pickup">Xác nhận lấy hàng & Chụp ảnh</button>`
      : ['picked_up', 'needs_more'].includes(stage)
      ? `<button type="button" class="phone-accept phone-full-btn" data-phone-screen="delivery">Chụp ảnh giao hàng</button>`
      : `<div class="phone-status-row"><span class="badge" data-status="completed">Chờ Điều phối duyệt hoàn thành</span></div>`;

    const badgeStatus = isAssigned
      ? 'pending'
      : stage === 'needs_more'
      ? 'cancelled'
      : stage === 'delivered'
      ? 'completed'
      : 'running';

    return `<section class="phone-trip-card phone-glass" aria-label="Phân công chuyến">
      <header class="phone-assignment-heading"><span class="phone-assignment-icon">${icon('truck')}</span><div><h2>${heading}</h2><p>${esc(sub)}</p></div></header>
      <dl class="phone-assignment-points">
        <div><dt>${icon('pin')}Điểm lấy hàng</dt><dd>${esc(o.from)}</dd></div>
        <div><dt>${icon('pin')}Điểm giao hàng</dt><dd>${esc(o.to)}${o.distanceKm ? ` (${o.distanceKm} km)` : ''}</dd></div>
      </dl>
      <div class="phone-status-row"><span class="badge" data-status="${badgeStatus}">${esc(stageText)}${o.evidenceNote ? ` · ${esc(o.evidenceNote)}` : ''}</span></div>
      ${actionHtml}
      <p class="phone-feedback" role="status" id="phone-feedback">${esc(feedbackText)}</p>
    </section>`;
  }

  function mapScreen() {
    const { o } = ctx();
    return `${routeMap(o)}<div class="phone-emergency-float">${emergency()}<p class="phone-feedback" role="status" id="phone-feedback">${esc(feedbackText)}</p></div>`;
  }

  function tripScreen() {
    const { o, veh, stage } = ctx();
    const canPickup = o?.status === 'running' && stage === 'accepted';
    const canDelivery = o?.status === 'running' && ['picked_up', 'needs_more'].includes(stage);
    const vehBadge = !veh
      ? '<span class="badge" data-status="neutral">Chưa gắn xe</span>'
      : veh.availability === 'ready'
      ? '<span class="badge" data-status="completed">Sẵn sàng</span>'
      : veh.availability === 'awaiting_check'
      ? '<span class="badge" data-status="pending">Chờ xác nhận sẵn sàng</span>'
      : '<span class="badge" data-status="cancelled">Bảo trì</span>';

    return `<section class="phone-trip-page">
      ${newTripSheet()}
      <section class="phone-trip-tools phone-glass" aria-label="Xác nhận chuyến">
        <div class="phone-tools-hd"><h2>Xác nhận chuyến & Xe</h2>${vehBadge}</div>
        <p>Ảnh và GPS điện thoại được đồng bộ trực tiếp sang Điều phối.</p>
        <div class="phone-proof-actions">
          <button type="button" data-phone-screen="pickup" ${canPickup ? '' : 'disabled'}>${camera}<span>Ảnh lấy hàng</span></button>
          <button type="button" data-phone-screen="delivery" ${canDelivery ? '' : 'disabled'}>${camera}<span>Ảnh giao hàng</span></button>
        </div>
        <button type="button" class="phone-ready-report" data-phone-action="report-ready" ${!veh || veh.availability === 'ready' || o ? 'disabled' : ''}>${icon('truck')}<span>Báo xe sẵn sàng</span></button>
        ${emergency()}
      </section>
    </section>`;
  }

  function captureScreen(kind) {
    const { o, stage } = ctx();
    const isPickup = kind === 'pickup';
    const valid = o && o.status === 'running' && (isPickup ? stage === 'accepted' : ['picked_up', 'needs_more'].includes(stage));
    if (!valid) {
      return `<section class="phone-secondary phone-glass">
        <span class="phone-empty-icon">${camera}</span>
        <h2>${isPickup ? 'Chưa thể chụp ảnh lấy hàng' : 'Chưa thể chụp ảnh giao hàng'}</h2>
        <p>${o ? 'Vui lòng nhận chuyến và hoàn thành bước trước đó trên màn Chuyến.' : 'Hiện chưa có chuyến đang chạy.'}</p>
        <button type="button" class="phone-back" data-phone-screen="trip">Về chuyến của tôi</button>
        ${emergency()}<p class="phone-feedback" role="status" id="phone-feedback">${esc(feedbackText)}</p>
      </section>`;
    }

    const photoName = demoPhotoName || '';
    return `<section class="phone-secondary phone-secondary-scroll phone-glass">
      <h2>${isPickup ? 'Ảnh đầu nhận hàng' : 'Ảnh đầu giao hàng'} · ${esc(o.id)}</h2>
      <p>${esc(o.material)} · ${esc(o.from)} → ${esc(o.to)}</p>
      <form id="phone-evidence-form" class="phone-inline-form" data-kind="${kind}">
        ${isPickup ? `<label>Số lượng thực lấy (${esc(o.unit || 'm³')})<input name="quantity" type="number" step="any" min="0.1" required value="${esc(o.actualQuantity || o.quantity)}"></label>` : ''}
        <div class="phone-photo-row">
          <button type="button" class="phone-back" data-phone-action="demo-photo" data-kind="${kind}">${camera}<span>${photoName ? `Đã chọn: ${esc(photoName)}` : 'Chụp ảnh mẫu'}</span></button>
          <button type="button" class="phone-back" data-phone-action="demo-gps">${icon('pin')}<span>${phoneGps ? `GPS: ${phoneGps.lat}, ${phoneGps.lon}` : 'Lấy GPS điện thoại'}</span></button>
        </div>
        <button class="phone-capture phone-accept" type="submit" ${!photoName || !phoneGps ? 'disabled' : ''}>Gửi xác nhận sang Điều phối</button>
      </form>
      <button type="button" class="phone-back" data-phone-screen="trip">Về chuyến của tôi</button>
      <p class="phone-feedback" role="status" id="phone-feedback">${esc(feedbackText)}</p>
    </section>`;
  }

  function ticketsScreen() {
    const { wf } = ctx();
    const list = wf?.tickets?.() || [];
    const activeTicket = list.find((t) => t.id === selectedTicketId) || list[0] || null;

    if (ticketView === 'chat' && activeTicket) {
      const msgsHtml = activeTicket.messages
        .map((m) => {
          const img = safeMedia(m.imageUrl, 'data:image/')
            ? `<img class="phone-msg-img" src="${esc(m.imageUrl)}" alt="${esc(m.imageName || 'Ảnh ticket')}">`
            : m.imageName
            ? `<div class="phone-msg-file">Ảnh: ${esc(m.imageName)}</div>`
            : '';
          const audio = safeMedia(m.audioUrl, 'data:audio/')
            ? `<audio class="phone-msg-audio" controls src="${esc(m.audioUrl)}"></audio>`
            : m.voiceDuration
            ? `<div class="phone-voice-pill">Thoại · ${esc(m.voiceDuration)}</div>`
            : '';
          return `<div class="phone-msg ${m.role === 'driver' ? 'is-me' : ''}"><div class="phone-msg-head"><strong>${esc(m.by)}</strong></div>${m.text ? `<p>${esc(m.text)}</p>` : ''}${img}${audio}</div>`;
        })
        .join('');

      const composerHtml =
        activeTicket.status === 'open'
          ? `<form id="phone-ticket-reply" class="phone-reply-box" data-id="${esc(activeTicket.id)}">
              ${chatImageUrl || chatVoiceDuration ? `<div class="phone-reply-preview">
                ${safeMedia(chatImageUrl, 'data:image/') ? `<span class="phone-preview-chip"><img src="${esc(chatImageUrl)}" alt="Xem trước">${esc(chatImageName || 'Ảnh')}<button type="button" data-phone-action="clear-chat-img">×</button></span>` : ''}
                ${chatVoiceDuration ? `<span class="phone-preview-chip">Thoại ${esc(chatVoiceDuration)}<button type="button" data-phone-action="clear-chat-voice">×</button></span>` : ''}
              </div>` : ''}
              <div class="phone-reply-tools">
                <label class="phone-mini-btn phone-file-lbl">${camera}<span>Chụp / ảnh</span><input id="phone-ticket-photo" type="file" accept="image/*" capture="environment" hidden></label>
                <button type="button" class="phone-mini-btn ${chatRecording ? 'is-rec' : ''}" data-phone-action="ticket-voice">${chatRecording ? `Dừng (${fmtDur(chatSeconds)})` : 'Ghi âm'}</button>
              </div>
              <div class="phone-reply-row">
                <input name="message" maxlength="400" placeholder="Nhắn vào #${esc(activeTicket.code)}…">
                <button type="submit" class="phone-accept">Gửi</button>
              </div>
            </form>`
          : '<p class="phone-waiting">Ticket đã đóng (chỉ đọc).</p>';

      return `<section class="phone-secondary phone-chat-shell phone-glass">
        <div class="phone-chat-head">
          <button type="button" class="phone-mini-btn" data-phone-action="back-channels">← Kênh</button>
          <div class="phone-chat-title"><strong>#${esc(activeTicket.code)} · ${esc(activeTicket.kind)}</strong><small>${esc(activeTicket.plate || '—')}</small></div>
          <span class="badge" data-status="${activeTicket.status === 'open' ? 'pending' : 'completed'}">${activeTicket.status === 'open' ? 'Đang mở' : 'Đã đóng'}</span>
        </div>
        <div class="phone-chat-scroll" role="log" aria-label="Nội dung trao đổi">${msgsHtml}</div>
        ${composerHtml}
        <p class="phone-feedback" role="status" id="phone-feedback">${esc(feedbackText)}</p>
      </section>`;
    }

    const listHtml = list
      .map((t) => {
        const lastMsg = t.messages[t.messages.length - 1];
        const preview = lastMsg ? `${lastMsg.by}: ${lastMsg.text || (lastMsg.imageUrl ? '[Ảnh]' : '[Thoại]')}` : t.description;
        return `<button type="button" class="phone-channel-item" data-phone-action="select-ticket" data-id="${esc(t.id)}">
          <div class="phone-ticket-row">
            <strong>#${esc(t.code)} · ${esc(t.kind)}</strong>
            <span class="badge" data-status="${t.status === 'open' ? 'pending' : 'completed'}">${t.status === 'open' ? 'Đang mở' : 'Đã đóng'}</span>
          </div>
          <div class="phone-channel-preview">${esc(preview)}</div>
          <small>${esc(t.plate || '—')} · ${t.messages.length} tin nhắn · Bấm để vào chat ›</small>
        </button>`;
      })
      .join('');

    const newFormHtml = newTicketOpen
      ? `<form id="phone-new-ticket-form" class="phone-inline-form">
          <label>Loại sự cố<select name="kind"><option value="Xe">Xe</option><option value="Đường">Đường</option></select></label>
          <label>Mô tả gửi Điều phối<textarea name="description" rows="2" required maxlength="400" placeholder="VD: Xe gặp sự cố hoặc đường ngập"></textarea></label>
          <div class="phone-assignment-actions">
            <button type="button" data-phone-action="toggle-new-ticket">Hủy</button>
            <button type="submit" class="phone-accept">Mở kênh & Gửi</button>
          </div>
        </form>`
      : '';

    return `<section class="phone-secondary phone-secondary-scroll phone-glass">
      <div class="phone-ticket-hd">
        <h2>Kênh Ticket (${list.length})</h2>
        <button type="button" class="phone-mini-btn" data-phone-action="toggle-new-ticket">${newTicketOpen ? 'Đóng' : '+ Báo sự cố'}</button>
      </div>
      ${newFormHtml}
      ${list.length ? `<div class="phone-channel-list">${listHtml}</div>` : '<p>Chưa có kênh ticket nào.</p>'}
      ${emergency()}
      <p class="phone-feedback" role="status" id="phone-feedback">${esc(feedbackText)}</p>
    </section>`;
  }

  function secondaryScreen(screen) {
    if (screen === 'tickets') return ticketsScreen();
    return captureScreen(screen);
  }

  function screenFromUrl() {
    const params = new URL(location.href).searchParams;
    const screen = params.get('phone_view');
    if (['map', 'trip', 'pickup', 'delivery', 'tickets'].includes(screen)) return screen;
    return params.get('flow') === 'tickets' ? 'tickets' : 'map';
  }

  function screenTitle(screen) {
    return { map: 'Bản đồ', trip: 'Chuyến của tôi', pickup: 'Ảnh lấy hàng', delivery: 'Ảnh giao hàng', tickets: 'Ticket' }[screen];
  }

  function screenContent(screen) {
    return screen === 'map' ? mapScreen() : screen === 'trip' ? tripScreen() : secondaryScreen(screen);
  }

  function tabIndex(screen) {
    if (screen === 'map') return 0;
    if (screen === 'tickets') return 2;
    return 1;
  }

  function padPosition(index) {
    return String(index);
  }

  function navigation(screen) {
    const index = tabIndex(screen);
    return `<nav class="phone-nav phone-glass" aria-label="Điều hướng Tài xế" style="--phone-nav-index:${padPosition(index)}">
      <span class="phone-nav-indicator" aria-hidden="true"><svg class="phone-nav-arch" viewBox="0 0 100 60" preserveAspectRatio="none"><path class="phone-nav-arch-fill" d="M0 58.5 C16 58.5 18 5.5 50 5.5 C82 5.5 84 58.5 100 58.5 Z"/><path class="phone-nav-arch-stroke" d="M0 58.5 C16 58.5 18 5.5 50 5.5 C82 5.5 84 58.5 100 58.5" vector-effect="non-scaling-stroke"/></svg></span>
      <button type="button" data-phone-screen="map" ${index === 0 ? 'aria-current="page"' : ''}>${icon('pin')}<span>Bản đồ</span></button>
      <button type="button" data-phone-screen="trip" ${index === 1 ? 'aria-current="page"' : ''}>${icon('truck')}<span>Chuyến</span></button>
      <button type="button" data-phone-screen="tickets" ${index === 2 ? 'aria-current="page"' : ''}>${message}<span>Ticket</span></button>
    </nav>`;
  }

  function mountScreen(screen) {
    const { drv, veh } = ctx();
    const sub = drv ? `${drv.name}${veh ? ` · ${veh.plate}` : ''}` : 'Tài xế';
    root.innerHTML = `<div class="phone-topbar phone-glass">
      <a class="phone-brand" href="?role=driver&phone_view=map" aria-label="Hương Sen — Bản đồ"><span class="hs-brand-mark" aria-hidden="true"></span><span><span class="phone-screen-title">${screenTitle(screen)}</span><small>${esc(sub)}</small></span></a>
      <div class="phone-topbar-actions">
        <a class="phone-role-switch" href="./" aria-label="Chọn vai trò xem thử" title="Chọn vai trò">${icon('switch-account')}<span>Vai trò</span></a>
        <button type="button" class="phone-theme" data-phone-action="theme"></button>
      </div>
    </div>
    ${driverSwitcherBar()}
    <div class="phone-content"><div class="phone-page is-current" data-phone-page="${screen}">${screenContent(screen)}</div></div>
    ${navigation(screen)}`;

    requestAnimationFrame(() => root.querySelector('.phone-nav')?.classList.add('is-ready'));
  }

  function updateNavigation(screen, previousScreen) {
    const nav = root.querySelector('.phone-nav');
    if (!nav) return;

    const nextIndex = tabIndex(screen);
    const previousIndex = tabIndex(previousScreen);
    const steps = Math.abs(nextIndex - previousIndex);
    nav.style.setProperty('--phone-nav-duration', steps > 1 ? '440ms' : '300ms');
    nav.style.setProperty('--phone-nav-index', padPosition(nextIndex));
    nav.querySelectorAll('[data-phone-screen]').forEach((button) => {
      const selected = tabIndex(button.dataset.phoneScreen) === nextIndex;
      if (selected) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }

  function settlePageTransition() {
    clearTimeout(transitionTimer);
    const content = root.querySelector('.phone-content');
    if (!content) return;
    const pages = [...content.querySelectorAll('.phone-page')];
    const current = pages[pages.length - 1];
    pages.forEach((page) => {
      if (page !== current) page.remove();
    });
    if (!current) return;
    current.className = 'phone-page is-current';
    current.removeAttribute('style');
  }

  function replacePage(screen) {
    const content = root.querySelector('.phone-content');
    if (!content) return;
    content.innerHTML = `<div class="phone-page is-current" data-phone-page="${screen}">${screenContent(screen)}</div>`;
  }

  function transitionPage(previousScreen, screen) {
    const content = root.querySelector('.phone-content');
    if (!content) return;

    settlePageTransition();
    const current = content.querySelector('.phone-page.is-current');
    const previousIndex = tabIndex(previousScreen);
    const nextIndex = tabIndex(screen);
    const steps = Math.abs(nextIndex - previousIndex);
    if (!current || previousIndex === nextIndex || reducedMotion.matches) {
      replacePage(screen);
      return;
    }

    const generation = ++transitionGeneration;
    const direction = nextIndex > previousIndex ? 1 : -1;
    const distance = steps > 1 ? 118 : 100;
    const duration = steps > 1 ? 440 : 300;
    const incoming = document.createElement('div');
    incoming.className = 'phone-page is-incoming';
    incoming.dataset.phonePage = screen;
    incoming.style.setProperty('--phone-page-duration', `${duration}ms`);
    incoming.style.setProperty('--phone-enter-x', `${direction * distance}%`);
    incoming.style.setProperty('--phone-exit-x', `${direction * -distance}%`);
    incoming.innerHTML = screenContent(screen);
    current.style.setProperty('--phone-page-duration', `${duration}ms`);
    current.style.setProperty('--phone-exit-x', `${direction * -distance}%`);
    content.append(incoming);

    incoming.getBoundingClientRect();
    current.classList.remove('is-current');
    current.classList.add('is-outgoing');
    incoming.classList.remove('is-incoming');
    incoming.classList.add('is-current');

    const finishTransition = () => {
      if (generation !== transitionGeneration) return;
      settlePageTransition();
      if (screen === 'map') updateZoom();
    };
    const handleTransitionEnd = (event) => {
      if (event.propertyName !== 'transform') return;
      incoming.removeEventListener('transitionend', handleTransitionEnd);
      finishTransition();
    };
    incoming.addEventListener('transitionend', handleTransitionEnd);
    transitionTimer = window.setTimeout(finishTransition, duration + 100);
  }

  function syncTheme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    const toggle = root.querySelector('[data-phone-action="theme"]');
    if (!toggle) return;
    toggle.innerHTML = icon(dark ? 'sun' : 'moon');
    toggle.setAttribute('aria-label', dark ? 'Chuyển sang nền Sáng' : 'Chuyển sang nền Tối');
  }

  function render(forceRefresh = false) {
    const enabled = phone.matches && window.FleetRoles?.role() === 'driver';
    document.body.classList.toggle('driver-phone-active', enabled);
    root.hidden = !enabled;
    if (!enabled) {
      transitionGeneration += 1;
      clearTimeout(transitionTimer);
      activeScreen = '';
      return;
    }

    const screen = screenFromUrl();
    if (activeScreen === screen && root.childElementCount) {
      if (forceRefresh) {
        mountScreen(screen);
      }
      syncTheme();
      return;
    }

    const previousScreen = activeScreen;
    zoom = 1;
    activeScreen = screen;
    if (!previousScreen || !root.querySelector('.phone-content')) {
      mountScreen(screen);
    } else {
      const title = root.querySelector('.phone-screen-title');
      if (title) title.textContent = screenTitle(screen);
      updateNavigation(screen, previousScreen);
      transitionPage(previousScreen, screen);
    }
    syncTheme();
    if (root.querySelector('#phone-map-scene')) updateZoom();
  }

  function updateZoom() {
    const scene = root.querySelector('#phone-map-scene');
    if (scene) scene.setAttribute('transform', `translate(195 360) scale(${zoom}) translate(-195 -360)`);
    const zoomIn = root.querySelector('[data-phone-action="zoom-in"]');
    const zoomOut = root.querySelector('[data-phone-action="zoom-out"]');
    if (zoomIn) zoomIn.disabled = zoom >= 1.8;
    if (zoomOut) zoomOut.disabled = zoom <= 1;
  }

  function stopChatVoice(apply = true) {
    clearInterval(chatTimer);
    chatTimer = 0;
    const dur = fmtDur(Math.max(1, chatSeconds));
    chatRecording = false;
    if (chatRecorder && chatRecorder.state !== 'inactive') {
      try { chatRecorder.stop(); } catch {}
    } else if (apply) {
      chatVoiceDuration = dur;
      render(true);
    }
    if (chatStream) {
      chatStream.getTracks().forEach((tr) => tr.stop());
      chatStream = null;
    }
  }

  async function toggleChatVoice() {
    if (chatRecording) {
      stopChatVoice(true);
      return;
    }
    chatSeconds = 0;
    chatRecording = true;
    chatAudioUrl = '';
    chatVoiceDuration = '';
    render(true);
    chatTimer = window.setInterval(() => {
      chatSeconds += 1;
      const btnEl = root.querySelector('[data-phone-action="ticket-voice"]');
      if (btnEl) btnEl.textContent = `Dừng (${fmtDur(chatSeconds)})`;
    }, 1000);
    if (navigator.mediaDevices?.getUserMedia && window.MediaRecorder) {
      try {
        chatStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chatChunks = [];
        chatRecorder = new MediaRecorder(chatStream);
        chatRecorder.ondataavailable = (ev) => { if (ev.data?.size) chatChunks.push(ev.data); };
        chatRecorder.onstop = () => {
          const dur = fmtDur(Math.max(1, chatSeconds));
          const blob = new Blob(chatChunks, { type: chatRecorder?.mimeType || 'audio/webm' });
          const reader = new FileReader();
          reader.onload = () => {
            chatAudioUrl = typeof reader.result === 'string' ? reader.result : '';
            chatVoiceDuration = dur;
            render(true);
          };
          reader.readAsDataURL(blob);
        };
        chatRecorder.start();
      } catch {
        chatRecorder = null;
        feedbackText = 'Chưa có quyền micro; đang dùng ghi âm mẫu.';
      }
    }
  }

  root.addEventListener('change', (event) => {
    if (event.target.id === 'phone-driver-switcher') {
      feedbackText = '';
      rejectOpen = false;
      demoPhotoName = '';
      phoneGps = null;
      window.FleetRoles?.setActiveDriver?.(event.target.value);
      render(true);
      return;
    }
    if (event.target.id === 'phone-ticket-photo') {
      const file = event.target.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      if (file.size > 2 * 1024 * 1024) {
        feedbackText = 'Chọn ảnh tối đa 2 MB.';
        render(true);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        chatImageUrl = typeof reader.result === 'string' ? reader.result : '';
        chatImageName = file.name;
        render(true);
      };
      reader.readAsDataURL(file);
    }
  });

  root.addEventListener('submit', (event) => {
    event.preventDefault();
    const { api, roles, wf, o, drv } = ctx();

    if (event.target.id === 'phone-reject-form' && o && o.status === 'assigned') {
      const f = new FormData(event.target);
      const reason = String(f.get('reason') || '').trim();
      const word = String(f.get('confirmWord') || '').trim().toUpperCase();
      if (word !== 'TU CHOI' && word !== 'TỪ CHỐI') {
        feedbackText = 'Vui lòng gõ "TU CHOI" để xác nhận từ chối.';
        render(true);
        return;
      }
      if (!reason) return;
      const oldPlate = o.plate;
      o.status = 'pending';
      o.workflowStage = 'awaiting';
      o.previousPlate = oldPlate;
      o.plate = '';
      rejectOpen = false;
      feedbackText = `Đã từ chối ${o.id}; đơn đã quay lại hàng chờ Điều phối.`;
      api.commit(`${o.id}: Từ chối chuyến · ${reason}`, oldPlate, drv?.name || 'Tài xế');
      render(true);
      return;
    }

    if (event.target.id === 'phone-evidence-form' && o && o.status === 'running') {
      const kind = event.target.dataset.kind;
      if (!demoPhotoName || !phoneGps || !['pickup', 'delivery'].includes(kind)) return;
      if (kind === 'pickup') {
        const qtyVal = Number(new FormData(event.target).get('quantity'));
        if (!Number.isFinite(qtyVal) || qtyVal <= 0) return;
        o.actualQuantity = qtyVal;
        o.workflowStage = 'picked_up';
      } else {
        o.workflowStage = 'delivered';
      }
      roles.snapshot().evidence.unshift({
        id: 'E-' + Date.now(),
        order: o.id,
        kind,
        filename: demoPhotoName,
        gps: { ...phoneGps, simulated: true },
        at: new Date().toISOString(),
      });
      roles.save();
      api.commit(
        kind === 'pickup' ? `${o.id}: Đã lấy hàng và lưu ảnh đầu nhận` : `${o.id}: Gửi bằng chứng giao hàng`,
        o.plate || '',
        drv?.name || 'Tài xế'
      );
      demoPhotoName = '';
      phoneGps = null;
      feedbackText = kind === 'pickup' ? `Đã gửi ảnh đầu nhận của ${o.id} sang Điều phối.` : `Đã gửi ảnh giao hàng của ${o.id}; chờ Điều phối duyệt hoàn thành.`;
      const url = new URL(location.href);
      url.searchParams.set('phone_view', 'trip');
      history.pushState(null, '', url);
      render(true);
      return;
    }

    if (event.target.id === 'phone-ticket-reply' && wf) {
      const tId = event.target.dataset.id;
      if (chatRecording) stopChatVoice(true);
      const msg = String(new FormData(event.target).get('message') || '').trim();
      if (wf.sendMessage(tId, { text: msg, imageUrl: chatImageUrl, imageName: chatImageName, audioUrl: chatAudioUrl, voiceDuration: chatVoiceDuration })) {
        chatImageUrl = '';
        chatImageName = '';
        chatAudioUrl = '';
        chatVoiceDuration = '';
        feedbackText = 'Đã gửi tin nhắn sang Điều phối.';
        render(true);
      }
      return;
    }

    if (event.target.id === 'phone-new-ticket-form' && wf) {
      const f = new FormData(event.target);
      const t = wf.createTicket({
        kind: f.get('kind'),
        emergency: false,
        description: f.get('description'),
        order: o?.id || '',
        plate: ctx().veh?.plate || '',
        driver: drv?.name || 'Tài xế',
      });
      if (t) {
        selectedTicketId = t.id;
        ticketView = 'chat';
        newTicketOpen = false;
        feedbackText = `Đã mở kênh ${t.code} gửi Điều phối.`;
        render(true);
      }
    }
  });

  root.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;

    if (button.dataset.phoneScreen) {
      feedbackText = '';
      const url = new URL(location.href);
      url.searchParams.delete('flow');
      url.searchParams.set('phone_view', button.dataset.phoneScreen);
      history.pushState(null, '', url);
      render();
      return;
    }

    const action = button.dataset.phoneAction;
    if (!action) return;
    const { api, wf, o, drv, veh } = ctx();

    if (action === 'theme') {
      const select = document.querySelector('#theme-select');
      select.value = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      syncTheme();
    } else if (action === 'accept' && o && o.status === 'assigned') {
      o.status = 'running';
      o.workflowStage = 'accepted';
      feedbackText = `Đã nhận chuyến ${o.id}. Trạng thái trên Điều phối đã chuyển sang Đang chạy.`;
      api.commit(`${o.id}: Tài xế nhận chuyến`, o.plate || '', drv?.name || 'Tài xế');
      render(true);
    } else if (action === 'reject' && o && o.status === 'assigned') {
      rejectOpen = true;
      render(true);
    } else if (action === 'cancel-reject') {
      rejectOpen = false;
      render(true);
    } else if (action === 'report-ready' && veh) {
      veh.availability = 'awaiting_check';
      feedbackText = `Đã báo xe ${veh.plate} sẵn sàng. Chờ Điều phối xác nhận.`;
      api.commit('Tài xế báo xe sẵn sàng (chờ Điều phối duyệt)', veh.plate, drv?.name || 'Tài xế');
      render(true);
    } else if (action === 'emergency' && wf) {
      const t = wf.createTicket({
        kind: 'Khẩn cấp',
        emergency: true,
        description: 'Cảnh báo Khẩn cấp 1 nút từ tài xế: tự chụp ảnh sự cố và gửi thẳng về Điều phối.',
        order: o?.id || '',
        plate: veh?.plate || '',
        driver: drv?.name || 'Tài xế',
        filename: `emergency-${veh?.plate || 'TX'}-${Date.now().toString().slice(-4)}.jpg`,
        phoneGps: '10.7884, 106.7521 (±12m · GPS điện thoại)',
      });
      feedbackText = t ? `Đã gửi khẩn cấp & mở ticket ${t.code} cho Điều phối.` : 'Chưa tạo được ticket khẩn cấp.';
      render(true);
    } else if (action === 'demo-photo') {
      const kind = button.dataset.kind || 'pickup';
      demoPhotoName = `anh-${kind === 'pickup' ? 'dau-nhan' : 'dau-giao'}-${o?.id || 'mau'}.jpg`;
      render(true);
    } else if (action === 'demo-gps') {
      phoneGps = { lat: 10.781234, lon: 106.731567, at: new Date().toISOString() };
      render(true);
    } else if (action === 'select-ticket') {
      selectedTicketId = button.dataset.id || '';
      ticketView = 'chat';
      render(true);
    } else if (action === 'back-channels') {
      ticketView = 'channels';
      render(true);
    } else if (action === 'toggle-new-ticket') {
      newTicketOpen = !newTicketOpen;
      render(true);
    } else if (action === 'ticket-voice') {
      toggleChatVoice();
    } else if (action === 'clear-chat-img') {
      chatImageUrl = '';
      chatImageName = '';
      render(true);
    } else if (action === 'clear-chat-voice') {
      chatAudioUrl = '';
      chatVoiceDuration = '';
      render(true);
    } else if (['zoom-in', 'zoom-out', 'recenter'].includes(action)) {
      zoom = action === 'recenter' ? 1 : Math.max(1, Math.min(1.8, Math.round((zoom + (action === 'zoom-in' ? 0.2 : -0.2)) * 10) / 10));
      updateZoom();
    }
  });

  phone.addEventListener('change', () => render(true));
  window.addEventListener('fleet:role-render', () => render(true));
  window.addEventListener('fleet:commit', () => render(true));
  window.addEventListener('fleet:workflow-sync', () => render(true));
  window.addEventListener('fleet:render', () => render(true));
  window.addEventListener('storage', () => render(true));
  window.addEventListener('popstate', () => render());
  new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  render();
})();
