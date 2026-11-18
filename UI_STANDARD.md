# UI chuẩn Fleet Autopilot

### Chốt kiểu chữ tròn theo ảnh thử — 18/11/2026

Người dùng đã chốt ảnh thử kiểu chữ tròn, rộng và nét đều sau bản Manrope. Font thật dùng để triển khai là **Quicksand** (upright variable 300–700), tự lưu trữ ba tập ký tự Vietnamese / Latin Extended / Latin cùng giấy phép OFL. Quicksand được chọn để thể hiện hướng chữ của ảnh mô phỏng; không khẳng định đây là font chính xác trong ảnh tham chiếu. Quyết định này thay Manrope trong toàn UI; giữ bố cục, nút, lớp kính, bốn nền, thẻ số liệu chuẩn Điều phối và cảnh báo theo trạng thái.

### Lịch sử: Manrope toàn UI, bỏ hai kiểu Terminal — 18/11/2026

Người dùng đã chốt bản UI này và yêu cầu đẩy lên Git ngày 18/11/2026. Tiêu đề, nội dung, nút, bảng và số liệu toàn UI dùng Manrope chữ đứng, tự lưu trữ đủ dấu tiếng Việt. System Admin chỉ giữ giao diện chuẩn dùng bốn nền chung của Điều phối; bỏ bản Terminal Kali / Hacker và bộ chọn phiên bản. Lựa chọn lưu và URL Terminal cũ được dọn, không thay đổi dữ liệu nghiệp vụ. Quyết định này thay mục hai phiên bản bên dưới; vẫn là UI thử nghiệm, chưa chuyển sản phẩm sang Final.

Thẻ số liệu System Admin dùng chính `.stats > .stat` và ô biểu tượng của Điều phối, không dùng thẻ riêng cao có dòng phụ. Khối Cần xử lý chỉ nhấn theo trạng thái dữ liệu mẫu: đỏ khi có tác vụ lỗi, vàng khi có yêu cầu quyền/bảo trì chờ, trung tính khi không có việc chờ; chữ và chấm màu cùng thể hiện trạng thái. Không thêm nhấp nháy. Các nút giữ hệ thống nút chung; số liệu và đích điều hướng không đổi. Chạy local bằng `npm run dev` tại thư mục UI, không cần cài thư viện.

### Lịch sử Admin System: hai phiên bản — 18/11/2026

Quyết định mới nhất của người dùng: Admin System chọn **Chuẩn / Terminal**. Chuẩn kế thừa bốn nền, font, kính và menu chung; Terminal có hai kiểu Kali / Hacker xanh. Bộ chọn lưu riêng `fleet-system-view-v1`, URL `system_version`/`terminal_style`. Đây là bản thử local đang kiểm chứng, chưa Final. Quyết định này thay quy định cũ “Admin System chỉ có nền Security riêng và ẩn bộ chọn nền” trong lịch sử dưới đây; quy định ẩn bộ chọn nền chỉ còn áp dụng bản Terminal. Xem mục đầu `PROJECT_CONTEXT.md` để biết file đã sửa, kiểm tra đã qua và việc chưa hoàn tất.

### Bộ chọn nền trên màn hình nhỏ — 18/11/2026

Menu chọn nền dùng HTML với nền đặc và màu chữ theo theme; lựa chọn có dấu chọn, hỗ trợ bàn phím và vùng bấm tối thiểu 44px. Không hiển thị popup select native vì ảnh phản hồi cho thấy nền trắng/chữ sáng khó đọc. Giữ cầu nối `#theme-select` ẩn cho luồng đổi nền/animation hiện hành; Tài xế chỉ Sáng/Tối, Admin System dùng theme riêng và ẩn bộ chọn. Desktop giữ nhóm nút chọn nền hiện có. Thay thế ghi chú trước đây về việc giữ native popup.

