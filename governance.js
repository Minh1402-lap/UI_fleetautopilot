/* Quản trị hệ thống & bảo trì UI thử nghiệm (dữ liệu mẫu cục bộ, không phải ranh giới bảo mật server).
 * Trách nhiệm:
 * - System Admin quản lý 4 vai trò cố định: cấp tài khoản thường, đổi role thường trực tiếp (có audit log),
 *   giữ cổng duyệt riêng cho cấp/nâng role quản trị (cấm tự duyệt), xử lý hàng chờ quên tên TK / quên mật khẩu (mã 1 lần),
 *   khóa khẩn cấp tài khoản (thông báo Admin), cấp quyền hỗ trợ có ghi nhận, ghép biển số ↔ IMEI Taris, retry JOB-017.
 * - Admin (Quản lý vận hành): chỉ gửi yêu cầu bảo trì, theo dõi cảnh báo ảnh hưởng vận hành và nhận thông báo khóa TK khẩn cấp (không duyệt role). */
(() => {
  'use strict';
  const api = window.FleetPreview, roles = window.FleetRoles, $ = (s) => document.querySelector(s);
  const key = 'fleet-autopilot-governance-v2';
  const names = { driver: 'Tài xế', dispatch: 'Điều phối', admin: 'Quản lý vận hành', admin_system: 'Quản trị hệ thống' };
  const actors = { admin: 'Trần Minh An', admin_system: 'Phạm Huy Hoàng' };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (n) => `<svg aria-hidden="true"><use href="#${n}"/></svg>`;
  const now = () => new Date().toISOString(), uid = (p) => p + '-' + crypto.randomUUID().slice(0, 8);
  const time = (t) => t ? new Date(t).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'short' }) : '—';

  const seed = () => ({
    version: 2,
    changes: [
      { id: 'Q-ADMIN-01', userId: 'U3', name: 'Lê Hoàng Nam', before: 'dispatch', after: 'admin', reason: 'Đề xuất bổ sung dự phòng Quản lý vận hành', requestedBy: 'Phạm Huy Hoàng', at: '2026-11-16T02:15:00.000Z', status: 'designated', result: 'Chờ người công ty chỉ định duyệt (System Admin không tự duyệt role quản trị).' },
    ],
    recovery: [
      { id: 'KP-001', kind: 'password', target: 'Tài xế Bình (binh.tx)', submittedBy: 'Lê Hoàng Nam (Điều phối hỗ trợ)', note: 'Tài xế gọi báo quên mật khẩu tại bãi xe', at: '2026-11-16T03:15:00.000Z', status: 'pending', result: '' },
      { id: 'KP-002', kind: 'username', target: 'Tài xế Châu (mẫu)', submittedBy: 'Người dùng (Trang đăng nhập)', note: 'Đổi điện thoại mới, quên tên tài khoản đăng nhập', at: '2026-11-16T02:40:00.000Z', status: 'pending', result: '' },
    ],
    maintenance: [
      { id: 'BT-001', kind: 'gps', target: '51C-481.66', text: 'Kiểm tra kết nối GPS Taris · Tín hiệu không cập nhật > 20 phút', requestedBy: 'Trần Minh An', approvedBy: 'Trần Minh An', at: '2026-11-16T03:40:00.000Z', status: 'approved', result: '' },
      { id: 'BT-000', kind: 'retry', target: 'JOB-017', text: 'Đồng bộ trạng thái GPS nền bị gián đoạn · Nhờ kiểm tra kết nối', requestedBy: 'Trần Minh An', approvedBy: 'Trần Minh An', at: '2026-11-15T07:15:00.000Z', status: 'done', executedBy: 'Phạm Huy Hoàng', executedAt: '2026-11-15T07:30:00.000Z', result: 'Đã ghi nhận kiểm tra (mẫu)' },
    ],
    jobs: [{ id: 'JOB-017', name: 'Đồng bộ trạng thái GPS Taris (chu kỳ 10p)', status: 'failed', attempts: 0, at: '2026-11-16T02:30:00.000Z' }],
    support: [
      { id: 'TB-001', text: 'Thông báo bảo mật mẫu · Hệ thống sẵn sàng gửi cảnh báo ngay cho Admin khi System Admin khóa khẩn cấp tài khoản nghi bị chiếm.', at: '2026-11-16T01:00:00.000Z' },
    ],
    supportGrants: [
      { id: 'HT-001', scope: 'Xem mã lỗi & kết nối GPS 51C-481.66 (không mở vị trí/hội thoại)', reason: 'Xử lý phiếu BT-001', grantedBy: 'Phạm Huy Hoàng (phạm vi kỹ thuật)', at: '2026-11-16T03:42:00.000Z', status: 'active' },
    ],
  });

  let state = seed(), systemQuery = '';
  try {
    const s = JSON.parse(localStorage.getItem(key));
    if (s?.version === 2 && ['changes', 'recovery', 'maintenance', 'jobs', 'support', 'supportGrants'].every((k) => Array.isArray(s[k]))) state = s;
  } catch {}

  const button = (label, action, id = '', cls = 'secondary') => `<button type="button" class="${cls}" data-gov="${action}" data-id="${esc(id)}">${label}</button>`;
  const badge = (label, status = 'pending') => `<span class="badge" data-status="${status}"><span class="status-dot" aria-hidden="true"></span>${esc(label)}</span>`;
  const panel = (title, body, ico = 'layers') => `<section class="panel"><div class="panel-heading"><h2>${icon(ico)}${title}</h2></div>${body}</section>`;
  const note = (text) => `<p class="workflow-note">${text}</p>`;
  const details = (rows) => `<dl class="role-details">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v || '—')}</dd></div>`).join('')}</dl>`;
  const field = (label, name, value = '') => `<label>${label}<input name="${name}" required maxlength="150" value="${esc(value)}"></label>`;
  const table = (heads, rows) => `<div class="table-wrap" tabindex="0" role="region" aria-label="Bảng dữ liệu có thể cuộn ngang"><table class="role-table"><thead><tr>${heads.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${heads.length}">Chưa có dữ liệu.</td></tr>`}</tbody></table></div>`;
  const ordinary = (r) => ['driver', 'dispatch'].includes(r);

  function save() {
    try { localStorage.setItem(key, JSON.stringify(state)); return true; }
    catch { api.toast('Chưa lưu được thay đổi mẫu. Vui lòng thử lại.'); return false; }
  }
  function log(action, before, after, request = '', extra = {}) {
    roles.snapshot().system.unshift({ id: uid('S'), at: now(), actor: actors[roles.role()] || 'Phạm Huy Hoàng', action, before, after, request, result: 'Đã ghi nhận mẫu', ...extra });
    roles.save();
  }
  function modal(title, html, submit) {
    const node = document.createElement('div');
    node.innerHTML = html;
    api.openModal(title, 'UI thử nghiệm · Chưa kết nối backend.', node);
    const form = node.querySelector('form');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        if (!form.reportValidity()) return;
        const result = submit(new FormData(form), form);
        if (result === false) return;
        $('#modal').close();
        roles.render();
      };
    }
  }
  const confirm = (title, body, submit) => modal(title, `<form class="role-form">${body}${field('Lý do / ghi chú', 'reason')}<button class="primary">Xác nhận thao tác mẫu</button></form>`, (f, form) => { if (!String(f.get('reason')).trim()) return false; return submit(f, form); });

  function changesMarkup() {
    return state.changes.map((c) => `<article class="role-row"><div><strong>${esc(c.name)} · ${esc(c.id)}</strong><small>${esc(names[c.before])} → ${esc(names[c.after])}</small><small>${esc(c.reason)} · Người đề nghị: ${esc(c.requestedBy)}</small>${badge(({ designated: 'Chờ người công ty chỉ định duyệt', done: 'Đã thực hiện', rejected: 'Đã từ chối' })[c.status] || c.status, c.status === 'done' ? 'completed' : c.status === 'rejected' ? 'neutral' : 'pending')}${c.result ? note(esc(c.result)) : ''}</div></article>`).join('') || note('Chưa có hồ sơ cấp/nâng role quản trị nào đang chờ.');
  }

  function recoveryMarkup() {
    return state.recovery.map((r) => `<article class="role-row"><div><strong>${esc(r.id)} · ${r.kind === 'username' ? 'Quên tên tài khoản' : 'Quên mật khẩu'} · ${esc(r.target)}</strong><small>Nguồn gửi: ${esc(r.submittedBy)} · ${time(r.at)}</small><small>${esc(r.note)}</small>${badge(r.status === 'done' ? 'Đã xử lý' : r.status === 'rejected' ? 'Chưa đủ xác minh' : 'Chờ System Admin xác minh', r.status === 'done' ? 'completed' : r.status === 'rejected' ? 'neutral' : 'pending')}${r.result ? note(esc(r.result)) : ''}</div><div class="workflow-inline-actions">${roles.role() === 'admin_system' && r.status === 'pending' ? button(r.kind === 'username' ? 'Xác minh & bàn giao tên' : 'Xác minh & cấp mã 1 lần', 'recovery-approve', r.id, 'primary') + button('Từ chối', 'recovery-reject', r.id) : ''}</div></article>`).join('') || note('Hàng chờ khôi phục hiện đang trống.');
  }

  function maintenanceMarkup() {
    return state.maintenance.map((r) => `<div class="role-row"><div><strong>${esc(r.id)} · ${esc(r.target)} · ${esc(r.text)}</strong><small>${esc(r.requestedBy)} · ${time(r.at)}</small>${badge(r.status === 'done' ? 'Đã thực hiện mẫu' : r.status === 'escalated' ? 'Đã chuyển người phát triển' : 'Chờ System Admin xử lý', r.status === 'done' ? 'completed' : r.status === 'escalated' ? 'running' : 'pending')}${r.result ? note(esc(r.result)) : ''}</div>${roles.role() === 'admin_system' && r.status === 'approved' ? button(r.kind === 'developer' ? 'Chuyển người phát triển' : 'Kiểm tra & thực hiện', 'maintain', r.id, 'primary') : ''}</div>`).join('') || note('Chưa có yêu cầu bảo trì.');
  }

  function accountsMarkup() {
    const users = roles.snapshot().users.filter((u) => !u.deleted && (u.name + ' ' + (u.username || '') + ' ' + names[u.role]).toLocaleLowerCase('vi').includes(systemQuery.toLocaleLowerCase('vi')));
    return `<div class="role-toolbar"><input id="governance-user-query" type="search" aria-label="Tìm tài khoản" placeholder="Tìm họ tên, tài khoản, vai trò…" value="${esc(systemQuery)}">${button('+ Cấp tài khoản', 'provision', '', 'primary')}</div>` +
      table(['Tài khoản', 'Vai trò', 'Xác thực / Mật khẩu', 'Trạng thái', 'Thao tác quản trị'], users.map((u) => `<tr>
        <td><strong>${esc(u.name)}</strong><small>${esc(u.username || u.id)}</small></td>
        <td>${esc(names[u.role])}</td>
        <td>${esc(u.authMethod || (ordinary(u.role) ? 'Mật khẩu' : 'Passkey'))}${u.mustChangePassword ? '<small>Mật khẩu tạm · Bắt buộc đổi</small>' : ''}</td>
        <td>${badge(u.active ? 'Hoạt động' : 'Đã khóa', u.active ? 'completed' : 'pending')}</td>
        <td><div class="governance-actions">${u.id !== 'U4' ? button('Đổi vai trò', 'role-request', u.id, 'text-button') + button(u.active ? 'Khóa khẩn cấp' : 'Kích hoạt lại', 'lock', u.id, 'text-button') + button('Cấp lại truy cập', 'reset', u.id, 'text-button') + button('Thu hồi phiên', 'revoke', u.id, 'text-button') : note('Phiên hiện tại · Không tự khóa')}</div></td>
      </tr>`).join('')) +
      note('System Admin trực tiếp cấp tài khoản thường và đổi role thường (Tài xế ↔ Điều phối) kèm nhật ký trước→sau. Cấp/nâng lên role quản trị (Admin / System Admin) phải chờ người công ty chỉ định duyệt — cấm tự nâng quyền.');
  }

  const systemPages = {
    security: ['An ninh & nhật ký', 'alert'],
    health: ['Tổng quan hệ thống', 'activity'],
    accounts: ['Tài khoản & phân quyền', 'layers'],
    changes: ['Cổng duyệt role quản trị & Khôi phục', 'order'],
    maintenance: ['Bảo trì & tác vụ nền', 'gear'],
    connections: ['Kết nối Taris & IMEI', 'pin'],
    data: ['Kiểm tra dữ liệu', 'layers'],
    controls: ['Điều khiển chức năng', 'gear'],
    backup: ['Sao lưu & chẩn đoán', 'order'],
    logs: ['Nhật ký chỉ đọc', 'activity'],
  };

  function system() {
    const page = new URLSearchParams(location.search).get('system_page');
    const current = Object.hasOwn(systemPages, page) ? page : 'health', title = systemPages[current][0];
    $('.role-nav').innerHTML = Object.entries(systemPages).map(([id, [label, ico]]) => `<button data-gov="system-page" data-id="${id}" class="${id === current ? 'active' : ''}" ${id === current ? 'aria-current="page"' : ''} title="${label}">${icon(ico)}<span class="nav-label">${label}</span></button>`).join('');
    const logs = roles.snapshot().system;
    let body = '';
    if (current === 'accounts') {
      body = panel('Tài khoản nội bộ & Phân quyền', accountsMarkup()) + panel('Hàng chờ khôi phục quên tên / mật khẩu (Flow 13)', recoveryMarkup(), 'order');
    } else if (current === 'changes') {
      body = panel('Hàng chờ khôi phục quên tên / mật khẩu', recoveryMarkup(), 'order') + panel('Cổng phê duyệt role quản trị (Admin / System Admin)', changesMarkup(), 'layers');
    } else if (current === 'logs') {
      body = panel('Nhật ký hệ thống chỉ đọc', table(['Thời gian', 'Người thực hiện', 'Nội dung / yêu cầu', 'Trước → Sau', 'Kết quả'], logs.map((l) => `<tr><td>${time(l.at)}</td><td>${esc(l.actor)}</td><td>${esc(l.action)}<small>${esc(l.request)}</small></td><td>${esc(l.before)} → ${esc(l.after)}</td><td>${esc(l.result || 'Ghi nhận lịch sử mẫu')}</td></tr>`).join('')) + note('Không xóa hoặc sửa lịch sử duyệt/nhật ký; không ghi mật khẩu hay mã khôi phục vào log.'));
    } else if (current === 'connections') {
      body = panel('Ghép biển số ↔ IMEI GPS Taris (tối đa 1 lần / 10 phút)', table(['Biển số', 'Loại xe', 'IMEI Taris mẫu', 'Trạng thái GPS', 'Thao tác'], api.snapshot().vehicles.map((v) => `<tr><td><strong>${esc(v.plate)}</strong></td><td>${esc(v.type)}</td><td><code>${esc(v.imei || 'Chưa ghép')}</code></td><td>${badge(v.gps === 'fresh' ? 'Có tín hiệu mẫu' : v.gps === 'stale' ? 'Chưa cập nhật' : 'Mất tín hiệu', v.gps === 'fresh' ? 'completed' : v.gps === 'stale' ? 'pending' : 'neutral')}</td><td>${button('Sửa IMEI', 'edit-imei', v.plate, 'text-button')} · ${button('Kiểm tra API', 'gps', v.plate, 'text-button')}</td></tr>`).join('')) + note('Công ty xác nhận ghép biển số/IMEI với System Admin trước khi chạy thật. Chỉ kiểm tra trạng thái kết nối; không mở vị trí vận hành khi chưa có quyền hỗ trợ.'));
    } else if (current === 'maintenance') {
      body = panel('Yêu cầu bảo trì từ Quản lý vận hành', maintenanceMarkup()) +
        panel('Tác vụ nền', state.jobs.map((j) => `<div class="role-row system-job-row"><div class="system-job-info"><strong>${esc(j.id)} · ${esc(j.name)}</strong>${badge(j.status === 'failed' ? 'Lỗi mẫu' : 'Đã thử lại mẫu', j.status === 'failed' ? 'neutral' : 'completed')}<small>${j.at ? time(j.at) : 'Chưa chạy lại'}</small></div>${j.status === 'failed' ? button('Thử lại tác vụ lỗi', 'retry', j.id, 'primary') : ''}</div>`).join('') + note('Lỗi code, DB hoặc khôi phục toàn hệ thống chuyển người phát triển.')) +
        panel('Cổng cấp quyền hỗ trợ có ghi nhận (Flow 11/12)', state.supportGrants.map((g) => `<div class="role-row"><div><strong>${esc(g.id)} · ${esc(g.scope)}</strong><small>${esc(g.reason)} · ${time(g.at)}</small></div>${badge('Đang ghi nhận', 'completed')}</div>`).join('') + button('+ Ghi nhận phạm vi hỗ trợ', 'support-grant', '', 'secondary') + note('System Admin mặc định chỉ thấy mã/trạng thái lỗi; xem nội dung ticket hoặc vị trí xe phải có ghi nhận phạm vi hỗ trợ.'));
    }
    if (window.FleetManagement && ['health', 'data', 'controls', 'backup'].includes(current)) {
      body = window.FleetManagement.systemContent(current, {
        failedJobs: state.jobs.filter((j) => j.status === 'failed').length,
        totalJobs: state.jobs.length,
        pendingChanges: state.changes.filter((c) => c.status === 'designated').length + state.recovery.filter((r) => r.status === 'pending').length,
        pendingMaintenance: state.maintenance.filter((r) => r.status === 'approved').length,
      });
    }
    if (current === 'security' && window.FleetSecurity) body = window.FleetSecurity.markup();
    $('#role-view').innerHTML = `<section class="page-heading"><div><h1>${title}</h1><p>${current === 'security' ? 'Đối chiếu sự kiện an ninh, lỗi vận hành và bằng chứng (chỉ đọc)' : 'Quản trị hệ thống · Phân quyền, khôi phục mã 1 lần, kết nối Taris & bảo trì'}</p></div><span class="system-page-meta">Dữ liệu mô phỏng · UTC+7</span></section><div class="governance-grid">${body}</div>`;
    if (current === 'security') window.FleetSecurity?.mount();
    $('.crumb').innerHTML = `${icon('home')}<span>/</span>${esc(title.toLocaleUpperCase('vi'))}`;
    document.title = title + ' - Fleet Autopilot';
  }

  function render() {
    if (roles.role() === 'admin_system') system();
    if (roles.role() === 'admin') {
      const maintenancePanel = $('#role-view [data-admin-content=maintenance]');
      if (maintenancePanel) {
        const failedJobs = state.jobs.filter((j) => j.status === 'failed').length;
        const staleCount = api.snapshot().vehicles.filter((v) => v.gps !== 'fresh').length;
        // Admin KHÔNG duyệt đổi vai trò — chỉ gửi yêu cầu bảo trì, xem ảnh hưởng vận hành & nhận thông báo khóa TK khẩn cấp
        maintenancePanel.innerHTML = `<div class="panel-heading"><h2>${icon('gear')}Yêu cầu bảo trì & Thông báo hệ thống</h2></div>
          <h3>Cảnh báo ảnh hưởng vận hành</h3>
          <div class="role-row"><div><strong>Tín hiệu GPS Taris & Tác vụ nền</strong><small>${staleCount} xe chưa cập nhật/mất GPS · ${failedJobs} tác vụ nền lỗi (JOB-017)</small></div>${badge(failedJobs || staleCount ? 'Cần theo dõi' : 'Ổn định', failedJobs || staleCount ? 'pending' : 'completed')}</div>
          <h3>Yêu cầu bảo trì gửi System Admin</h3>
          ${maintenanceMarkup()}
          ${button('+ Tạo yêu cầu bảo trì', 'maintenance-new', '', 'primary')}
          <h3>Thông báo khóa tài khoản khẩn cấp từ System Admin</h3>
          ${state.support.map((n) => `<div class="role-row"><span><strong>${esc(n.id)}</strong> · ${esc(n.text)}<small>${time(n.at)}</small></span></div>`).join('') || note('Chưa có thông báo khóa tài khoản khẩn cấp.')}
          ${note('Quản lý vận hành giám sát toàn công ty & gửi phiếu bảo trì. Quản lý tài khoản và đổi role do System Admin phụ trách.')}`;
      }
      const nav = $('#admin-nav-maintenance');
      if (nav) { nav.title = 'Bảo trì & Cảnh báo'; nav.querySelector('.nav-label').textContent = nav.title; }
      const overview = $('#role-view [data-admin-content=overview]');
      if (overview && !$('#admin-map-shortcut')) overview.insertAdjacentHTML('beforeend', '<div id="admin-map-shortcut" class="workflow-inline-actions"><button class="secondary" data-workflow-action="admin-page" data-id="fleet">Xem bản đồ xe & tài xế</button></div>');
    }
  }

  // System Admin đổi vai trò: role thường thực hiện trực tiếp + ghi log; role quản trị chuyển cổng duyệt riêng (cấm tự duyệt)
  function requestRole(u) {
    modal('Đổi vai trò tài khoản · ' + u.name,
      `<form class="role-form">
        ${details([['Tài khoản', `${u.name} (${u.username || u.id})`], ['Vai trò hiện tại', names[u.role]]])}
        <label>Vai trò mới<select name="role">${Object.entries(names).filter(([r]) => r !== u.role).map(([r, n]) => `<option value="${r}">${n}${ordinary(r) ? ' (System Admin thực hiện trực tiếp)' : ' (Cần người công ty chỉ định duyệt)'}</option>`).join('')}</select></label>
        ${field('Lý do thay đổi (bắt buộc ghi nhật ký)', 'reason')}
        ${note('Đổi giữa Tài xế ↔ Điều phối được System Admin thực hiện ngay kèm audit log trước→sau. Nâng lên Admin / System Admin bắt buộc chờ người công ty chỉ định duyệt (cấm tự nâng quyền).')}
        <button class="primary">Xác nhận đổi vai trò</button>
      </form>`,
      (f) => {
        const after = f.get('role'), reason = String(f.get('reason') || '').trim();
        if (!names[after] || after === u.role || !reason || u.id === 'U4') return false;
        const before = u.role;
        if (ordinary(after) && ordinary(before)) {
          u.role = after;
          roles.save();
          log('Đổi vai trò thường (trực tiếp)', names[before], names[after] + ' · ' + reason, u.id);
          api.toast(`Đã đổi vai trò ${u.name}: ${names[before]} → ${names[after]}.`);
        } else {
          const c = { id: uid('Q'), userId: u.id, name: u.name, before, after, reason, requestedBy: actors.admin_system, at: now(), status: 'designated', result: 'Chờ người công ty chỉ định duyệt (cấm tự nâng/đổi role quản trị).' };
          state.changes.unshift(c);
          save();
          log('Đề nghị đổi role quản trị (chờ chỉ định duyệt)', names[before], names[after], c.id, { requestedBy: c.requestedBy });
          api.toast('Đã chuyển sang cổng chờ người công ty chỉ định duyệt (cấm tự duyệt role quản trị).');
        }
      }
    );
  }

  function provision() {
    modal('Cấp tài khoản nội bộ',
      `<form class="role-form">
        ${field('Họ tên người nhận', 'name')}
        ${field('Tên đăng nhập', 'username')}
        <label>Vai trò<select name="role"><option value="driver">Tài xế (Tài khoản + Mật khẩu)</option><option value="dispatch">Điều phối (Tài khoản + Mật khẩu)</option></select></label>
        ${field('Ghi chú bàn giao', 'reason')}
        <p class="form-error" id="governance-error" hidden></p>
        ${note('Cấp tài khoản thường không cần Admin duyệt. Tài khoản quản trị (Admin/System Admin) cần người công ty chỉ định duyệt riêng và bắt buộc Passkey.')}
        <button class="primary">Cấp tài khoản & mật khẩu tạm</button>
      </form>`,
      (f, form) => {
        const name = String(f.get('name')).trim(), username = String(f.get('username')).trim(), r = f.get('role');
        if (!name || !username || !ordinary(r)) return false;
        const data = roles.snapshot();
        if (data.users.some((u) => u.username?.toLowerCase() === username.toLowerCase())) {
          form.querySelector('#governance-error').hidden = false;
          form.querySelector('#governance-error').textContent = 'Tên đăng nhập đã tồn tại.';
          return false;
        }
        data.users.push({ id: uid('U'), name, username, role: r, authMethod: 'Mật khẩu', active: true, mustChangePassword: true });
        roles.save();
        log('Cấp tài khoản thường', 'Chưa có', `${name} (${username}) · ${names[r]}`);
        const password = 'Tmp-' + crypto.randomUUID().slice(0, 10);
        setTimeout(() => modal('Thông tin bàn giao — chỉ xem 1 lần', details([['Người nhận', name], ['Tài khoản', username], ['Trạng thái', 'Mật khẩu tạm · Bắt buộc đổi lần đầu']]) + `<code class="temporary-credential">${esc(password)}</code>` + note('Mật khẩu tạm không lưu trong nhật ký hay localStorage.')), 0);
      }
    );
  }

  function resolveRecovery(id, approve) {
    const req = state.recovery.find((r) => r.id === id);
    if (!req || req.status !== 'pending') return;
    if (!approve) {
      confirm('Từ chối yêu cầu khôi phục ' + req.id, details([['Đối tượng', req.target], ['Loại', req.kind === 'username' ? 'Quên tên tài khoản' : 'Quên mật khẩu']]), (f) => {
        req.status = 'rejected';
        req.result = 'Chưa đủ căn cứ xác minh · ' + String(f.get('reason')).trim();
        save();
        log('Từ chối khôi phục TK/MK', req.target, req.result, req.id);
      });
      return;
    }
    confirm(
      req.kind === 'username' ? 'Xác minh & bàn giao tên tài khoản' : 'Xác minh & cấp mã khôi phục 1 lần',
      details([['Mã yêu cầu', req.id], ['Đối tượng', req.target], ['Nguồn gửi', req.submittedBy]]) +
        `<label class="workflow-check"><input type="checkbox" name="verified" required>Đã xác minh đúng người (gặp trực tiếp hoặc gọi số trong hồ sơ)</label>` +
        note(req.kind === 'username' ? 'Chỉ bàn giao lại tên tài khoản sau khi xác minh; không bắt buộc đặt lại mật khẩu.' : 'Mã 1 lần có thời hạn, giới hạn thử; đổi mật khẩu thành công tự thu hồi phiên cũ, không đổi role hay bỏ Passkey.'),
      (f) => {
        if (!f.has('verified')) return false;
        req.status = 'done';
        if (req.kind === 'username') {
          req.result = 'Đã xác minh & bàn giao tên tài khoản · ' + String(f.get('reason')).trim();
          save();
          log('Xác minh & bàn giao tên tài khoản', req.target, 'Hoàn tất (không đổi MK)', req.id);
        } else {
          const code = 'REC-' + Math.floor(100000 + Math.random() * 900000);
          req.result = 'Đã xác minh & cấp mã 1 lần có hạn (không lưu mã vào log) · ' + String(f.get('reason')).trim();
          save();
          log('Cấp mã khôi phục 1 lần', req.target, 'Đã duyệt & cấp mã (không ghi mã)', req.id);
          setTimeout(() => modal('Mã khôi phục 1 lần — chỉ xem 1 lần', details([['Yêu cầu', req.id], ['Người nhận', req.target]]) + `<code class="temporary-credential">${code}</code>` + note('Bàn giao trực tiếp cho đúng người đã xác minh. Mã tự hủy khi dùng hoặc cấp lại.')), 0);
        }
      }
    );
  }

  function submitRecovery({ kind = 'password', target, submittedBy, note: n }) {
    const req = { id: 'KP-' + String(state.recovery.length + 1).padStart(3, '0'), kind, target, submittedBy, note: n, at: now(), status: 'pending', result: '' };
    state.recovery.unshift(req);
    save();
    return req;
  }

  function editImei(plate) {
    const v = api.snapshot().vehicles.find((x) => x.plate === plate);
    if (!v) return;
    modal('Ghép biển số ↔ IMEI Taris · ' + v.plate,
      `<form class="role-form">${details([['Biển số', v.plate], ['Loại xe', v.type]])}${field('Mã thiết bị IMEI Taris', 'imei', v.imei || '')}${field('Lý do / căn cứ xác nhận từ công ty', 'reason')}<button class="primary">Lưu ánh xạ IMEI mẫu</button></form>`,
      (f) => {
        const before = v.imei || 'Chưa ghép', after = String(f.get('imei')).trim();
        if (!after) return false;
        v.imei = after;
        api.commit('Cập nhật IMEI Taris ' + v.plate, `${before} → ${after}`, actors.admin_system);
        log('Ghép biển số ↔ IMEI Taris', `${v.plate}: ${before}`, `${v.plate}: ${after}`, v.plate);
      }
    );
  }

  function openSupportGrant() {
    modal('Ghi nhận cấp quyền hỗ trợ (Flow 11/12)',
      `<form class="role-form">
        <label>Phạm vi dữ liệu hỗ trợ<select name="scope"><option value="Xem nội dung ticket sự cố liên quan lỗi">Xem nội dung ticket sự cố liên quan lỗi</option><option value="Xem vị trí GPS xe để đối chiếu lỗi Taris">Xem vị trí GPS xe để đối chiếu lỗi Taris</option></select></label>
        ${field('Mã phiếu / lý do hỗ trợ', 'reason')}
        ${note('Mọi lần mở rộng quyền hỗ trợ đều ghi nhật ký người thực hiện, phạm vi và thời điểm.')}
        <button class="primary">Ghi nhận phạm vi hỗ trợ</button>
      </form>`,
      (f) => {
        const g = { id: 'HT-' + String(state.supportGrants.length + 1).padStart(3, '0'), scope: f.get('scope'), reason: String(f.get('reason')).trim(), grantedBy: actors.admin_system, at: now(), status: 'active' };
        state.supportGrants.unshift(g);
        save();
        log('Cấp quyền hỗ trợ có ghi nhận', 'Mặc định kỹ thuật', g.scope, g.id);
      }
    );
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-gov],[data-role-action],[data-workflow-action]');
    if (!b) return;
    const r = roles.role(), old = b.dataset.roleAction, flow = b.dataset.workflowAction;
    if (r === 'admin_system' && ((old && ['user-new', 'user-edit', 'user-toggle', 'user-delete', 'user-restore', 'request-process', 'roles-info'].includes(old)) || flow === 'provision')) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (old === 'user-new' || flow === 'provision') provision();
      else api.toast('Dùng thao tác quản trị có phạm vi trên trang hiện tại.');
      return;
    }
    const action = b.dataset.gov, id = b.dataset.id;
    if (!action) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (!['admin', 'admin_system'].includes(r)) return;
    const u = roles.snapshot().users.find((x) => x.id === id);

    if (action === 'system-page' && r === 'admin_system' && systemPages[id]) {
      const url = new URL(location.href);
      url.searchParams.set('system_page', id);
      url.searchParams.delete('flow');
      history.pushState(null, '', url);
      roles.render();
      window.scrollTo(0, 0);
      $('#main').focus({ preventScroll: true });
    }
    if (action === 'provision' && r === 'admin_system') provision();
    if (action === 'role-request' && r === 'admin_system' && u && u.id !== 'U4') requestRole(u);
    if (action === 'recovery-approve' && r === 'admin_system') resolveRecovery(id, true);
    if (action === 'recovery-reject' && r === 'admin_system') resolveRecovery(id, false);
    if (action === 'edit-imei' && r === 'admin_system') editImei(id);
    if (action === 'support-grant' && r === 'admin_system') openSupportGrant();
    if (['lock', 'reset', 'revoke'].includes(action) && r === 'admin_system' && u && u.id !== 'U4') {
      confirm(action === 'lock' ? (u.active ? 'Khóa khẩn cấp tài khoản' : 'Kích hoạt tài khoản') : action === 'reset' ? 'Cấp lại quyền truy cập' : 'Thu hồi phiên',
        details([['Tài khoản', u.name], ['Vai trò', names[u.role]]]) + note(action === 'lock' ? 'Khóa khẩn cấp ghi lý do, giữ nguyên lịch sử và gửi thông báo ngay cho Quản lý vận hành (Admin).' : 'Không cần Admin duyệt. Chỉ mô phỏng, chưa tác động phiên thật.'),
        (f) => {
          const before = u.active ? 'Hoạt động' : 'Đã khóa';
          if (action === 'lock') u.active = !u.active;
          if (action === 'reset') u.mustChangePassword = true;
          roles.save();
          log(action === 'lock' ? 'Khóa / mở khóa khẩn cấp tài khoản' : action === 'reset' ? 'Cấp lại quyền truy cập' : 'Thu hồi phiên', before, action === 'lock' ? (u.active ? 'Hoạt động' : 'Đã khóa') : 'Đã ghi nhận · ' + String(f.get('reason')).trim(), u.id);
          if (action === 'lock') {
            state.support.unshift({ id: uid('TB'), text: `${u.name} (${names[u.role]}) · ${u.active ? 'Đã kích hoạt lại' : 'ĐÃ KHÓA KHẨN CẤP'} · Lý do: ${String(f.get('reason')).trim()}`, at: now() });
            save();
          }
          api.toast('Đã ghi nhận thao tác quản trị mẫu.');
        }
      );
    }
    if (action === 'maintenance-new' && r === 'admin') {
      modal('Tạo yêu cầu bảo trì gửi System Admin',
        `<form class="role-form"><label>Loại hỗ trợ kỹ thuật<select name="kind"><option value="gps">Kiểm tra kết nối GPS Taris</option><option value="retry">Thử lại tác vụ nền lỗi</option><option value="developer">Chuyển lỗi code/DB đến người phát triển</option></select></label>${field('Đối tượng (biển số / mã tác vụ)', 'target')}${field('Nội dung và ảnh hưởng vận hành', 'text')}<button class="primary">Gửi sang System Admin</button></form>`,
        (f) => {
          const kind = f.get('kind'), target = String(f.get('target')).trim(), text = String(f.get('text')).trim();
          if (!['gps', 'retry', 'developer'].includes(kind) || !target || !text) return false;
          const req = { id: 'BT-' + String(state.maintenance.length + 1).padStart(3, '0'), kind, target, text, requestedBy: actors.admin, approvedBy: actors.admin, at: now(), status: 'approved', result: '' };
          state.maintenance.unshift(req);
          save();
          log('Yêu cầu bảo trì từ Admin', 'Mới', `${target} · ${text}`, req.id);
          api.toast('Đã gửi yêu cầu bảo trì sang System Admin.');
        }
      );
    }
    if (action === 'maintain' && r === 'admin_system') {
      const req = state.maintenance.find((x) => x.id === id);
      if (req?.status === 'approved') {
        confirm('Xử lý yêu cầu bảo trì ' + req.id, details([['Đối tượng', req.target], ['Nội dung', req.text], ['Người gửi', req.requestedBy]]) + note('Chỉ thực hiện trong phạm vi kỹ thuật; lỗi code/DB chuyển người phát triển.'), (f) => {
          if (req.kind === 'retry') { const job = state.jobs.find((j) => j.id === req.target); if (job) { job.status = 'retried'; job.at = now(); job.attempts++; } }
          req.status = req.kind === 'developer' ? 'escalated' : 'done';
          req.executedBy = actors.admin_system;
          req.executedAt = now();
          req.result = (req.kind === 'developer' ? 'Đã chuyển người phát triển (mẫu)' : 'Đã thực hiện kiểm tra mẫu') + ' · ' + String(f.get('reason')).trim();
          save();
          log('Thực hiện bảo trì', req.target, req.result, req.id);
        });
      }
    }
    if (action === 'gps' && r === 'admin_system') {
      const v = api.snapshot().vehicles.find((x) => x.plate === id);
      if (v) {
        log('Kiểm tra kết nối GPS Taris mẫu', v.plate, v.gps);
        modal('Kết nối GPS Taris · ' + v.plate, details([['Xe', v.plate], ['IMEI mẫu', v.imei || 'Chưa ghép'], ['Tín hiệu mẫu', v.gps], ['Chu kỳ đồng bộ', 'Tối đa 1 lần / 10 phút (tránh 429)'], ['Cập nhật lần cuối', time(v.updated)]]) + note('Không gọi API thật và không mở vị trí vận hành khi chưa có quyền hỗ trợ.'));
      }
    }
    if (action === 'retry' && r === 'admin_system') {
      const job = state.jobs.find((j) => j.id === id);
      if (job?.status === 'failed') {
        confirm('Thử lại tác vụ lỗi ' + job.id, details([['Tác vụ', job.name], ['Mã', job.id]]) + note('Chỉ cho thử lại tác vụ đang lỗi có ghi nhật ký; lỗi code/DB chuyển người phát triển.'), () => {
          job.status = 'retried';
          job.at = now();
          job.attempts++;
          save();
          log('Thử lại tác vụ mẫu', 'Lỗi mẫu', job.id + ' · Đã thử lại mẫu', job.id);
        });
      }
    }
  }, true);

  document.addEventListener('input', (e) => {
    if (e.target.id === 'governance-user-query') {
      systemQuery = e.target.value;
      const pos = e.target.selectionStart;
      system();
      const input = $('#governance-user-query');
      input.focus();
      input.setSelectionRange(pos, pos);
    }
  });
  window.addEventListener('fleet:role-render', render);
  window.addEventListener('fleet:reset', () => { state = seed(); save(); render(); });

  window.FleetGovernance = { snapshot: () => state, save, submitRecovery, resolveRecovery, requestRole, provision, editImei, openSupportGrant, log };
  render();
})();
