# Nội dung đăng Chrome Web Store

Dùng khi nộp tiện ích. Giữ đồng bộ với `manifest.json` và README.

## Tên
Nói Đi – Luyện nói với AI Studio

## Mô tả ngắn (tối đa 132 ký tự)
Biến Google AI Studio thành phòng luyện nói: giám khảo AI hỏi, bạn nói, chấm điểm mức giống người bản xứ. 8 ngôn ngữ.

## Mô tả chi tiết

Nói Đi biến Google AI Studio thành phòng luyện nói ngoại ngữ. Giám khảo AI hỏi một câu, bạn trả lời bằng giọng nói, và nhận xét cùng điểm số ngay lập tức. Model Gemini nghe trực tiếp giọng của bạn nên chấm được cả phát âm và ngữ điệu, không chỉ nội dung.

TÍNH NĂNG
• 8 ngôn ngữ: English (Mỹ, Anh), 日本語, 한국어, 中文, Deutsch, Français, Español, Português (Brasil), kèm phiên âm cho chữ không phải Latin.
• 3 chế độ: Hỏi đáp có chấm, Hội thoại tự nhiên, Nghe hiểu. Trình độ A2 đến C1.
• Điểm trên 100 "giống người bản xứ" gồm phát âm, trôi chảy, tự nhiên, ngữ pháp, từ vựng.
• Nhận xét cụ thể: transcript, bản sửa đầy đủ câu trả lời, bản người bản xứ sẽ nói, bảng lỗi (loại, bạn nói, sửa thành, vì sao), từ phát âm sai và một bài tập sửa lỗi.
• Ghi âm có sóng âm, nghe lại trước khi gửi, câu mẫu và câu hỏi đọc bằng giọng của trình duyệt (có bản chậm).
• Sổ từ vựng lưu câu hay để ôn lại, xem được cả trong popup.
• Tổng kết buổi, biểu đồ điểm, xử lý lỗi rõ ràng (hết hạn mức thì gợi ý chuyển model nhẹ hơn).

CÁCH DÙNG
1. Mở aistudio.google.com và bấm biểu tượng Nói Đi.
2. Chọn "Buổi mới": ngôn ngữ, chế độ, trình độ.
3. Nghe câu hỏi, bấm micro, nói, nghe lại rồi gửi.

QUYỀN RIÊNG TƯ
Không có máy chủ riêng, không thống kê, không theo dõi. Dữ liệu của tiện ích chỉ lưu trong trình duyệt. Giọng nói được xử lý bởi chính AI Studio dưới tài khoản Google của bạn.

Nói Đi là dự án cá nhân, mã nguồn mở (MIT), không liên kết với Google.

## Danh mục
Giáo dục (Education)

## Ngôn ngữ giao diện
Tiếng Việt

## Mục đích duy nhất (Single purpose)
Cung cấp giao diện luyện nói ngoại ngữ trên trang Google AI Studio.

## Giải trình quyền
- **storage:** lưu cài đặt, sổ từ vựng và mốc luyện tập trong trình duyệt của người dùng.
- **activeTab:** cho popup điều khiển và đọc trạng thái tab AI Studio mà người dùng đang xem.
- **Truy cập aistudio.google.com:** chạy giao diện luyện nói trên trang này; chụp màn hình tab khi người dùng bấm "Chụp" trong báo sự cố (ảnh chỉ tải về máy).
- **Mã chạy trong trang (world MAIN) `tap.js`:** chỉ đọc luồng micro mà chính trang đã xin, để vẽ sóng âm và cho người dùng nghe lại bản ghi. Không mở micro riêng, không gửi dữ liệu đi.

## Chính sách quyền riêng tư
`docs/PRIVACY.md` (đăng thành trang công khai, ví dụ qua GitHub Pages hoặc trang blob của GitHub).

## Ảnh cần chuẩn bị
- Ảnh chụp 1280×800 (tối thiểu 1, nên 3–5): màn hình buổi luyện có thẻ điểm; hộp chọn buổi mới; popup; sổ từ vựng.
- Biểu tượng 128×128: `public/icons/icon-128.png` (sinh bằng `npm run prepare:assets`).
- Tuỳ chọn: ảnh quảng bá nhỏ 440×280.
