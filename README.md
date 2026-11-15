# Fleet Autopilot — UI thử nghiệm

Trạng thái: **chưa chốt, chưa đưa vào Final**. Bản UI nội bộ có đủ bảy trang trong menu, dùng chung dữ liệu mẫu và bốn nền đã duyệt.

## Các trang

| Trang | Thao tác trong bản thử |
| --- | --- |
| Tổng quan | Số liệu từ dữ liệu mẫu, đơn cần theo dõi, cảnh báo và lịch sử hoạt động. |
| Đơn hàng | Tạo/sửa đơn chờ, tìm không dấu, lọc trạng thái/ngày, chi tiết, hủy mẫu và xuất CSV. |
| Điều phối | Chọn đơn, chọn xe mẫu, duyệt phân công, bắt đầu và hoàn thành chuyến mẫu. |
| Xe & tài xế | Hai danh sách liên kết, thêm/sửa, lọc, xuất đúng CSV từng danh sách. |
| GPS | Sơ đồ vị trí mẫu, chọn xe, lọc tín hiệu, zoom và cập nhật mô phỏng. |
| Báo cáo | Khoảng ngày, số đơn, khối lượng đã giao, tỷ lệ hoàn thành, biểu đồ và CSV. |
| Cài đặt | Tên hiển thị, nền, toast, chuyển động, tải JSON và khôi phục mẫu có xác nhận. |

Chạy từ `D:/projectcar/prompt`:

```powershell
node .10k/tools/preview.mjs UI --port 8083
```

Mở http://127.0.0.1:8083/?page=overview. Các khóa trang: `overview`, `orders`, `dispatch`, `fleet`, `gps`, `reports`, `settings`. Trang mặc định khi không có `page` vẫn là Điều phối. URL và nút Back/Forward đồng bộ với trang/nền.

## Bốn nền

**Sáng · Tối · Đen hổ phách · Rêu Lime**, tương ứng `?theme=light`, `dark`, `amber`, `moss`. Có thể kết hợp `?page=orders&theme=moss`. Lựa chọn nền được nhớ trên trình duyệt; điện thoại dùng danh sách chọn gọn.

Bốn nền giữ lớp kính trong mờ, nền chuyển sắc phía sau và UI phủ sát mép trang. Menu máy tính thu gọn còn icon, mở khi hover hoặc có tiêu điểm bàn phím; thiết bị cảm ứng giữ tên mục. Có chế độ giảm chuyển động/giảm trong suốt.

## Dữ liệu và luồng thử

Bộ mẫu ban đầu có **5 đơn, 6 xe, 6 tài xế**, ngày minh họa 15–16/11/2026. Số liệu được tính từ dữ liệu này, không dùng các tổng giả riêng ở từng trang. Có thể thử:

1. Tạo đơn trong Đơn hàng, nhập vật liệu, lượng tính bằng tấn và hành trình.
2. Bấm Phân xe, chọn phương án xe mẫu và Duyệt phân công.
3. Mở Xem phân công để bắt đầu rồi hoàn thành chuyến mẫu.
4. Xem thay đổi ở Tổng quan, đội xe và Báo cáo; tải CSV nếu cần.

Dữ liệu lưu ở localStorage (`fleet-autopilot-workspace-v2`), chỉ trên trình duyệt này. Có kiểm tra trường bắt buộc, lượng dương, biển số trùng và thông báo lỗi ngay trong form, kể cả khi tắt toast. Xe có đơn đang thực hiện giữ nguyên tài xế, tải trọng và tình trạng trong bản thử để tránh dữ liệu không nhất quán.

Đây là **UI thử nghiệm**, chưa có backend, AI, bản đồ/GPS thật, đăng nhập hoặc phân quyền. Danh tính, vị trí, ETA, cảnh báo, trạng thái và quy tắc thao tác đều là ví dụ để thử UI. Báo cáo chỉ tổng hợp vận chuyển; chưa đưa giá cước, công nợ hoặc quyền nghiệp vụ chưa chốt vào đây. Sơ đồ không phải bản đồ thực tế. Thao tác không gửi thông báo tới tài xế hoặc tạo chuyến thực.

## Quy tắc Final

**Chỉ cập nhật/chuyển vào Final khi người dùng nói rõ “đưa vào phần final” hoặc yêu cầu tương đương.** Việc dùng thử, duyệt màu hoặc yêu cầu hoàn thiện các trang UI không phải phê duyệt Final. Hiện không tạo hay thay đổi phần Final.

## Tệp chính và kiểm tra

- `index.html`: khung chung, màn Điều phối, template duyệt và dialog.
- `workspace.js`: dữ liệu chung, router và thao tác của bảy trang. Đây là script ứng dụng đang được nạp.
- `workspace.css`: bố cục các trang quản lý và form.
- `styles.css`, `amber.css`, `moss.css`, `translucent.css`: bố cục và bốn nền đã duyệt.
- `theme.js`: chọn nền, URL, lưu lựa chọn và Back/Forward.
- `assignment.css`: hộp Duyệt phân công.
- `assets/fonts/`: Be Vietnam Pro tự lưu trữ, giấy phép OFL.

Bản Điều phối cũ trước khi mở rộng được lưu ở `review/UI/pre-workspace/`.

Kiểm tra thao tác chính: `node .10k/tools/workspace-review.mjs`. Đã kiểm tra luồng tạo/sửa/phân công/bắt đầu/hoàn thành, báo cáo, CSV, xe/tài xế, GPS mô phỏng, cài đặt, lưu/reset và lỗi dữ liệu lưu. Bố cục đã kiểm tra bảy trang × bốn nền × bảy chiều rộng 320–1600px; ảnh tại `review/UI/workspace/`. Không cần build hoặc thư viện ngoài khi chạy UI.
