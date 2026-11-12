# Chính sách quyền riêng tư của Nói Đi

Cập nhật: 12/11/2026

Nói Đi là tiện ích Chrome mã nguồn mở chạy trên `aistudio.google.com`. Tài liệu này mô tả tiện ích xử lý dữ liệu của bạn như thế nào.

## Tóm tắt

- Nói Đi **không có máy chủ riêng** và **không thu thập, bán hay chia sẻ dữ liệu** của bạn.
- Không có phân tích sử dụng, không quảng cáo, không theo dõi.
- Mọi dữ liệu của tiện ích nằm **trong trình duyệt của bạn**.

## Dữ liệu lưu trong trình duyệt

Lưu bằng `chrome.storage.local`, chỉ trên máy bạn:

| Dữ liệu | Mục đích |
|---|---|
| Cài đặt (tốc độ đọc, giọng đọc, giao diện sáng/tối, bật tắt tự đọc…) | Nhớ lựa chọn của bạn |
| Thiết lập buổi luyện gần nhất và theo từng cuộc trò chuyện (ngôn ngữ, chế độ, trình độ) | Hiển thị đúng thông tin buổi và đọc đúng ngôn ngữ |
| Sổ từ vựng (câu bạn chủ động lưu) | Ôn lại |
| Số câu đã luyện và mốc đã nhắc ủng hộ | Chỉ để quyết định có hiện lời nhắn ủng hộ hay không |

Bạn có thể xoá bằng cách gỡ tiện ích hoặc xoá dữ liệu của tiện ích trong `chrome://extensions`.

## Giọng nói và nội dung hội thoại

- Khi bạn ghi âm, **AI Studio** (Google) ghi và xử lý giọng nói bằng hộp thoại gốc của trang, dưới tài khoản Google của bạn. Việc này tuân theo chính sách của Google. Nói Đi **không gửi** giọng nói hay nội dung hội thoại tới bất kỳ nơi nào khác.
- Nói Đi chỉ đọc nội dung trang AI Studio ngay trong trình duyệt để dựng giao diện luyện nói.
- Để vẽ sóng âm và cho bạn nghe lại, tiện ích đọc luồng micro mà AI Studio đã xin (không mở micro lần hai). Bản nghe lại chỉ nằm trong bộ nhớ của tab và mất khi tải lại trang.
- Giọng đọc câu hỏi/câu mẫu do trình duyệt cung cấp (`speechSynthesis`). Tuỳ giọng bạn chọn, Chrome có thể dùng dịch vụ giọng nói của Google; đó là hành vi của trình duyệt, không phải của Nói Đi.

## Chụp màn hình và báo sự cố

- Ảnh chụp màn hình **chỉ được chụp khi bạn bấm nút**, hiển thị để bạn xem, rồi chép vào clipboard hoặc tải về máy theo lựa chọn của bạn. Tiện ích không tự tải ảnh lên đâu cả.
- Nút "Báo sự cố" **chỉ mở thư soạn sẵn** (Gmail hoặc ứng dụng mail của bạn). Bạn xem được toàn bộ nội dung và tự bấm Gửi. Thư gồm loại sự cố, mô tả của bạn và thông tin kỹ thuật (phiên bản, trình duyệt, model, trạng thái, quyền micro, lỗi gần nhất). Bạn có thể tắt phần thông tin kỹ thuật. **Không** có nội dung hội thoại hay mã định danh cuộc trò chuyện.

## Quyền của tiện ích

| Quyền | Lý do |
|---|---|
| `storage` | Lưu dữ liệu nêu trên |
| `activeTab` | Popup điều khiển và đọc trạng thái của tab AI Studio bạn đang xem |
| Truy cập `https://aistudio.google.com/*` | Chạy giao diện luyện nói trên trang; chụp màn hình tab khi bạn yêu cầu |

## Liên hệ

Câu hỏi về quyền riêng tư: mở [issue](https://github.com/phihung0131/noi-di/issues) hoặc dùng nút "Báo sự cố" trong tiện ích.
