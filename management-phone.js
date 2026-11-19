/* UI Phone riêng cho hai vai trò quản trị; chỉ trình bày trạng thái rỗng khi dịch vụ chưa kết nối. */
(() => {
  'use strict';

  const phone = matchMedia('(max-width: 759px)');
  const root = document.createElement('section');
  root.id = 'management-phone';
  root.hidden = true;
  document.querySelector('#main').append(root);

  const icon = name => `<svg aria-hidden="true"><use href="#${name}"/></svg>`;
  const themes = [
    ['light', 'Sáng'],
    ['dark', 'Tối'],
    ['amber', 'Đen hổ phách'],
    ['moss', 'Rêu Lime'],
  ];

  const roleConfig = {
    admin: {
      title: 'Tổng quan vận hành',
      subtitle: 'Quản lý vận hành',
      screens: ['overview', 'approvals', 'fleet', 'more', 'activity', 'tickets', 'maintenance'],
      navigation: [
        ['overview', 'home', 'Tổng quan'],
        ['approvals', 'order', 'Duyệt'],
        ['fleet', 'truck', 'Đội xe'],
        ['more', 'gear', 'Thêm'],
      ],
    },
    admin_system: {
      title: 'Quản trị hệ thống',
      subtitle: 'Hệ thống',
      screens: ['overview', 'accounts', 'requests', 'more', 'recovery', 'connections', 'data', 'controls', 'backups', 'logs'],
      navigation: [
        ['overview', 'home', 'Tổng quan'],
        ['accounts', 'layers', 'Tài khoản'],
        ['requests', 'order', 'Yêu cầu'],
        ['more', 'gear', 'Thêm'],
      ],
    },
  };

  function currentRole() {
    const role = window.FleetRoles?.role();
    return Object.hasOwn(roleConfig, role) ? role : '';
  }

  function screenFromUrl(role) {
    const requested = new URL(location.href).searchParams.get('phone_view');
    return roleConfig[role].screens.includes(requested) ? requested : 'overview';
  }

  function glassCard(title, content, iconName = 'layers', className = '') {
    return `<section class="management-card management-glass ${className}">
      <h2>${icon(iconName)}${title}</h2>${content}
    </section>`;
  }

  function metric(label) {
    return `<div><strong>—</strong><span>${label}</span></div>`;
  }

  function actionRow(screen, iconName, label, meta = 'Chưa kết nối') {
    return `<button type="button" class="management-row" data-management-screen="${screen}">
      <span class="management-row-icon">${icon(iconName)}</span><span>${label}<small>${meta}</small></span><b aria-hidden="true">›</b>
    </button>`;
  }

  function routeMap() {
    // Sơ đồ chỉ giúp nhận biết khu vực bản đồ; không thể hiện GPS hoặc vị trí xe giả.
    return `<div class="management-map" role="img" aria-label="Khung bản đồ đội xe chưa kết nối dữ liệu GPS">
      <svg viewBox="0 0 360 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="360" height="190" class="management-map-ground"/>
        <g class="management-map-blocks"><path d="M7 8h72v55H7zM102 7h73v43h-73zM202 8h59v65h-59zM285 6h68v51h-68zM12 87h57v50H12zM92 75h72v61H92zM190 91h76v45h-76zM291 79h58v62h-58zM4 158h88v27H4zM116 153h69v31h-69zM212 151h53v34h-53zM289 156h67v28h-67z"/></g>
        <g class="management-map-roads"><path d="M-10 67 370 62M-10 145 370 148M84-10 90 210M178-10 183 210M274-10 278 210M-20 182 370 18M-20 14 370 173"/></g>
        <path class="management-map-river" d="M260-20c-28 55 38 53 8 101s-7 72 26 129"/>
      </svg>
      <span>Chưa kết nối bản đồ / GPS</span>
    </div>`;
  }

  function emptyPage(title, copy, iconName, back = 'more') {
    return `<section class="management-empty management-glass">
      <span class="management-empty-icon">${icon(iconName)}</span>
      <h1>${title}</h1><p>${copy}</p>
      <button type="button" data-management-screen="${back}">Quay lại</button>
    </section>`;
  }

  function adminOverview() {
    const metrics = `<div class="management-metrics">${metric('Chờ duyệt')}${metric('Xe hoạt động')}${metric('Ticket mở')}</div>`;
    const work = `<div class="management-rows">${actionRow('approvals', 'order', 'Duyệt phân công')}${actionRow('maintenance', 'gear', 'Yêu cầu bảo trì')}${actionRow('tickets', 'alert', 'Ticket cần xem')}</div>`;
    return `${glassCard('Hôm nay', metrics, 'chart')}${glassCard('Cần xử lý', work, 'layers')}${glassCard('Bản đồ đội xe', routeMap(), 'pin')}`;
  }

  function adminFleet() {
    return `${glassCard('Bản đồ đội xe', routeMap(), 'pin', 'management-map-card')}${glassCard('Trạng thái kết nối', '<p class="management-copy">Chưa có nguồn GPS để hiển thị xe hoặc thời gian cập nhật.</p>', 'activity')}`;
  }

  function adminMore() {
    return glassCard('Chức năng quản lý', `<div class="management-rows">${actionRow('activity', 'activity', 'Hoạt động Điều phối')}${actionRow('tickets', 'alert', 'Sự cố & ticket')}${actionRow('maintenance', 'gear', 'Yêu cầu bảo trì')}</div>`, 'gear');
  }

  function adminScreen(screen) {
    if (screen === 'overview') return adminOverview();
    if (screen === 'fleet') return adminFleet();
    if (screen === 'more') return adminMore();
    const pages = {
      approvals: ['Duyệt phân công', 'Danh sách phân công cần duyệt sẽ hiển thị khi kết nối dịch vụ.', 'order', 'overview'],
      activity: ['Hoạt động Điều phối', 'Nhật ký thao tác sẽ hiển thị khi có nguồn dữ liệu được xác minh.', 'activity', 'more'],
      tickets: ['Sự cố & ticket', 'Ticket và hội thoại chỉ đọc sẽ hiển thị khi kết nối dịch vụ.', 'alert', 'more'],
      maintenance: ['Yêu cầu bảo trì', 'Yêu cầu bảo trì chưa được tải từ dịch vụ.', 'gear', 'more'],
    };
    return emptyPage(...pages[screen]);
  }

  function systemOverview() {
    const metrics = `<div class="management-system-metrics">${metric('Tài khoản')}${metric('Yêu cầu khôi phục')}${metric('Kết nối dịch vụ')}</div>`;
    const work = `<div class="management-rows">${actionRow('accounts', 'layers', 'Tài khoản & quyền')}${actionRow('recovery', 'order', 'Khôi phục truy cập')}${actionRow('backups', 'activity', 'Sao lưu & nhật ký')}</div>`;
    const quick = `<div class="management-quick">${actionRow('connections', 'gear', 'Kết nối', '')}${actionRow('data', 'layers', 'Dữ liệu', '')}${actionRow('controls', 'chart', 'Điều khiển', '')}${actionRow('logs', 'activity', 'Nhật ký', '')}</div>`;
    return `${glassCard('Tình trạng hệ thống', metrics, 'layers')}${glassCard('Cần xử lý', work, 'order')}${glassCard('Truy cập nhanh', quick, 'gear')}`;
  }

  function systemMore() {
    return glassCard('Chức năng hệ thống', `<div class="management-rows">${actionRow('recovery', 'order', 'Khôi phục truy cập')}${actionRow('connections', 'gear', 'Kết nối dịch vụ')}${actionRow('data', 'layers', 'Quản lý dữ liệu')}${actionRow('controls', 'chart', 'Điều khiển hệ thống')}${actionRow('backups', 'activity', 'Sao lưu')}${actionRow('logs', 'activity', 'Nhật ký hệ thống')}</div>`, 'gear');
  }

  function systemScreen(screen) {
    if (screen === 'overview') return systemOverview();
    if (screen === 'more') return systemMore();
    const pages = {
      accounts: ['Tài khoản & quyền', 'Danh sách tài khoản và phạm vi quyền sẽ hiển thị khi kết nối dịch vụ.', 'layers', 'overview'],
      requests: ['Yêu cầu', 'Yêu cầu từ Quản lý vận hành chưa được tải.', 'order', 'overview'],
      recovery: ['Khôi phục truy cập', 'Hàng chờ xác minh và khôi phục chưa được kết nối.', 'order', 'more'],
      connections: ['Kết nối dịch vụ', 'Trạng thái tích hợp chưa được tải.', 'gear', 'more'],
      data: ['Quản lý dữ liệu', 'Công cụ dữ liệu cần phiên và quyền phía máy chủ.', 'layers', 'more'],
      controls: ['Điều khiển hệ thống', 'Thao tác điều khiển chưa khả dụng khi chưa xác minh quyền.', 'chart', 'more'],
      backups: ['Sao lưu', 'Trạng thái sao lưu và khôi phục chưa được kết nối.', 'activity', 'more'],
      logs: ['Nhật ký hệ thống', 'Nhật ký kiểm toán sẽ hiển thị khi có nguồn dữ liệu.', 'activity', 'more'],
    };
    return emptyPage(...pages[screen]);
  }

  function navigation(role, screen) {
    const active = ['activity', 'tickets', 'maintenance', 'recovery', 'connections', 'data', 'controls', 'backups', 'logs'].includes(screen) ? 'more' : screen;
    return roleConfig[role].navigation.map(([id, iconName, label]) => `<button type="button" data-management-screen="${id}" ${active === id ? 'aria-current="page"' : ''}>${icon(iconName)}<span>${label}</span></button>`).join('');
  }

  function themeOptions() {
    const current = document.documentElement.dataset.theme || 'light';
    return themes.map(([value, label]) => `<option value="${value}" ${value === current ? 'selected' : ''}>${label}</option>`).join('');
  }

  function render() {
    const role = currentRole();
    const enabled = phone.matches && Boolean(role);
    document.body.classList.toggle('management-phone-active', enabled);
    root.hidden = !enabled;
    if (!enabled) return;

    const screen = screenFromUrl(role);
    const config = roleConfig[role];
    root.innerHTML = `<header class="management-topbar management-glass">
      <a class="management-brand" href="?role=${role}&phone_view=overview" aria-label="Fleet Autopilot — ${config.subtitle}">
        <svg viewBox="0 0 552 332" aria-hidden="true"><use href="assets/brand/fleet-construction.svg#fleet-logo"/></svg>
        <span>${config.title}<small>${config.subtitle}</small></span>
      </a>
      <label class="management-theme"><span class="sr-only">Chọn nền</span><select data-management-theme aria-label="Chọn một trong bốn nền">${themeOptions()}</select></label>
    </header>
    <div class="management-content">${role === 'admin' ? adminScreen(screen) : systemScreen(screen)}</div>
    <nav class="management-nav management-glass" aria-label="Điều hướng ${config.subtitle}">${navigation(role, screen)}</nav>`;
  }

  root.addEventListener('click', event => {
    const button = event.target.closest('[data-management-screen]');
    if (!button) return;
    const url = new URL(location.href);
    url.searchParams.delete('flow');
    url.searchParams.set('phone_view', button.dataset.managementScreen);
    history.pushState(null, '', url);
    render();
  });

  root.addEventListener('change', event => {
    if (!event.target.matches('[data-management-theme]')) return;
    const select = document.querySelector('#theme-select');
    select.value = event.target.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });

  phone.addEventListener('change', render);
  window.addEventListener('fleet:role-render', render);
  window.addEventListener('popstate', render);
  new MutationObserver(() => {
    const select = root.querySelector('[data-management-theme]');
    if (select) select.value = document.documentElement.dataset.theme || 'light';
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  render();
})();
