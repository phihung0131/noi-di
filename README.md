# Nói Đi

Extension Chrome biến [Google AI Studio](https://aistudio.google.com) thành phòng luyện nói: giám khảo AI hỏi, bạn nói, nhận xét và chấm điểm ngay.

- Giao diện React + Tailwind + Radix (kiểu shadcn) + TanStack Store/Query, icon Lucide, chạy trong Shadow DOM.
- Prompt dùng *giao thức marker* (`@@Q`, `@@SAMPLE`, `@@SCORE`…) nên UI luôn dựng đúng, không đoán theo emoji.
- Chế độ: IELTS Speaking, Hội thoại, Nghe hiểu. Thiết lập ngôn ngữ cố định trong một cuộc trò chuyện.
- Ghi âm có sóng, nghe lại trước khi gửi, nghe lại từng câu đã gửi, câu mẫu có tô sáng từng từ, sổ từ vựng.

## Cài đặt

```bash
npm install
npm run build        # tạo dist/
```

Mở `chrome://extensions` → bật Developer mode → Load unpacked → chọn thư mục này (có `manifest.json`).
Sau mỗi lần build, bấm reload trên thẻ extension.

## Popup

Bấm biểu tượng Nói Đi trên thanh công cụ Chrome: nút **Bắt đầu nói**, **Buổi mới**, **Chọn model**, **Sổ từ vựng** (nghe lại, tìm, xoá) và **Cài đặt nhanh**. Popup điều khiển tab AI Studio đang mở qua tin nhắn của extension (`activeTab`, không xin quyền đọc mọi trang).

## Ủng hộ và báo sự cố

- **Ủng hộ:** biểu tượng cà phê ở header (và trong popup) mở mã QR VietQR của tác giả. Sau khi bạn luyện xong 10, 50, 150 câu có một thẻ nhắc nhẹ, đóng được và không hiện lại ở mốc đó.
- **Báo sự cố:** chọn loại lỗi, mô tả thêm nếu cần, chụp màn hình (giao diện Nói Đi hoặc trang AI Studio gốc), rồi mở Gmail/app mail với thư soạn sẵn gửi tới tác giả. Thư kèm thông tin kỹ thuật (phiên bản, trình duyệt, model, trạng thái, quyền micro), **không** có nội dung hội thoại. Link thư không đính kèm file được nên ảnh được chép vào clipboard để dán (Ctrl+V) vào thư.

## Phát triển

```bash
npm run dev          # build --watch
npm test             # test parser
npm run typecheck
```

Cấu trúc: `src/lib/prompt.ts` (prompt) ↔ `src/lib/parser.ts` (đọc kết quả) phải sửa cùng nhau.
`src/lib/bridge.ts` là nơi duy nhất chạm DOM của AI Studio. `src/lib/controller.ts` giữ state và luồng chính.
`legacy/` là bản JS thuần đời đầu.