Kho chuẩn: [Minh1402-lap/UI_fleetautopilot](https://github.com/Minh1402-lap/UI_fleetautopilot).

Xem trực tiếp: [Fleet Autopilot](https://minh1402-lap.github.io/UI_fleetautopilot/).

Ngày chốt: **16/11/2026**. Người dùng yêu cầu tổng hợp bốn nền, lưu ảnh làm UI chuẩn và dựa vào chuẩn này khi phát triển các trang tiếp theo.

## Bộ ảnh chuẩn

![Bốn nền đã chốt](docs/ui-standard/2026-11-16/four-themes.png)

| Nền | Máy tính | Điện thoại |
| --- | --- | --- |
| Sáng | [Ảnh](docs/ui-standard/2026-11-16/light-desktop.png) | [Ảnh](docs/ui-standard/2026-11-16/light-mobile.png) |
| Tối | [Ảnh](docs/ui-standard/2026-11-16/dark-desktop.png) | [Ảnh](docs/ui-standard/2026-11-16/dark-mobile.png) |
| Đen hổ phách | [Ảnh](docs/ui-standard/2026-11-16/amber-desktop.png) | [Ảnh](docs/ui-standard/2026-11-16/amber-mobile.png) |
| Rêu Lime | [Ảnh](docs/ui-standard/2026-11-16/moss-desktop.png) | [Ảnh](docs/ui-standard/2026-11-16/moss-mobile.png) |

Ảnh chụp từ giao diện đang chạy, không có CSS thử nghiệm chèn thêm. Máy tính 1600×1160px, điện thoại 390×900px; ảnh lưu toàn trang. Màn Điều phối đại diện cho lớp kính, thống kê, bảng, menu, nút và bản đồ. `manifest.json` lưu kích thước, kết quả kiểm tra và mã SHA-256 của các tệp nguồn tại thời điểm chốt. Giữ nguyên bộ ảnh ngày này làm mốc; nếu có phiên bản mới được duyệt, tạo thư mục ngày/phiên bản mới.

## Cách tiếp tục làm trang

1. Đọc tài liệu này trước khi sửa UI. Nếu đang làm trong workspace dự án đầy đủ, đọc thêm `PROJECT_CONTEXT.md` ở thư mục cha. Khi người dùng yêu cầu làm thêm trang UI cho Fleet Autopilot, mặc định kế thừa chuẩn này.
2. Dùng cấu trúc ứng dụng hiện tại trong `index.html`, `workspace.js`, `workspace.css`; giữ sidebar, thanh đầu trang, cách điều hướng và bố cục đáp ứng. Trang mới phải hỗ trợ đủ bốn nền.
3. Tái sử dụng biến màu và thành phần của `styles.css`, `amber.css`, `moss.css`, `assignment.css`, `translucent.css`, `workspace.css`, `amber-premium.css`; giữ thứ tự nạp trong `index.html`. Không chép màu cố định riêng vào từng trang.
4. Font tiêu đề trang: Newsreader 600 Italic, IN HOA. Tiêu đề khối: Newsreader 600 chữ đứng. Nội dung, điều hướng, bảng, mã đơn, biển số, biểu mẫu, số liệu: Be Vietnam Pro. Giữ kích thước và khoảng cách của các thành phần hiện có.
5. Giữ lớp kính trong mờ, mép kính mảnh 2px, phản sáng nhẹ và nền phủ toàn màn hình. Đen hổ phách dùng mẫu đen sâu/champagne trong `amber-premium.css`; không dùng lại phương án nâu vàng phủ đậm đã bị từ chối.
6. Trạng thái dùng chấm và chữ có màu, kèm khung cùng màu và nền màu nhẹ theo mẫu được duyệt ngày 17/11/2026: đang chạy xanh dương, hoàn thành/đã duyệt xanh lá, chờ xử lý vàng, đã hủy/mất tín hiệu đỏ. Dùng chung `status-badges.css` cho mọi vai trò; bo góc 6px, viền 1px, nền màu 10%, viền màu 45%. Không dùng màu giao diện để thay màu trạng thái nghiệp vụ.
7. Menu máy tính thu gọn thành biểu tượng (76px), mở rộng khi hover/focus (288px); khi mở, nội dung chính dịch sang bên và co chiều rộng để nhường chỗ, không mở đè. Dùng chung `navigation.css` để đồng bộ chuyển động 280ms; nhãn dài xuống dòng để đọc đủ. Thiết bị cảm ứng giữ nhãn dễ đọc. Kiểm tra trang mới trên máy tính và điện thoại, không tràn ngang và không lỗi JavaScript.
8. Nếu muốn đổi ngôn ngữ thiết kế, font, bảng màu hoặc hiệu ứng: dựng ảnh riêng để người dùng xem trước, chỉ áp dụng khi được chọn. Không coi ảnh trong `review/UI/` là chuẩn được duyệt; bộ ảnh trong tài liệu này là mốc chính thức cho công việc UI tiếp theo.

Bộ chọn nền và vai trò trên điện thoại dùng chung lớp kính/biến màu qua `mobile-controls.css`, bỏ nền đặc và appearance mặc định của select. Giữ native select cho thao tác cảm ứng; popup lựa chọn do hệ điều hành quản lý. Không đổi bộ màu đã chốt.

## Phạm vi chốt

Quyết định mới nhất 17/11/2026: Admin System có **một nền Security đen xanh riêng**, scoped bằng `body[data-role=admin_system]` trong `system-security.css`, thay việc chọn bốn nền cho role này. Các role khác giữ theme hiện có; đổi role không ghi đè lựa chọn đã lưu. Panel/kính/font đọc vẫn thống nhất, console monospace xanh. Terminal nhận bộ lệnh trạng thái định sẵn, có Guide mở sẵn và nút điền lệnh, không shell thật hoặc nền nhấp nháy. Các ghi chú bốn nền Admin System và console không có input bên dưới là lịch sử trước quyết định này.

Điểm nhấn mới 17/11/2026 theo yêu cầu chữ Linux xanh: console Admin System dùng nền đen xanh và chữ monospace xanh, chỉ trong khối `.system-terminal`; trạng thái mẫu, chỉ đọc, không shell thật. Không đổi màu các trang khác và không thêm nhấp nháy liên tục.

Cập nhật 17/11/2026: chart Admin chuyển từ ngày sang **6/12 tháng** để tránh nhãn chồng; nhãn T1…T12, tên đầy đủ tháng/năm khi đối chiếu, cột rộng tối thiểu 42px và cuộn trong khung hẹp. Admin System có trang mặc định **Tổng quan hệ thống** với hero giám sát, KPI tài khoản/job/yêu cầu, lưới thành phần và chart nhật ký; dùng màu sáng nhấn theo theme, giữ kính/font chuẩn và animation nhẹ. Số liệu là dữ liệu mẫu hiện có, không bịa chỉ số hạ tầng. Đã kiểm chứng nội dung native Edge, chưa kiểm tra đủ ảnh/responsive.

Thử nghiệm khối phóng/thu mới nhất 17/11/2026 theo yêu cầu người dùng: Admin luân phiên nở từ tâm 0.94→1, thu từ ngoài 1.018→1, nở từ cạnh (dịch 6px), 440ms/lệch tối đa 105ms. Admin System 0.98→1 hoặc 1.008→1, 280ms/lệch tối đa 40ms. Các khối kích hoạt khi cuộn tới, chỉ một lớp chữ, không lặp khi nhập liệu trên cùng trang; chart Admin 480ms. Giữ reduced-motion, chuyển trang một DOM và palette/font/kính. Các thông số này thay entrance 340ms trong ghi chú lịch sử; chưa kiểm chứng trực quan phiên bản animation này.

Thử nghiệm theo video V14 được người dùng yêu cầu ngày 17/11/2026: giữ lớp kính/màu/font, áp dụng riêng Admin entrance khối 340ms (dịch 6px, lệch tối đa 128ms), hình học chart 520ms và hover thẻ nhấc 4px/180ms. Luôn một lớp nội dung, không blend snapshot trang cũ/mới; Admin System giữ nhẹ, reduced-motion bỏ animation. Dashboard bổ sung cột chồng 7/14 ngày và vòng trạng thái có đối chiếu dữ liệu. Đã kiểm chứng nội dung native Edge, chưa xác nhận đầy đủ hình ảnh/chuyển động/responsive.

Ưu tiên cập nhật mới nhất 17/11/2026: người dùng báo chữ chồng và animation chậm. Chuyển trang/vai trò/tab/Back/Forward dùng một DOM thật, cập nhật ngay rồi fade nhẹ 240ms (0.96→1), không dùng snapshot trang cũ/mới hoặc translate chữ. Chỉ giữ View Transitions cho đổi nền. Bỏ reveal từng panel quản trị và bỏ morph bố cục có chữ, chỉ animate thanh biểu đồ 420ms. Dashboard Admin dùng thẻ tổng lớn, nhóm KPI nhỏ và cột chồng số đơn theo ngày theo ảnh người dùng gửi, kế thừa palette/kính/font hiện có. Mục này thay thông số 900ms/950ms/1100ms/850ms ở các ghi chú lịch sử dưới đây. Chưa kiểm chứng trực quan trong browser; đã qua kiểm tra dữ liệu và sự kiện điều hướng.

Cập nhật 17/11/2026 cho trang quản trị: Admin là sếp, có thống kê đơn hàng kèm cách tính và danh sách đối chiếu, animation nổi bật hơn qua `management.js/css` (reveal 950ms, thanh biểu đồ 1100ms, đổi bố cục Anime.js 850ms). Admin System thêm công cụ bảo trì mô phỏng, reveal nhẹ 380ms. Giữ chuyển trang tại chỗ 900ms theo phản hồi mới nhất về mỏi mắt, không dùng lại thông số trượt ngang lịch sử bên dưới; giữ giảm chuyển động và tránh reveal chung trùng với reveal riêng. Chưa kiểm chứng trực quan/responsive các trang mới vì trình duyệt kiểm thử không khởi chạy được trong phiên này.

Chuyển động được người dùng yêu cầu và làm rõ ngày 17/11/2026: dùng chung `motion.js`/`motion.css`. Đổi nền lan/quét 760ms, tự luân phiên 4 góc + 4 cạnh, bắt đầu góc trên phải. Chuyển trang: cũ trượt trái 16px/mờ 240ms, mới trượt từ phải 24px/hiện 420ms. Hộp thoại và nút giữ hiệu ứng ngắn. Giữ nguyên màu, font và kính. Tôn trọng `prefers-reduced-motion`, không thêm animation lặp hoặc chờ animation để lưu nghiệp vụ. Có fallback khi không hỗ trợ View Transitions; cần thử Safari/iPad thật trước khi xác nhận hỗ trợ thiết bị đó.

Đã chốt **hình thức UI và bốn nền để phát triển tiếp**. Ứng dụng vẫn dùng dữ liệu mẫu; nghiệp vụ, backend, AI, GPS thực tế và quyền chưa được chốt bởi quyết định này. Chưa chuyển vào thư mục hoặc bản phát hành Final; chỉ làm vậy khi người dùng yêu cầu rõ.
