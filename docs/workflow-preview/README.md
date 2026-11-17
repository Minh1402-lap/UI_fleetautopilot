# UI theo workflow — 17/11/2026

Nguồn: `PROJECT_CONTEXT.md`, bản flow `review/workflow-2026-11-17/workflow-model.json` và file draw.io do người dùng chỉ định: https://drive.google.com/file/d/1do2lRaI9rpxciXw-swtDNvcmqetJ-55u/view . Giữ nguyên font, màu, nền, viền, độ trong và phản sáng theo `UI_STANDARD.md`.

## Nội dung đã thay đổi

| Vai trò | Luồng xem thử |
| --- | --- |
| Điều phối | Tiếp nhận đơn từ Sale qua kênh ngoài; đối chiếu tuyến/số chuyến tháng khi phân xe; tiếp nhận ticket và trao đổi; kiểm tra bằng chứng; xử lý ngoại lệ có lý do. |
| Tài xế | Nhận/từ chối chuyến, xác nhận lượng lấy, gửi bằng chứng ảnh/GPS mẫu; báo sự cố mở ticket sau khi gửi thành công; đọc hồ sơ sau đóng. |
| Admin | Giám sát vận hành và nhật ký dùng chung; xem bản đồ/vị trí xe, hoạt động Điều phối và ticket/hội thoại ở chế độ chỉ đọc; yêu cầu bảo trì. |
| admin_system | Cấp tên đăng nhập/vai trò và hiển thị mật khẩu ban đầu mẫu một lần; không lưu mật khẩu vào localStorage/nhật ký. |

Biểu tượng Đăng nhập trên thanh đầu trang mở màn hình xem thử đăng nhập/đổi mật khẩu. Không xác thực hoặc lưu mật khẩu thật. Chỉ nhập dữ liệu thử.

## Quyết định và giới hạn

- Đã xác nhận trong lượt này: **Điều phối đóng ticket**, ghi kết quả; Tài xế trao đổi và đọc hồ sơ. Hội thoại không bị xóa khi đóng. Chưa làm mở lại/tự xóa theo lịch.
- Bổ sung quyền Admin theo yêu cầu sau đó: xem đội xe trên bản đồ, nhật ký hoạt động Điều phối, ticket đang mở/đã đóng và hội thoại. Admin không gửi tin hoặc đóng ticket. Báo sự cố dùng hai radio Xe/Đường, không dùng popup native bị lỗi tương phản.
- Không ghép đơn; chưa thiết kế chia đơn thành nhiều chuyến.
- Số chuyến hoàn thành trong tháng chỉ là thống kê tham khảo, chưa phải điểm công bằng hoặc thuật toán chia việc được chốt.
- Nhận/từ chối, lượng thực nhận, duyệt hoàn thành và xử lý ngoại lệ được đưa vào **luồng đề xuất** theo sơ đồ. Chưa chốt thời hạn phản hồi, ngưỡng bằng chứng và toàn bộ quyền.
- Duyệt hoàn thành không tự coi xe về công ty. Xe chờ xác nhận sẵn sàng nếu Điều phối chưa xác nhận; xem mục Báo cáo để xác nhận xe mẫu.
- Ticket đóng không tự đổi trạng thái chuyến/xe; hội thoại đóng chỉ đọc.
- Thao tác vẫn chạy cục bộ; chưa có API, DB, gửi thông báo, chat realtime, giữ lịch nguyên tử, GPS, Maps, AI, kiểm tra upload hoặc phiên đăng nhập thật. Không coi menu chọn vai trò là bảo mật.
- Ảnh chỉ giữ tên/metadata trong trình duyệt và preview phiên hiện tại; chưa truyền tệp lên máy chủ.

Ticket mẫu lưu ở `fleet-autopilot-workflow-v1`. Khôi phục dữ liệu mẫu xóa bộ ticket mẫu sau bước xác nhận hiện có. Các báo cáo sự cố một chiều tạo ở bản cũ không tự chuyển sang ticket; người dùng có thể tạo report mới để thử luồng mới.

## Kiểm tra

Ảnh và `checks.json` trong `2026-11-17/`. Đã kiểm tra 56 tổ hợp nền/vai trò/kích thước 320, 390, 1024, 1600px; không tràn ngang hoặc lỗi JavaScript. Các luồng đã thử: tạo ticket một lần, trao đổi hai vai trò, nội dung được hiển thị dưới dạng văn bản, đóng và reload chỉ đọc, độc lập với chuyến, lấy hàng/gửi bằng chứng/duyệt, từ chối/phân lại/nhận, chờ/tiếp tục khi có ngoại lệ, cấp tài khoản không lưu mật khẩu mẫu và đổi mật khẩu thử có kiểm tra nhập lại.

Các kiểm tra trên chỉ xác nhận UI prototype, không phải kiểm thử bảo mật backend hoặc nghiệm thu nghiệp vụ. Trạng thái vẫn `preview`, chưa chuyển Final.
