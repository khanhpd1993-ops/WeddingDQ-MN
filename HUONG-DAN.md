# Hướng dẫn: Thiệp cưới online Đỗ Quân & Minh Ngọc

Thiệp là một trang web tĩnh (HTML/CSS/JS), không cần build. Khách bấm "Gửi xác nhận" thì dữ liệu được ghi vào **Google Sheet của bạn**.

```
thiep-cuoi/
  index.html            trang thiệp
  css/style.css         giao diện (màu, font, bố cục theo Figma)
  js/config.js          ← CHỈ CẦN SỬA FILE NÀY: URL Google Sheets, giờ cưới, địa chỉ bản đồ
  js/main.js            hiệu ứng, đếm ngược, album ảnh
  js/rsvp.js            form xác nhận tham dự
  apps-script/Code.gs   code dán vào Google Apps Script
  assets/  fonts/       ảnh và font
```

---

## Bước 1: Xem thử trên máy

```bash
cd ~/Documents/thiep-cuoi && npx serve .
```

Mở http://localhost:3000. Lúc này form chưa gửi được vì chưa kết nối Google Sheets.

## Bước 2: Kết nối Google Sheets (lưu xác nhận tham dự)

1. Vào https://sheets.new để tạo Google Sheet mới, đặt tên, ví dụ "RSVP Đám cưới".
2. Menu **Tiện ích mở rộng → Apps Script**.
3. Xoá code mẫu, dán **toàn bộ** nội dung `apps-script/Code.gs`, rồi bấm 💾 Lưu.
4. Ở thanh trên, chọn hàm **`setup`** → bấm **Chạy**.
   - Google sẽ hỏi quyền. Chọn tài khoản → *Nâng cao* → *Đi tới dự án (không an toàn)* → *Cho phép*. Đây là code của chính bạn nên an toàn.
   - Chạy xong, Sheet có 2 trang: **RSVP** và **Tổng quan**.
5. Bấm **Triển khai → Tùy chọn triển khai mới**:
   - Bấm ⚙️ → chọn **Ứng dụng web**.
   - *Thực thi với tư cách*: **Tôi**.
   - *Người có quyền truy cập*: **Bất kỳ ai**. Phải chọn đúng, nếu không khách sẽ không gửi được.
   - Bấm **Triển khai** → copy **URL ứng dụng web** (dạng `https://script.google.com/macros/s/…/exec`).
6. Mở `js/config.js`, dán URL vào:
   ```js
   APPS_SCRIPT_URL: 'https://script.google.com/macros/s/…/exec',
   ```
7. Tải lại trang, gửi thử một xác nhận → mở Sheet, thấy dòng mới là xong.

> Nếu sau này bạn sửa `Code.gs`, phải vào **Triển khai → Quản lý các bản triển khai → ✏️ → Phiên bản: Mới → Triển khai**. URL giữ nguyên.

### Xem và quản lý khách mời

- **Trang RSVP**: mỗi lượt xác nhận là một dòng, gồm thời gian, tên, SĐT, tham dự, số người, khách của bên nào, lời chúc. Dòng khách đến tô xanh, dòng khách không đến tô hồng.
  - Dùng nút **lọc** ở hàng tiêu đề để xem riêng nhà trai/nhà gái, hoặc chỉ khách sẽ đến.
  - Sửa hoặc xoá dòng trực tiếp được. Trang Tổng quan tự tính lại.
  - Khách gửi lại với **cùng số điện thoại** thì dòng cũ được cập nhật, không tạo dòng trùng. Cột "Số lần gửi" tăng lên.
- **Trang Tổng quan**: tổng phản hồi, số khách sẽ đến (đã cộng người đi cùng), chia theo nhà trai/nhà gái, số khách không đến, ước tính số bàn.
- **Chia sẻ cho người nhà**: nút *Chia sẻ* của Google Sheet → thêm email, chọn quyền *Người xem* hoặc *Người chỉnh sửa*.
- **Xuất Excel**: *Tệp → Tải xuống → Microsoft Excel (.xlsx)*.

## Bước 3: Đưa thiệp lên mạng bằng Vercel (miễn phí)

**Cách nhanh, dùng dòng lệnh:**

```bash
cd ~/Documents/thiep-cuoi && npx vercel --prod
```

Lần đầu, Vercel yêu cầu đăng nhập (bằng GitHub/Google/email) và hỏi vài câu, cứ Enter theo mặc định. Xong sẽ có link dạng `https://thiep-cuoi-xxx.vercel.app`.

**Cách kéo-thả, không cần dòng lệnh:** đẩy thư mục lên một repo GitHub → vào https://vercel.com/new → *Import* repo → *Deploy*. Framework để **Other**, không cần build command.

Muốn link đẹp hơn, vào *Project → Settings → Domains* để đổi tên `xxx.vercel.app` hoặc gắn tên miền riêng.

## Sửa nội dung thường gặp

| Muốn sửa | Ở đâu |
|---|---|
| Giờ đếm ngược | `js/config.js` → `WEDDING_TIME` |
| Địa điểm bản đồ | `js/config.js` → `MAP_QUERY` |
| Tên, ngày, địa chỉ, lịch trình | `index.html` (tìm theo chữ) |
| Ảnh album | thay file trong `assets/` (giữ nguyên tên), ảnh dọc tỉ lệ 2:3 |
| Ảnh khi share link (Zalo/Facebook) | `index.html` → `og:image`. Sau khi deploy, nên đổi thành link đầy đủ `https://…vercel.app/assets/couple.jpg` |

## Font

- `1FTV VIP British Green` và `DVN-Akela` lấy từ file bạn gửi, nằm trong `fonts/`.
- `SVN-Poppins` không có trong file gửi nên đang dùng **Poppins** của Google Fonts. Đây là cùng thiết kế, có tiếng Việt. Nếu có file SVN-Poppins, bỏ vào `fonts/` và báo để thêm vào.
- Lưu ý bản quyền: font 1FTV/DVN là font thương mại Việt Nam. Hãy chắc là bạn có quyền dùng trên web.
