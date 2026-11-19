/* UI Phone cho Điều phối và hai vai trò quản trị; chỉ trình bày trạng thái rỗng khi dịch vụ chưa kết nối. */
(() => {
  'use strict';

  const phone = matchMedia('(max-width: 759px)');
  const root = document.createElement('section');
  root.id = 'management-phone';
  root.hidden = true;
  document.querySelector('#main').append(root);

  let activeRole = '';
  let activeScreen = '';
  let transitionGeneration = 0;
  let transitionTimer = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const icon = name => `<svg aria-hidden="true"><use href="#${name}"/></svg>`;
  const themes = [
    ['light', 'Sáng'],
    ['dark', 'Tối'],
    ['amber', 'Đen hổ phách'],
    ['moss', 'Rêu Lime'],
  ];

  const roleConfig = {
    dispatch: {
      title: 'Tổng quan điều phối',
      subtitle: 'Điều phối',
      screens: ['overview', 'orders', 'assignment', 'more', 'new-order', 'fleet', 'gps', 'reports'],
      navigation: [
        ['overview', 'home', 'Tổng quan'],
        ['orders', 'order', 'Đơn hàng'],
        ['assignment', 'truck', 'Điều phối'],
        ['more', 'gear', 'Thêm'],
      ],
    },
    admin: {
      title: 'Tổng quan vận hành',
      subtitle: 'Quản lý vận hành',
      screens: ['overview', 'role-approvals', 'fleet', 'more', 'activity', 'tickets', 'maintenance'],
      navigation: [
        ['overview', 'home', 'Tổng quan'],
        ['role-approvals', 'order', 'Duyệt quyền'],
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

  function roleInUrl(role) {
    return role === 'admin_system' ? 'system_admin' : role;
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
    const metrics = `<div class="management-metrics">${metric('Đổi quyền chờ duyệt')}${metric('Xe hoạt động')}${metric('Ticket mở')}</div>`;
    const work = `<div class="management-rows">${actionRow('role-approvals', 'order', 'Phê duyệt thay đổi quyền')}${actionRow('maintenance', 'gear', 'Yêu cầu bảo trì')}${actionRow('tickets', 'alert', 'Ticket cần xem')}</div>`;
    return `${glassCard('Hôm nay', metrics, 'chart')}${glassCard('Cần xử lý', work, 'layers')}${glassCard('Bản đồ đội xe', routeMap(), 'pin')}`;
  }

  function dispatchOverview() {
    const metrics = `<div class="management-metrics">${metric('Đơn chờ')}${metric('Chuyến đang chạy')}${metric('Xe sẵn sàng')}</div>`;
    const work = `<div class="management-rows">${actionRow('new-order', 'order', 'Tiếp nhận đơn từ Sale')}${actionRow('assignment', 'truck', 'Duyệt phân công')}${actionRow('gps', 'pin', 'Theo dõi GPS')}</div>`;
    return `${glassCard('Hôm nay', metrics, 'chart')}${glassCard('Công việc chính', work, 'layers')}${glassCard('Theo dõi hành trình', routeMap(), 'pin')}`;
  }

  function dispatchOrders() {
    return glassCard('Đơn hàng', `<div class="management-rows">${actionRow('new-order', 'order', 'Tiếp nhận đơn từ Sale')}${actionRow('orders', 'search-icon', 'Danh sách đơn hàng', 'Chưa có dữ liệu')}</div><p class="management-copy management-card-note">Đơn hàng sẽ hiển thị khi kết nối nguồn dữ liệu vận hành.</p>`, 'order');
  }

  function dispatchMore() {
    return glassCard('Chức năng Điều phối', `<div class="management-rows">${actionRow('fleet', 'truck', 'Xe & tài xế')}${actionRow('gps', 'pin', 'Theo dõi GPS')}${actionRow('reports', 'chart', 'Báo cáo')}</div>`, 'gear');
  }

  function dispatchScreen(screen) {
    if (screen === 'overview') return dispatchOverview();
    if (screen === 'orders') return dispatchOrders();
    if (screen === 'gps') return `${glassCard('Theo dõi GPS', routeMap(), 'pin', 'management-map-card')}${glassCard('Trạng thái kết nối', '<p class="management-copy">Chưa có nguồn GPS để hiển thị xe hoặc hành trình.</p>', 'activity')}`;
    if (screen === 'more') return dispatchMore();
    const pages = {
      assignment: ['Điều phối', 'Đơn chờ và xe đủ điều kiện sẽ hiển thị khi kết nối dịch vụ.', 'truck', 'overview'],
      'new-order': ['Tiếp nhận đơn từ Sale', 'Biểu mẫu tiếp nhận cần nguồn lưu và quyền Điều phối phía máy chủ.', 'order', 'orders'],
      fleet: ['Xe & tài xế', 'Danh sách xe và tài xế chưa được kết nối.', 'truck', 'more'],
      reports: ['Báo cáo', 'Số liệu báo cáo sẽ hiển thị khi có nguồn dữ liệu được xác minh.', 'chart', 'more'],
    };
    return emptyPage(...pages[screen]);
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
      'role-approvals': ['Phê duyệt thay đổi quyền', 'Yêu cầu đổi vai trò người dùng sẽ hiển thị khi kết nối dịch vụ. Admin không duyệt phân công vận hành.', 'order', 'overview'],
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

  function activeNavigationId(role, screen) {
    const moreScreens = role === 'dispatch'
      ? ['fleet', 'gps', 'reports']
      : role === 'admin'
        ? ['activity', 'tickets', 'maintenance']
        : ['recovery', 'connections', 'data', 'controls', 'backups', 'logs'];
    if (moreScreens.includes(screen)) return 'more';
    if (role === 'dispatch' && screen === 'new-order') return 'orders';
    return screen;
  }

  function navigationIndex(role, screen) {
    const active = activeNavigationId(role, screen);
    return Math.max(0, roleConfig[role].navigation.findIndex(([id]) => id === active));
  }

  function padPosition(index) {
    // Pad rộng 19% thanh, tương đương khoảng ba phần tư một ô trong menu bốn tab.
    return ['15.789%', '147.368%', '278.947%', '410.526%'][index];
  }

  function navigation(role, screen) {
    const active = activeNavigationId(role, screen);
    return roleConfig[role].navigation.map(([id, iconName, label]) => `<button type="button" data-management-screen="${id}" ${active === id ? 'aria-current="page"' : ''}>${icon(iconName)}<span>${label}</span></button>`).join('');
  }

  function screenContent(role, screen) {
    return role === 'dispatch' ? dispatchScreen(screen) : role === 'admin' ? adminScreen(screen) : systemScreen(screen);
  }

  function themeOptions() {
    const current = document.documentElement.dataset.theme || 'light';
    return themes.map(([value, label]) => `<option value="${value}" ${value === current ? 'selected' : ''}>${label}</option>`).join('');
  }

  function mountScreen(role, screen) {
    const config = roleConfig[role];
    const index = navigationIndex(role, screen);
    root.innerHTML = `<header class="management-topbar management-glass">
      <a class="management-brand" href="?role=${roleInUrl(role)}&phone_view=overview" aria-label="Fleet Autopilot — ${config.subtitle}">
        <svg viewBox="0 0 552 332" aria-hidden="true"><use href="assets/brand/fleet-construction.svg#fleet-logo"/></svg>
        <span>${config.title}<small>${config.subtitle}</small></span>
      </a>
      <div class="management-topbar-actions">
        <a class="management-role-switch" href="./" aria-label="Chọn vai trò xem thử" title="Chọn vai trò">${icon('switch-account')}<span>Vai trò</span></a>
        <label class="management-theme"><span class="sr-only">Chọn nền</span><select data-management-theme aria-label="Chọn một trong bốn nền">${themeOptions()}</select></label>
      </div>
    </header>
    <div class="management-content"><div class="management-page is-current" data-management-page="${screen}">${screenContent(role, screen)}</div></div>
    <nav class="management-nav management-glass" aria-label="Điều hướng ${config.subtitle}" style="--management-pad-x:${padPosition(index)}">
      <span class="management-nav-indicator" aria-hidden="true"></span>${navigation(role, screen)}
    </nav>`;

    requestAnimationFrame(() => root.querySelector('.management-nav')?.classList.add('is-ready'));
  }

  function updateNavigation(role, screen, previousScreen) {
    const nav = root.querySelector('.management-nav');
    if (!nav) return;

    const nextIndex = navigationIndex(role, screen);
    const previousIndex = navigationIndex(role, previousScreen);
    const steps = Math.abs(nextIndex - previousIndex);
    const duration = steps > 2 ? 520 : steps > 1 ? 420 : 300;
    nav.style.setProperty('--management-nav-duration', `${duration}ms`);
    nav.style.setProperty('--management-pad-x', padPosition(nextIndex));
    nav.querySelectorAll('[data-management-screen]').forEach(button => {
      if (button.dataset.managementScreen === activeNavigationId(role, screen)) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }

  function settlePageTransition() {
    clearTimeout(transitionTimer);
    const content = root.querySelector('.management-content');
    if (!content) return;
    const pages = [...content.querySelectorAll('.management-page')];
    const current = pages[pages.length - 1];
    pages.forEach(page => {
      if (page !== current) page.remove();
    });
    if (!current) return;
    current.className = 'management-page is-current';
    current.removeAttribute('style');
  }

  function replacePage(role, screen) {
    const content = root.querySelector('.management-content');
    if (!content) return;
    content.innerHTML = `<div class="management-page is-current" data-management-page="${screen}">${screenContent(role, screen)}</div>`;
  }

  function transitionPage(role, previousScreen, screen) {
    const content = root.querySelector('.management-content');
    if (!content) return;

    settlePageTransition();
    const current = content.querySelector('.management-page.is-current');
    const previousIndex = navigationIndex(role, previousScreen);
    const nextIndex = navigationIndex(role, screen);
    const steps = Math.abs(nextIndex - previousIndex);
    if (!current || previousIndex === nextIndex || reducedMotion.matches) {
      replacePage(role, screen);
      return;
    }

    const generation = ++transitionGeneration;
    const direction = nextIndex > previousIndex ? 1 : -1;
    const distance = steps > 2 ? 130 : steps > 1 ? 115 : 100;
    const duration = steps > 2 ? 520 : steps > 1 ? 420 : 300;
    const incoming = document.createElement('div');
    incoming.className = 'management-page is-incoming';
    incoming.dataset.managementPage = screen;
    incoming.style.setProperty('--management-page-duration', `${duration}ms`);
    incoming.style.setProperty('--management-enter-x', `${direction * distance}%`);
    incoming.style.setProperty('--management-exit-x', `${direction * -distance}%`);
    incoming.innerHTML = screenContent(role, screen);
    current.style.setProperty('--management-page-duration', `${duration}ms`);
    current.style.setProperty('--management-exit-x', `${direction * -distance}%`);
    content.append(incoming);

    // Ghi nhận vị trí xuất phát để chuyển cảnh vẫn chạy khi tab trình duyệt vừa được kích hoạt lại.
    incoming.getBoundingClientRect();
    current.classList.remove('is-current');
    current.classList.add('is-outgoing');
    incoming.classList.remove('is-incoming');
    incoming.classList.add('is-current');

    const finishTransition = () => {
      if (generation !== transitionGeneration) return;
      settlePageTransition();
    };
    const handleTransitionEnd = event => {
      if (event.propertyName !== 'transform') return;
      incoming.removeEventListener('transitionend', handleTransitionEnd);
      finishTransition();
    };
    incoming.addEventListener('transitionend', handleTransitionEnd);
    transitionTimer = window.setTimeout(finishTransition, duration + 100);
  }

  function render() {
    const role = currentRole();
    const enabled = phone.matches && Boolean(role);
    document.body.classList.toggle('management-phone-active', enabled);
    root.hidden = !enabled;
    if (!enabled) {
      transitionGeneration += 1;
      clearTimeout(transitionTimer);
      activeRole = '';
      activeScreen = '';
      return;
    }

    const screen = screenFromUrl(role);
    const previousRole = activeRole;
    const previousScreen = activeScreen;
    activeRole = role;
    activeScreen = screen;
    if (previousRole !== role || !previousScreen || !root.querySelector('.management-content')) {
      transitionGeneration += 1;
      clearTimeout(transitionTimer);
      mountScreen(role, screen);
      return;
    }
    if (previousScreen === screen) return;

    updateNavigation(role, screen, previousScreen);
    transitionPage(role, previousScreen, screen);
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
