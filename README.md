<div align="center">

<img src="public/icons/icon.svg" width="96" alt="Logo Nói Đi" />

# Nói Đi

**Biến Google AI Studio thành phòng luyện nói ngoại ngữ.**
Giám khảo AI hỏi, bạn nói, nhận xét và điểm "giống người bản xứ" ngay từng câu.

[Tính năng](#tính-năng) · [Cài đặt](#cài-đặt) · [Cách hoạt động](#cách-hoạt-động) · [Quyền riêng tư](#quyền-riêng-tư) · [Phát triển](#phát-triển) · [Ủng hộ](#ủng-hộ-và-góp-ý)

</div>

---

Nói Đi là tiện ích Chrome (Manifest V3) chạy trên [Google AI Studio](https://aistudio.google.com). Nó thay khung chat gốc bằng một giao diện luyện nói chuyên dụng, còn việc nghe giọng và chấm điểm do chính model Gemini của bạn trong AI Studio đảm nhiệm. Không có máy chủ trung gian, không cần khoá API riêng.

> Nói Đi là dự án cá nhân, **không liên kết với Google**. "Google AI Studio" và "Gemini" là thương hiệu của Google.

## Tính năng

**Luyện nói thật sự**
- **8 ngôn ngữ:** English (Mỹ, Anh), 日本語, 한국어, 中文, Deutsch, Français, Español, Português (Brasil). Có phiên âm (romaji, romanization, pinyin) cho ngôn ngữ không dùng chữ Latin.
- **3 chế độ:** *Hỏi đáp có chấm*, *Hội thoại* tự nhiên, *Nghe hiểu* (nghe đoạn ngắn rồi trả lời bằng lời). Trình độ A2 đến C1.
- **Điểm trên 100, "giống người bản xứ":** gồm phát âm và ngữ điệu, trôi chảy, tự nhiên, ngữ pháp, từ vựng. Model nghe trực tiếp audio của bạn, không chỉ đọc transcript.
- **Nhận xét cụ thể:** transcript, bảng "Bạn nói / Người bản xứ sẽ nói / Vì sao", từ phát âm sai kèm cách đọc, cách nói tự nhiên hơn.
- **Tổng kết buổi** và biểu đồ điểm qua các lượt.

**Nghe và ghi âm tiện tay**
- Nghe câu hỏi, câu mẫu (cả bản chậm) bằng giọng của Chrome, tự đọc câu hỏi mới.
- Ghi âm có sóng âm trực tiếp, **nghe lại trước khi gửi** và nghe lại từng câu đã gửi. Phím tắt: `Alt+R` ghi/dừng, `Alt+P` nghe lại, `Alt+Enter` gửi, `Alt+L` nghe lại câu hỏi.
- **Sổ từ vựng:** lưu câu mẫu và cách nói hay, nghe lại, tìm kiếm. Xem được cả trong popup.

**Bền với thực tế**
- Xử lý các tình huống thường gặp: nói sai ngôn ngữ, gõ bừa, trả lời quá ngắn, giám khảo trả lời cắt ngang.
- Báo lỗi model rõ ràng; khi hết hạn mức có nút **chuyển sang model nhẹ hơn** và hộp chọn model ngay trong giao diện.
- Thiết lập ngôn ngữ, chế độ, trình độ **cố định trong một buổi**, muốn đổi thì tạo buổi mới.

## Cài đặt

Chưa có trên Chrome Web Store. Cài từ mã nguồn (cần Node.js 20 trở lên):

```bash
git clone https://github.com/phihung0131/noi-di.git
cd noi-di
npm install
npm run build        # tạo thư mục dist/
```

1. Mở `chrome://extensions`, bật **Developer mode**.
2. Chọn **Load unpacked** và trỏ vào thư mục dự án (thư mục có `manifest.json`).
3. Mở [aistudio.google.com](https://aistudio.google.com), bấm biểu tượng Nói Đi ở góc dưới bên phải hoặc trên thanh công cụ, chọn **Buổi mới**.

Lần ghi âm đầu tiên Chrome sẽ hỏi quyền dùng micro; hãy chọn *Cho phép*. Sau mỗi lần cập nhật mã, chạy lại `npm run build` rồi bấm nút tải lại trên thẻ extension.

## Cách hoạt động

Nói Đi không gọi API riêng. Nó **điều khiển giao diện AI Studio đã có sẵn** (nạp prompt hệ thống, ghi âm bằng hộp thoại gốc, bấm Run) và dựng lại kết quả thành giao diện luyện nói.

```
 Bạn ──giọng nói──▶ hộp thoại ghi âm của AI Studio ──▶ Gemini
                                                        │
 Giao diện Nói Đi ◀── parser ◀── "giao thức marker" ◀───┘
```

- **Giao thức marker.** Prompt hệ thống buộc model trả lời bằng các mục đánh dấu (`@@Q`, `@@SAMPLE`, `@@SCORE`, `@@FEEDBACK`…). Parser đọc theo đó nên giao diện luôn dựng đúng, không đoán theo emoji hay định dạng.
- **Chịu được trang đổi giao diện.** Mọi chỗ bám vào AI Studio nằm trong một file (`src/lib/selectors.ts`), mỗi thứ có nhiều cách dò (selector dự phòng, dò theo nhãn/chữ) và có kiểm tra sức khoẻ báo khi không tìm thấy.
- **Nạp đủ lịch sử.** AI Studio chỉ render các lượt đang hiện trên màn hình; Nói Đi cuộn ngầm để nạp đủ rồi lưu cache.
- **Stream mượt.** Mục model đang viết dở (bảng, điểm) chưa hiện cho tới khi đủ, nên không nhấp nháy.

## Quyền riêng tư

- Dữ liệu (cài đặt, sổ từ vựng, mốc luyện tập) **chỉ lưu trong trình duyệt** bằng `chrome.storage.local`. Không có máy chủ, không thống kê, không theo dõi.
- Giọng nói được gửi tới Google **qua AI Studio, dưới tài khoản của chính bạn**, giống như khi bạn tự ghi âm trên trang đó. Nói Đi không gửi đi đâu khác.
- Bản nghe lại chỉ nằm trong bộ nhớ của tab và mất khi tải lại trang.
- Ảnh chụp màn hình chỉ được chụp khi bạn bấm, chỉ chép vào clipboard hoặc tải về máy; báo sự cố chỉ **mở thư soạn sẵn** để bạn kiểm tra rồi tự gửi.

Chi tiết: [docs/PRIVACY.md](docs/PRIVACY.md).

| Quyền | Dùng để |
|---|---|
| `storage` | lưu cài đặt, sổ từ vựng, mốc luyện tập |
| `activeTab` | popup điều khiển tab AI Studio bạn đang xem |
| `host: aistudio.google.com` | chạy giao diện trên AI Studio; chụp màn hình khi báo sự cố |

## Phát triển

```bash
npm run dev          # build liên tục (content script + popup)
npm test             # test (Vitest)
npm run typecheck
```

Công nghệ: React 18, TypeScript, Vite, Tailwind CSS, Radix UI (kiểu shadcn/ui), TanStack Store và Query, Lucide, giao diện chạy trong Shadow DOM.

```
src/
  lib/prompt.ts       prompt hệ thống + giao thức marker      ┐ sửa cùng nhau
  lib/parser.ts       đọc kết quả theo marker                 ┘
  lib/selectors.ts    mọi điểm bám vào AI Studio
  lib/bridge.ts       thao tác trên DOM AI Studio
  lib/controller.ts   trạng thái và luồng chính
  components/         giao diện chính (Shadow DOM)
  popup/              popup trên thanh công cụ
public/tap.js         đọc luồng micro mà AI Studio đã xin (sóng âm, nghe lại)
```

## Ủng hộ và góp ý

Nói Đi miễn phí và mã nguồn mở. Nếu nó giúp bạn nói tự tin hơn, bạn có thể mời tác giả một ly cà phê (QR trong tiện ích, hoặc [gắn sao cho repo](https://github.com/phihung0131/noi-di)). Gặp lỗi hoặc muốn tính năng mới: dùng nút **Báo sự cố** trong tiện ích hoặc mở [issue](https://github.com/phihung0131/noi-di/issues).

## Giấy phép

[MIT](LICENSE)
