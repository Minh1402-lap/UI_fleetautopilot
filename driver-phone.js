/* Giao diện Phone riêng của Tài xế; tách bản đồ khỏi nghiệp vụ chuyến để tuyến luôn dễ quan sát. */
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
  const camera = icon('camera');
  const message = icon('message');

  function routeMap() {
    // Tuyến chỉ minh họa bố cục. Không dùng các điểm này như địa chỉ, GPS hoặc dữ liệu chuyến thật.
    return `<section class="phone-route" aria-label="Minh họa bố cục bản đồ tuyến đường">
      <svg class="phone-map" viewBox="0 0 390 720" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Tuyến minh họa từ điểm lấy hàng tới điểm giao hàng; không phải dữ liệu thật">
        <rect class="phone-map-ground" width="390" height="720"/>
        <g id="phone-map-scene">
          <g class="phone-map-blocks"><path d="M12 20h76v82H12z M115 12h88v70h-88z M232 20h67v92h-67z M322 23h58v72h-58z M8 133h70v86H8z M109 116h86v74h-86z M225 140h69v74h-69z M314 130h66v91h-66z M15 244h84v71H15z M119 230h72v96h-72z M220 248h64v75h-64z M10 350h78v83H10z M112 352h71v71h-71z M217 344h76v88h-76z M318 340h62v83h-62z M18 458h84v85H18z M132 449h70v96h-70z M238 448h64v88h-64z M322 462h60v82h-60z M8 574h78v108H8z M112 570h78v100h-78z M220 568h75v110h-75z M320 570h62v105h-62z"/></g>
          <path class="phone-map-river" d="M417 120C303 178 353 242 287 310S220 426 259 750"/>
          <g class="phone-map-streets"><path d="M-20 114 410 104 M-20 224 410 232 M-20 335 410 347 M-20 449 410 456 M-20 568 410 581 M101-20 102 750 M207-20 207 750 M305-20 305 310 M309 398 309 750 M-20 670 410 365 M-20 35 410 408"/></g>
          <path class="phone-route-edge" d="M55 510V447H132V373H210V280H300V207"/>
          <path class="phone-route-line" d="M55 510V447H132V373H210V280H300V207"/>
          <g class="phone-route-marker"><circle cx="55" cy="510" r="9"/><circle cx="300" cy="207" r="9"/></g>
          <g class="phone-map-label"><rect x="14" y="530" width="103" height="30" rx="9"/><rect x="235" y="158" width="112" height="30" rx="9"/><text x="65" y="550">Lấy hàng</text><text x="291" y="178">Giao hàng</text></g>
        </g>
      </svg>
      <span class="phone-map-disclaimer">Tuyến minh họa</span>
      <div class="phone-map-tools" aria-label="Điều khiển sơ đồ minh họa">
        <button type="button" data-phone-action="recenter" aria-label="Đặt lại khung bản đồ">${icon('pin')}</button>
        <button type="button" data-phone-action="zoom-in" aria-label="Phóng to sơ đồ">+</button>
        <button type="button" data-phone-action="zoom-out" aria-label="Thu nhỏ sơ đồ">−</button>
      </div>
    </section>`;
  }

  function emergency() {
    return `<button type="button" class="phone-emergency" data-phone-action="emergency">${icon('alert')}Khẩn cấp</button>`;
  }

  function newTripSheet() {
    return `<section class="phone-trip-card phone-glass" aria-label="Phân công chuyến mới">
      <header class="phone-assignment-heading"><span class="phone-assignment-icon">${icon('truck')}</span><div><h2>Có chuyến mới</h2><p>Điều phối đã gửi phân công</p></div></header>
      <dl class="phone-assignment-points"><div><dt>${icon('pin')}Điểm lấy hàng</dt><dd>—</dd></div><div><dt>${icon('pin')}Điểm giao hàng</dt><dd>—</dd></div></dl>
      <p class="phone-waiting">Chờ bạn phản hồi</p>
      <div class="phone-assignment-actions"><button type="button" data-phone-action="reject">Từ chối</button><button type="button" class="phone-accept" data-phone-action="accept">Nhận chuyến</button></div>
      <p class="phone-feedback" role="status" id="phone-feedback"></p>
    </section>`;
  }

  function mapScreen() {
    return `${routeMap()}<div class="phone-emergency-float">${emergency()}<p class="phone-feedback" role="status" id="phone-feedback"></p></div>`;
  }

  function tripScreen() {
    return `<section class="phone-trip-page">
      ${newTripSheet()}
      <section class="phone-trip-tools phone-glass" aria-label="Xác nhận chuyến">
        <h2>Xác nhận chuyến</h2>
        <p>Ảnh và vị trí chỉ có thể gửi khi có chuyến được kết nối.</p>
        <div class="phone-proof-actions">
          <button type="button" data-phone-screen="pickup">${camera}<span>Ảnh lấy hàng</span></button>
          <button type="button" data-phone-screen="delivery">${camera}<span>Ảnh giao hàng</span></button>
        </div>
        ${emergency()}
      </section>
    </section>`;
  }

  function secondaryScreen(screen) {
    const tickets = screen === 'tickets';
    return `<section class="phone-secondary phone-glass">
      <span class="phone-empty-icon">${tickets ? message : camera}</span>
      <h2>${tickets ? 'Chưa tải được ticket' : 'Chưa có chuyến để gửi ảnh'}</h2>
      <p>${tickets ? 'Ticket và trao đổi với Điều phối sẽ hiển thị khi kết nối dịch vụ.' : 'Cần chuyến được giao và vị trí tại thời điểm chụp.'}</p>
      ${tickets ? '' : '<button class="phone-capture" type="button" disabled>Chụp ảnh xác nhận</button><p class="phone-connection">Ảnh và vị trí chưa được gửi.</p>'}
      <button type="button" class="phone-back" data-phone-screen="${tickets ? 'map' : 'trip'}">${tickets ? 'Về bản đồ' : 'Về chuyến của tôi'}</button>
      ${emergency()}<p class="phone-feedback" role="status" id="phone-feedback"></p>
    </section>`;
  }

  function screenFromUrl() {
    const params = new URL(location.href).searchParams;
    const screen = params.get('phone_view');
    if (['map', 'trip', 'pickup', 'delivery', 'tickets'].includes(screen)) return screen;
    return params.get('flow') === 'tickets' ? 'tickets' : 'map';
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
    if (!enabled) {
      activeScreen = '';
      return;
    }

    const screen = screenFromUrl();
    if (activeScreen === screen && root.childElementCount) {
      syncTheme();
      return;
    }

    activeScreen = screen;
    zoom = 1;
    const title = { map: 'Bản đồ', trip: 'Chuyến của tôi', pickup: 'Ảnh lấy hàng', delivery: 'Ảnh giao hàng', tickets: 'Ticket' }[screen];
    root.innerHTML = `<div class="phone-topbar phone-glass">
      <a class="phone-brand" href="?role=driver&phone_view=map" aria-label="Fleet Autopilot — Bản đồ"><svg viewBox="0 0 552 332" aria-hidden="true"><use href="assets/brand/fleet-construction.svg#fleet-logo"/></svg><span>${title}<small>Tài xế</small></span></a>
      <button type="button" class="phone-theme" data-phone-action="theme"></button>
    </div>
    <div class="phone-content">${screen === 'map' ? mapScreen() : screen === 'trip' ? tripScreen() : secondaryScreen(screen)}</div>
    <nav class="phone-nav phone-glass" aria-label="Điều hướng Tài xế">
      <button type="button" data-phone-screen="map" ${screen === 'map' ? 'aria-current="page"' : ''}>${icon('pin')}<span>Bản đồ</span></button>
      <button type="button" data-phone-screen="trip" ${['trip', 'pickup', 'delivery'].includes(screen) ? 'aria-current="page"' : ''}>${icon('truck')}<span>Chuyến</span></button>
      <button type="button" data-phone-screen="tickets" ${screen === 'tickets' ? 'aria-current="page"' : ''}>${message}<span>Ticket</span></button>
    </nav>`;
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

  function showUnavailable(message) {
    const feedback = root.querySelector('#phone-feedback');
    if (feedback) feedback.textContent = message;
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
      return;
    }

    const action = button.dataset.phoneAction;
    if (action === 'theme') {
      const select = document.querySelector('#theme-select');
      select.value = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      syncTheme();
    }
    if (action === 'emergency') showUnavailable('Chưa gửi được cảnh báo vì chưa kết nối. Hãy liên hệ Điều phối qua kênh đang dùng.');
    if (action === 'accept') showUnavailable('Chưa thể nhận chuyến vì dịch vụ phân công chưa kết nối.');
    if (action === 'reject') showUnavailable('Chưa thể từ chối chuyến vì dịch vụ phân công chưa kết nối.');
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
