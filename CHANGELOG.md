# Nhật ký thay đổi

## 1.1.0

- **Prompt giáo viên thực thụ:** chấm điểm theo bảng trừ điểm bám bằng chứng, có giới hạn và kiểm tra nhất quán giữa các lượt; thẳng thắn, không khen xã giao.
- **Câu sửa đầy đủ:** sau mỗi lượt có bản sửa toàn bộ câu trả lời, bản người bản xứ sẽ nói (nghe, nghe chậm, lưu sổ), bảng tối đa 8 lỗi (loại, bạn nói, sửa thành, vì sao) và một bài tập sửa lỗi quan trọng nhất.
- **Stream trực tiếp:** hiện chữ giám khảo đang trả lời theo thời gian thực, xong mới dựng lại giao diện đầy đủ và đọc lại phần đuôi để khỏi lệch với AI Studio.
- **Nút đồng bộ lại** trên thanh đầu: nạp lại toàn bộ cuộc trò chuyện từ AI Studio khi cần.
- **Báo sự cố qua Google Form** điền sẵn (loại, mô tả, thông tin kỹ thuật), có câu đính kèm ảnh chụp màn hình. Bỏ gửi qua thư.

## 1.0.0 (bản công khai đầu tiên)

- Giao diện luyện nói toàn màn hình thay khung chat của AI Studio (React, Tailwind, Radix, TanStack, Shadow DOM).
- 8 ngôn ngữ, 3 chế độ (Hỏi đáp có chấm, Hội thoại, Nghe hiểu), trình độ A2–C1.
- Chấm điểm trên 100 "giống người bản xứ" theo phát âm, trôi chảy, tự nhiên, ngữ pháp, từ vựng.
- Prompt dùng giao thức marker, parser tương ứng có test; nạp đủ các lượt lazy-load của AI Studio, stream không nhấp nháy.
- Ghi âm có sóng âm, nghe lại, câu mẫu và câu hỏi đọc bằng giọng trình duyệt, sổ từ vựng.
- Xử lý bất thường (sai ngôn ngữ, quá ngắn, cắt ngang, lỗi model) và chuyển model nhẹ hơn khi hết hạn mức; chọn model trong giao diện.
- Popup thanh công cụ: bắt đầu nói, buổi mới, chọn model, sổ từ vựng, cài đặt nhanh.
- Báo sự cố (thư soạn sẵn, chụp màn hình) và mục ủng hộ tác giả.
- Chọn lọc điểm bám vào AI Studio trong một file, có kiểm tra sức khoẻ khi trang đổi giao diện.
