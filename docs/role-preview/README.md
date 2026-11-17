# Bản thử bốn vai trò — 17/11/2026

Người dùng đã chốt ảnh Admin, admin_system và Tài xế rồi yêu cầu cập nhật UI thử nghiệm. Các trang mới dùng nguyên CSS nền/kính/font của bộ chuẩn ngày 16/11, không thay thế bộ ảnh chuẩn cũ.

Chọn **Vai trò mẫu** ở thanh đầu trang hoặc dùng URL:

| Vai trò | URL tương đối | Nền |
| --- | --- | --- |
| Điều phối | `?role=dispatch&theme=amber` | Sáng, Tối, Đen hổ phách, Rêu Lime |
| Admin | `?role=admin&theme=amber` | Cả bốn nền |
| admin_system | `?role=admin_system&theme=amber` | Cả bốn nền |
| Tài xế | `?role=driver&theme=light` | Chỉ Sáng / Tối |

Admin xem dữ liệu vận chuyển dùng chung, lọc/xem nhật ký và tạo yêu cầu bảo trì mẫu. admin_system thêm/sửa vai trò tài khoản, vô hiệu hóa, xóa mềm/khôi phục có lý do và xử lý yêu cầu. Nhật ký không có nút xóa.

Tài xế xem chuyến đang chạy trong dữ liệu dùng chung, phóng to sơ đồ tuyến mẫu, chọn/chụp ảnh, mô phỏng GPS và lưu metadata mẫu; báo sự cố Xe/Đường. Không gọi GPS thật hoặc tải ảnh lên máy chủ. Ảnh chọn chỉ được xem trong phiên, tên ảnh và metadata được lưu trong trình duyệt. Bộ chuyển vai trò là công cụ xem UI, không phải đăng nhập hay thực thi quyền backend.

Dữ liệu vai trò lưu với khóa `fleet-autopilot-roles-v1`; dữ liệu Điều phối tiếp tục dùng `fleet-autopilot-workspace-v2`. Nhật ký phê duyệt khởi tạo là dữ liệu minh họa; các thao tác Điều phối tiếp theo được ghi bổ sung khi dùng cùng phiên.

Ảnh chụp từ giao diện thực và kết quả 56 tổ hợp vai trò/nền/kích thước nằm trong `2026-11-17/`. Đã kiểm tra yêu cầu bảo trì, tạo/xóa mềm/khôi phục tài khoản, báo sự cố, ảnh/metadata, giới hạn nền tài xế, Back và tải lại trang. Không tràn ngang hoặc lỗi JavaScript trong các trường hợp đã kiểm tra.

Vẫn là preview, `finalApproved: false`. Chưa kết nối backend, bản đồ, GPS hoặc AI thật.
