/* Giao diện Phone riêng của Tài xế; chỉ minh họa bản đồ, không đọc dữ liệu mẫu hay lưu nghiệp vụ. */
(() => {
  'use strict';

  const phone = matchMedia('(max-width: 759px)');
  const root = document.createElement('section');
  root.id = 'driver-phone';
  root.hidden = true;
  document.querySelector('#main').append(root);
  let zoom = 1;
  let activeScreen = '';

  const icon = name => `<svg aria-hidden="true"><use href="#${name}"/></svg>`;
  const camera = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h4l2-3h6l2 3h4v13H3Z"/><circle cx="12" cy="13" r="4"/></svg>';
  const message = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v13H9l-5 4Z M8 8h8 M8 12h5"/></svg>';

  function routeMap() {
    // Đường và hai điểm dưới đây là hình minh họa thiết kế, không phải GPS hay đơn được giao.
    return `<section class="phone-route" aria-label="Minh họa bố cục bản đồ tuyến đường">
      <svg class="phone-map" viewBox="0 0 390 460" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Tuyến minh họa từ điểm lấy hàng tới điểm giao hàng; không phải dữ liệu thật">
        <rect class="phone-map-ground" width="390" height="540"/>
        <g id="phone-map-scene">
          <g class="phone-map-blocks"><path d="M18 20h72v74H18z M116 12h86v62h-86z M234 20h64v80h-64z M320 24h58v63h-58z M8 124h68v74H8z M112 106h83v66h-83z M225 130h67v63h-67z M313 120h65v82h-65z M18 226h80v60H18z M119 214h70v87h-70z M220 231h62v65h-62z M10 328h76v74H10z M114 332h68v60h-68z M20 440h82v75H20z M134 429h66v91h-66z M240 421h60v80h-60z M322 442h60v75h-60z"/></g>
          <path class="phone-map-river" d="M410 175C302 218 345 276 280 330S219 421 255 560"/>
          <g class="phone-map-streets"><path d="M-20 108 410 99 M-20 208 410 216 M-20 313 266 312 M-20 416 410 427 M101-20 102 560 M207-20 207 560 M305-20 305 290 M310 392 310 560 M-20 495 410 260 M-20 25 410 370"/></g>
          <path class="phone-route-edge" d="M53 365V312H130V256H208V180H298V135"/>
          <path class="phone-route-line" d="M53 365V312H130V256H208V180H298V135"/>
          <g class="phone-route-marker"><circle cx="53" cy="365" r="9"/><circle cx="298" cy="135" r="9"/></g>
          <g class="phone-map-label"><rect x="14" y="384" width="103" height="30" rx="9"/><rect x="176" y="85" width="109" height="30" rx="9"/><text x="65" y="404">Lấy hàng</text><text x="230" y="105">Giao hàng</text></g>
          <g class="phone-map-truck" transform="translate(153 238)"><rect x="-9" y="-8" width="38" height="28" rx="8"/><use href="#truck" x="-3" y="-7" width="26" height="26"/></g>
        </g>
      </svg>
      <span class="phone-map-disclaimer">Minh họa tuyến đường</span>
      <div class="phone-map-tools" aria-label="Điều khiển sơ đồ minh họa">
        <button type="button" data-phone-action="recenter" aria-label="Đặt lại khung bản đồ">${icon('pin')}</button>
        <button type="button" data-phone-action="zoom-in" aria-label="Phóng to sơ đồ">+</button>
        <button type="button" data-phone-action="zoom-out" aria-label="Thu nhỏ sơ đồ">−</button>
      </div>
    </section>`;
  }

  function emergency() {
    return `<button type="button" class="phone-emergency" data-phone-action="emergency">${icon('alert')}Khẩn cấp</button><p class="phone-feedback" role="status" id="phone-feedback"></p>`;
  }

  function trip() {
    return `${routeMap()}<section class="phone-trip-sheet phone-glass" aria-label="Thông tin và thao tác chuyến">
      <details><summary>Thông tin chuyến <span aria-hidden="true">⌄</span></summary>
        <dl><div><dt>Chuyến được giao</dt><dd>Chưa kết nối</dd></div><div><dt>Điểm lấy / giao</dt><dd>Chưa có dữ liệu</dd></div></dl>
      </details>
      <p class="phone-connection">Chưa kết nối dữ liệu chuyến</p>
      <div class="phone-camera-actions">
        <button type="button" data-phone-screen="pickup">${camera}Ảnh lấy hàng</button>
        <button type="button" data-phone-screen="delivery">${camera}Ảnh giao hàng</button>
      </div>${emergency()}</section>`;
  }

  function secondaryScreen(screen) {
    const tickets = screen === 'tickets';
    return `<section class="phone-secondary phone-glass">
      <span class="phone-empty-icon">${tickets ? message : camera}</span>
      <h2>${tickets ? 'Chưa tải được ticket' : 'Chưa có chuyến để gửi ảnh'}</h2>
      <p>${tickets ? 'Ticket và trao đổi với Điều phối sẽ hiển thị khi kết nối dịch vụ.' : 'Cần chuyến được giao và vị trí tại thời điểm chụp.'}</p>
      ${tickets ? '' : '<button class="phone-capture" type="button" disabled>Chụp ảnh xác nhận</button><p class="phone-connection">Ảnh và vị trí chưa được gửi.</p>'}
      <button type="button" class="phone-back" data-phone-screen="trip">Về chuyến của tôi</button>
      ${emergency()}
    </section>`;
  }

  function screenFromUrl() {
    const params = new URL(location.href).searchParams;
    const screen = params.get('phone_view');
    if (['pickup', 'delivery', 'tickets'].includes(screen)) return screen;
    return params.get('flow') === 'tickets' ? 'tickets' : 'trip';
  }

  function syncTheme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    const toggle = root.querySelector('[data-phone-action="theme"]');
    if (!toggle) return;
    toggle.innerHTML = icon(dark ? 'sun' : 'moon');
    toggle.setAttribute('aria-label', dark ? 'Chuyển sang nền Sáng' : 'Chuyển sang nền Tối');
  }

  function render() {
    const enabled = phone.matches && window.FleetRoles?.role() === 'driver';
    document.body.classList.toggle('driver-phone-active', enabled);
    root.hidden = !enabled;
    if (!enabled) { activeScreen = ''; return; }
    const screen = screenFromUrl();
    if (activeScreen === screen && root.childElementCount) { syncTheme(); return; }
    activeScreen = screen;
    zoom = 1;
    const title = { trip: 'Chuyến của tôi', pickup: 'Ảnh lấy hàng', delivery: 'Ảnh giao hàng', tickets: 'Ticket' }[screen];
    root.innerHTML = `<div class="phone-topbar">
      <a class="phone-brand" href="?role=driver" aria-label="Fleet Autopilot — Chuyến của tôi"><svg viewBox="0 0 552 332" aria-hidden="true"><use href="assets/brand/fleet-construction.svg#fleet-logo"/></svg><span>Fleet Autopilot<small>Tài xế</small></span></a>
      <button type="button" class="phone-theme phone-glass" data-phone-action="theme"></button>
    </div><h1 class="phone-title" tabindex="-1">${title}</h1>
    <div class="phone-content">${screen === 'trip' ? trip() : secondaryScreen(screen)}</div>
    <nav class="phone-nav phone-glass" aria-label="Điều hướng Tài xế">
      <button type="button" data-phone-screen="trip" ${screen !== 'tickets' ? 'aria-current="page"' : ''}>${icon('truck')}<span>Chuyến của tôi</span></button>
      <button type="button" data-phone-screen="tickets" ${screen === 'tickets' ? 'aria-current="page"' : ''}>${message}<span>Ticket</span></button>
    </nav>`;
    syncTheme();
    if (root.querySelector('#phone-map-scene')) updateZoom();
  }

  function updateZoom() {
    const scene = root.querySelector('#phone-map-scene');
    if (scene) scene.setAttribute('transform', `translate(195 230) scale(${zoom}) translate(-195 -230)`);
    root.querySelector('[data-phone-action="zoom-in"]').disabled = zoom >= 1.8;
    root.querySelector('[data-phone-action="zoom-out"]').disabled = zoom <= 1;
  }

  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.phoneScreen) {
      const url = new URL(location.href);
      url.searchParams.delete('flow');
      url.searchParams.set('phone_view', button.dataset.phoneScreen);
      history.pushState(null, '', url);
      render();
      root.querySelector('h1').focus({ preventScroll: true });
      return;
    }
    const action = button.dataset.phoneAction;
    if (action === 'theme') {
      const select = document.querySelector('#theme-select');
      select.value = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      syncTheme();
    }
    if (action === 'emergency') {
      // Chưa có đích nhận: không xin camera, tạo ticket hoặc báo gửi thành công.
      root.querySelector('#phone-feedback').textContent = 'Chưa gửi được cảnh báo vì chưa kết nối. Hãy liên hệ Điều phối qua kênh đang dùng.';
    }
    if (['zoom-in', 'zoom-out', 'recenter'].includes(action)) {
      zoom = action === 'recenter' ? 1 : Math.max(1, Math.min(1.8, Math.round((zoom + (action === 'zoom-in' ? 0.2 : -0.2)) * 10) / 10));
      updateZoom();
    }
  });

  phone.addEventListener('change', render);
  window.addEventListener('fleet:role-render', render);
  window.addEventListener('popstate', render);
  new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  render();
})();
