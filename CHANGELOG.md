# Nhật ký thay đổi

## 1.1.1

**Chấm điểm chính xác hơn**
- **Tự tính lại điểm tổng** từ điểm từng tiêu chí theo đúng công thức và các giới hạn bắt buộc (PRON dưới 50, câu quá ngắn). Chỉ kéo điểm xuống khi giám khảo cho cao hơn công thức, có ghi chú rõ; giám khảo cho thấp hơn thì giữ nguyên, vì họ có thể đã áp giới hạn phần mềm không biết.
- **Số đo trôi chảy khách quan** từ sóng âm: thời lượng, thời gian có tiếng, số lần ngừng hơn 2 giây, tỉ lệ im lặng, tốc độ nói (từ/phút). Hiện dưới câu bạn nói và gửi kèm audio để giám khảo chấm trôi chảy theo số đo thật.
- **Giám khảo nhớ lỗi qua các lượt:** mỗi lượt gửi kèm điểm lượt trước và các lỗi đã mắc, để chấm nhất quán và đánh dấu đúng lỗi lặp lại.
- **Nháp chấm điểm ẩn (@@NOTES):** giám khảo phải liệt kê từng khoản trừ và phép tính trước khi in điểm, kể cả model không có chế độ suy nghĩ.
- **Độ chắc chắn cho lỗi phát âm:** lỗi giám khảo chưa chắc được tách riêng thành "có thể lệch", tránh sửa nhầm âm bạn đã đọc đúng.
- **Ví dụ một lượt hoàn chỉnh** cho từng chế độ trong prompt, giúp model nhẹ theo đúng giao thức.
- **Tự sửa giao thức:** lượt đã chấm mà thiếu câu hỏi kế tiếp thì tự nhờ giám khảo trả lời lại (một lần).
- Đặt temperature thấp khi nạp prompt (nếu dò thấy ô cài đặt) để điểm ổn định hơn.
- Tổng kết buổi dùng điểm trung bình và xu hướng do tiện ích tự tính.

**Nhận xét dễ dùng hơn**
- **Tô chỗ đã sửa:** so từng từ giữa câu bạn nói và câu đã sửa (hoặc câu gốc khi đọc nhại).
- Bảng lỗi được tách thành dữ liệu; **lưu lỗi vào sổ** chỉ với một nút.

**Tính năng mới**
- **Chế độ Đọc nhại (shadowing):** nghe câu người bản xứ rồi đọc lại y hệt, chấm phát âm, nhịp và độ khớp câu gốc (ACC).
- **Tiến bộ qua các buổi:** số lượt đã chấm, chuỗi ngày luyện, trung bình 7 ngày, biểu đồ điểm và tiêu chí yếu nhất.
- **Tự dừng khi im lặng** (bật trong Cài đặt).
- **Xuất sổ từ vựng ra CSV** (Anki, Excel).
- Gợi ý tình huống nhập vai khi tạo buổi mới.

**Sửa lỗi (thử trên AI Studio thật)**
- Trang không bao giờ "lắng" khi AI Studio rút nội dung lượt cũ ra khỏi DOM: không tự đọc câu hỏi mới, không đếm lượt, không lưu lịch sử. Đã sửa.
- Bảng lỗi không tách được vì AI Studio bọc các ô bằng thẻ riêng trong mỗi hàng; nay nút lưu lỗi và trí nhớ lỗi hoạt động.
- Dòng số đo gửi kèm audio không còn hiện thành tin nhắn riêng; số đo trôi chảy hiện đúng dưới câu bạn nói.
- Tốc độ nói tính cả khoảng ngừng ngắn (chỉ bỏ ngừng trên 2 giây), khớp mốc 130–170 từ/phút.
- Chọn giải thích bằng English thì nhận xét ra tiếng Anh; lượt mở đầu không còn nhãn "Nói lại câu này".
- Hỏi đáp: không báo "đã đạt mốc qua câu" khi phần mềm không tự xét được câu trả lời có đủ ý hay không.

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
