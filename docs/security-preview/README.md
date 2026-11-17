# An ninh & nhật ký — UI thử nghiệm

Mở `/?role=admin_system&system_page=security` trên máy chủ preview của thư mục UI.

Trang dùng 8 nhóm sự kiện cố định, có bộ lọc, xem bằng chứng và ghi chú rà soát trong phiên trình duyệt. Không có backend thu thập log hoặc cơ chế chặn tấn công thật.

Kiểm tra logic: `node .10k/tools/security-data-check.mjs`.

Kiểm tra browser: `node .10k/tools/security-review.mjs`. Lần chạy 18/11/2026 không khởi chạy được Edge do lỗi crashpad pipe; chưa xác nhận trực quan hoặc responsive. Kết quả logic được ghi trong thư mục ngày tương ứng.
