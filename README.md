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

## Phát triển

```bash
npm run dev          # build --watch
npm test             # test parser
npm run typecheck
```

Cấu trúc: `src/lib/prompt.ts` (prompt) ↔ `src/lib/parser.ts` (đọc kết quả) phải sửa cùng nhau.
`src/lib/bridge.ts` là nơi duy nhất chạm DOM của AI Studio. `src/lib/controller.ts` giữ state và luồng chính.
`legacy/` là bản JS thuần đời đầu.
