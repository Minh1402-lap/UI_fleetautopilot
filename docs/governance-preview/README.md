# Bản thử phân quyền và bản đồ đội xe — 17/11/2026

Nguồn yêu cầu: PROJECT_CONTEXT.md và draw.io 12 trang, đặc biệt trang 11–12; người dùng đồng ý áp dụng và thêm xe/tài xế trên bản đồ Admin.

- Admin: `?role=admin&theme=amber&admin_page=fleet`. Marker hiển thị biển số và tên tài xế; chọn marker/danh sách xem chuyến và thời điểm vị trí. Vị trí minh họa, chưa kết nối Taris/Maps; vị trí xe không phải định vị điện thoại tài xế.
- Phê duyệt: `?role=admin&theme=amber&admin_page=maintenance`.
- Quản trị: `?role=admin_system&theme=amber&system_page=accounts`. Các trang `changes`, `maintenance`, `logs` hỗ trợ URL/Back/Forward/reload.
- Cấp tài khoản thường không thêm bước duyệt. Đổi role cần Admin duyệt rồi admin_system thực hiện; cấp quyền quản trị chờ người công ty chỉ định, chưa cấu hình.
- Mật khẩu cấp tài khoản chỉ xem một lần, không ghi localStorage/log. Đặt lại truy cập và thu hồi phiên chỉ ghi nhận mô phỏng, không tác động mật khẩu/phiên thật.
- Khóa tài khoản ghi lý do và thông báo Admin; không xóa log/hồ sơ. Nhật ký chứa trước/sau/người yêu cầu/duyệt/thực hiện và kết quả khi áp dụng.
- Hỗ trợ GPS chỉ trạng thái kết nối. Job lỗi được chạy lại mẫu một lần; kiểm tra đối tượng/trạng thái trước thực hiện. Yêu cầu cũ vẫn giữ trong phần tham chiếu.
- Bước xem thử MFA cho hai role quản trị; kênh MFA chưa chốt. Bản thử không xác thực hoặc tạo phiên thật.

Chạy từ thư mục dự án: `node .10k/tools/governance-review.mjs`. Nếu môi trường chặn khởi chạy Edge, có thể chạy cùng script bằng runtime Node có quyền mở trình duyệt. Script mở browser/profile riêng và server loopback tạm, đóng khi hoàn tất.

Kết quả và ảnh: `2026-11-17/checks.json`, `admin-fleet-amber.png`, `admin-fleet-mobile.png`, `system-accounts-amber.png`. Kiểm tra 84 tổ hợp trang/nền/kích thước 320/820/1600px, các luồng duyệt/thực hiện/khóa/bảo trì/MFA và điều hướng; đây là kiểm tra bản UI mẫu, không phải phân quyền backend hay iPad/Safari thật.

Giữ chuẩn giao diện 16/11 và status badge 17/11. Chưa push GitHub/Final.
