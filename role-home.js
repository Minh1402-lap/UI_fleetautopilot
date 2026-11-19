/* Trang vào nhanh các vai trò chỉ phục vụ UI thử nghiệm; không thay thế đăng nhập hoặc phân quyền thật. */
(() => {
  'use strict';

  const requestedRole = new URLSearchParams(location.search).get('role');
  if (requestedRole) return;

  document.body.classList.add('role-home-active');
  const root = document.createElement('main');
  root.id = 'role-home';
  root.innerHTML = `<section class="role-home-shell">
    <header class="role-home-brand">
      <svg viewBox="0 0 552 332" aria-hidden="true"><use href="assets/brand/fleet-construction.svg#fleet-logo"/></svg>
      <div><strong>Fleet Autopilot</strong><span>Chọn giao diện thử nghiệm</span></div>
    </header>
    <div class="role-home-grid">
      <a href="?role=dispatch"><span class="role-home-icon"><svg aria-hidden="true"><use href="#truck"/></svg></span><strong>Điều phối</strong><small>Đơn hàng, phân xe và GPS</small><b>Vào giao diện <span>→</span></b></a>
      <a href="?role=driver"><span class="role-home-icon"><svg aria-hidden="true"><use href="#pin"/></svg></span><strong>Tài xế</strong><small>Bản đồ, chuyến và ticket</small><b>Vào giao diện <span>→</span></b></a>
      <a href="?role=admin"><span class="role-home-icon"><svg aria-hidden="true"><use href="#chart"/></svg></span><strong>Admin</strong><small>Quản lý và giám sát vận hành</small><b>Vào giao diện <span>→</span></b></a>
      <a href="?role=system_admin"><span class="role-home-icon"><svg aria-hidden="true"><use href="#gear"/></svg></span><strong>System Admin</strong><small>Tài khoản và hệ thống</small><b>Vào giao diện <span>→</span></b></a>
    </div>
    <p class="role-home-note">Các đường dẫn này chỉ giúp xem UI; quyền thật vẫn phải được xác minh ở máy chủ.</p>
  </section>`;
  document.body.append(root);
})();
