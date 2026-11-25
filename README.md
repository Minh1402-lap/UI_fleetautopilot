# Fleet Autopilot — UI Prototype

Prototype giao diện điều phối vận chuyển vật liệu xây dựng (HTML, CSS và JavaScript thuần — không cần `npm install` hay bước build).

> **Lưu ý phạm vi:** Đây là kho giao diện thử nghiệm chạy dữ liệu mẫu trong trình duyệt (`localStorage`), chưa kết nối backend, xác thực thật, GPS Taris, AI hay Google Maps API. Ứng dụng sản phẩm Next.js nằm ở repository riêng.

---

## Chạy trên máy cá nhân

Mở terminal tại thư mục `UI/` (yêu cầu Python 3):

```bash
npm run dev
# hoặc: python -m http.server 8083 --bind 127.0.0.1
```

Truy cập `http://127.0.0.1:8083/`. Nhấn `Ctrl + C` để dừng máy chủ.

---

## Quy chuẩn giao diện hiện hành

| Thành phần | Quy chuẩn đang áp dụng |
| --- | --- |
| **PC (`>= 760px`)** | **Mẫu 2 — Spatial UI Hai tông Matte Mineral** (Bento chính + trang con đồng bộ, sidebar pill nổi co/mở bên trái) cho `dispatch`, `admin`, `system_admin`. |
| **Phone (`< 760px`)** | Thanh điều hướng đáy **vòm chuông Bezier SVG**: Tài xế 3 tab (`Bản đồ / Chuyến / Ticket`), 3 vai trò quản lý 4 tab. |
| **Nền màu** | 4 nền (`light`, `dark`, `amber`, `moss`) cho quản lý; Tài xế dùng 2 nền (`light`, `dark`). |
| **Nhãn trạng thái** | Pill bo tròn (`border-radius: 999px`) đồng bộ; 4 thẻ đáy Bento xen kẽ thẻ sáng (pill đặc) và thẻ tối (chấm màu). |
| **Typography & Icon** | Font **Quicksand** upright (`h1–h4` weight `600`) lưu cục bộ tại `assets/fonts/`; icon UI lấy từ `@mui/icons-material` qua registry trong `index.html`. |

---

## Điều hướng nhanh qua URL

| Tham số | Giá trị chính |
| --- | --- |
| `role` | `dispatch` (Điều phối) · `driver` (Tài xế) · `admin` (Quản lý vận hành) · `system_admin` (Quản trị hệ thống) |
| `theme` | `light` · `dark` · `amber` · `moss` |
| `ui` | `v2` (Mẫu 2 — mặc định) · `v1` · `v3` |
| `page` | `overview` · `orders` · `dispatch` · `fleet` · `gps` · `reports` |

Ví dụ:

```text
http://127.0.0.1:8083/?role=dispatch&theme=dark&ui=v2&page=orders
http://127.0.0.1:8083/?role=driver&theme=light
```

---

## Cấu trúc mã nguồn chính

```text
UI/
├── index.html                  # Khung ứng dụng, preload font và registry icon MUI
├── spatial-v2.js / .css        # Giao diện Bento & trang con Mẫu 2 (PC)
├── workspace.js / .css         # Dữ liệu mẫu, Đơn hàng, Điều phối, Xe & tài xế, GPS, Báo cáo
├── roles.js / .css             # Chuyển vai trò mẫu, màn Tài xế, Admin & System Admin
├── workflow.js / .css          # Luồng duyệt phân công V1, bằng chứng 2 đầu, Ticket & ngoại lệ
├── governance.js / .css        # Lịch sử thay đổi, khôi phục tài khoản, bảo trì & điều khiển
├── security.js / .css          # Giám sát an ninh & nhật ký hệ thống
├── driver-phone.js / .css      # Giao diện Phone Tài xế (< 760px)
├── management-phone.js / .css  # Giao diện Phone Điều phối / Admin / System Admin (< 760px)
├── theme.js / theme-picker.*   # Chuyển nền & hiệu ứng lan màu
├── typography.css              # Thiết lập font Quicksand
├── status-badges.css           # Chuẩn badge trạng thái pill bo tròn
└── assets/                     # Font Quicksand, logo và giấy phép tài sản
```

---

## Nghiệp vụ phản ánh trên bản thử

- **Đơn vị hàng:** gạch tính theo `viên`, cát/đá nhà máy theo `kg`, cát/đá thông thường theo `m³`; khoảng cách theo `km` (`≤100 km`, dự kiến tính từ tuyến Google Maps giữa Điểm lấy và Điểm giao).
- **Phân công & xác nhận:** V1 Điều phối duyệt mọi phân công; một xe nhận đơn tiếp theo khi hoàn thành; Tài xế có nút *Báo xe sẵn sàng* trên Phone nhưng Điều phối duyệt mới xác thực được xe sẵn sàng.
- **Khôi phục dữ liệu mẫu:** Nút **Khôi phục dữ liệu mẫu** ở cuối trang đặt lại dữ liệu lưu trong `localStorage` của trình duyệt.
