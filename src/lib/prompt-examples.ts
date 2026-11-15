import type { Mode } from "./types";

/**
 * Một lượt mẫu hoàn chỉnh cho từng chế độ (few-shot), giúp model nhẹ theo đúng giao thức marker.
 * Số liệu trong ví dụ phải tự khớp: NATIVE đúng công thức, NOTES khớp SCORE (test kiểm tra).
 */
const wrap = (short: string, out: string, body: string) => `# Ví dụ MỘT lượt hoàn chỉnh (chỉ minh hoạ định dạng)
Ví dụ dùng tiếng Anh và giải thích bằng tiếng Việt chỉ để minh hoạ cấu trúc, thứ tự marker, cách trừ điểm và cách tính. Khi làm thật: nội dung bằng ${short}, giải thích bằng ${out}, chủ đề và lỗi lấy từ chính audio của học viên. TUYỆT ĐỐI không chép câu, lỗi hay điểm số của ví dụ.
<<VÍ DỤ BẮT ĐẦU>>
${body.trim()}
<<VÍ DỤ KẾT THÚC>>`;

const guided = `
@@TRANSCRIPT

Last weekend I go to the beach with my family and uh we eat a lot of seafood, we eat... It was very funny.

@@NOTES

PRON −10: /θ ð/ đọc thành /t/ ở "with"
PRON −10: mất âm cuối /d/ ở "seafood", "and" (có hệ thống)
PRON −8: ngữ điệu phẳng cả câu
PRON −6: /iː/ thành /ɪ/ ở "beach"
PRON −4: trọng âm "family" đặt sai âm tiết
FLU −12: 2 lần ngừng hơn 2 giây (pauses_over_2s=2)
FLU −6: "uh" lặp 2 cụm
FLU −8: nói rời rạc từng cụm, chậm
FLU −4: sửa lại giữa chừng "we eat... "
NAT trần 75 (chỉ câu đơn); −8: "very funny" dịch từ "rất vui"; −7: nối câu "and we" kiểu dịch từng chữ
GRA trần 80 (không có cấu trúc phức); −4: "I go" → went; −4: "we eat" → ate
VOC trần 75 (lặp từ cơ bản); −7: "funny" sai nghĩa, phải là "fun"
PRON = 100 − 38 = 62; FLU = 100 − 30 = 70; NAT = 75 − 15 = 60; GRA = 80 − 8 = 72; VOC = 75 − 7 = 68
NATIVE = 0,30×62 + 0,20×70 + 0,20×60 + 0,15×72 + 0,15×68 = 18,6 + 14 + 12 + 10,8 + 10,2 = 65,6 → 66 (PRON ≥ 50, trên 10 từ: không áp giới hạn)

@@SCORE NATIVE 66 | PRON 62 | FLU 70 | NAT 60 | GRA 72 | VOC 68

@@FIXED

Last weekend I went to the beach with my family and we ate a lot of seafood. It was really fun.

@@BETTER

Last weekend my family and I headed to the beach and had loads of seafood. It was a lot of fun.

@@FEEDBACK

Nhận định: ý rõ và đủ, nhưng còn sai thì quá khứ và âm /θ ð/, nghe ra ngay là người học.

| Loại | Bạn nói | Sửa thành | Vì sao |
|---|---|---|---|
| Ngữ pháp | I go to the beach | I went to the beach | "Last weekend" là quá khứ, cần went |
| Ngữ pháp | we eat | we ate | quá khứ của eat là ate |
| Từ vựng | very funny | really fun | funny = buồn cười; fun = vui |
| Phát âm | with /wɪt/ | with /wɪð/ | đặt đầu lưỡi giữa hai hàm răng cho /ð/ |
| Tự nhiên | and we eat a lot of | and had loads of | người bản xứ dùng "have" cho bữa ăn |

- Làm tốt: dùng đúng "Last weekend" để mở câu kể chuyện.

Điểm trừ lớn nhất: PRON (âm /θ ð/ và âm cuối), kéo NATIVE xuống nhiều nhất.

@@PRON

- with — /wɪð/ — đọc thành /wɪt/, thay /ð/ bằng /t/ — cao
- seafood — /ˈsiːfuːd/ — mất âm cuối /d/ — vừa

@@VOCAB

- a lot of fun — rất vui
- head to the beach — đi biển

@@DRILL

With my family, we went to the beach.

Đọc to 3 lần: đặt đầu lưỡi giữa hai hàm răng ở "with", bật rõ /t/ cuối "went".

@@VERDICT pass

@@Q 3

What do you usually do to relax after a long week?

@@TR

Bạn thường làm gì để thư giãn sau một tuần dài?

@@HINT

- Một hoạt động cụ thể
- Bạn làm với ai, ở đâu
- Vì sao nó giúp bạn thư giãn

@@SAMPLE

I usually catch up on sleep and then grab dinner with a couple of friends. It really helps me unwind.

@@SAMPLETR

Mình thường ngủ bù rồi đi ăn tối với vài người bạn. Nó thật sự giúp mình thư giãn.
`;

const chat = `
@@TRANSCRIPT

I am working in a bank since three years and I like it because my colleague very friendly.

@@FIXED

I have been working at a bank for three years and I like it because my colleagues are very friendly.

@@BETTER

I've been working at a bank for three years now, and I really like it. My colleagues are super friendly.

@@FEEDBACK

Nhận định: giao tiếp được, nhưng dùng sai thì cho việc kéo dài tới hiện tại.

| Loại | Bạn nói | Sửa thành | Vì sao |
|---|---|---|---|
| Ngữ pháp | I am working … since three years | I've been working … for three years | việc kéo dài tới nay dùng hiện tại hoàn thành tiếp diễn; for + khoảng thời gian |
| Ngữ pháp | my colleague very friendly | my colleagues are very friendly | thiếu động từ "are" |

@@PRON

- three — /θriː/ — đọc thành /triː/ — cao

@@VERDICT pass

@@SAY

Three years, nice! Friendly coworkers make such a difference, honestly.

@@Q 4

What's the most stressful part of working at a bank?

@@TR

Phần áp lực nhất khi làm ở ngân hàng là gì?

@@HINT

- Một tình huống cụ thể
- Bạn thường xử lý thế nào

@@SAMPLE

Probably the end of the month. Everything has to balance, so we often stay late.

@@SAMPLETR

Chắc là cuối tháng. Mọi thứ phải khớp sổ nên bọn mình hay ở lại muộn.
`;

const listening = `
@@TRANSCRIPT

The museum close on Sunday and student pay six dollar.

@@NOTES

HIEU −30: nói "Sunday" trong khi đoạn nghe là Monday (chi tiết sai)
TRALOI −30: cùng chi tiết sai về ngày
PRON −10: mất âm cuối -s, -d ("close", "dollar"); −8: ngữ điệu phẳng; −10: /ʌ/ trong "Sunday"; −6: trọng âm "museum"; −6: /θ/ không rõ
FLU −35: 3 lần ngừng hơn 2 giây, nói rời rạc
HIEU = 100 − 30 = 70; TRALOI = 100 − 30 = 70; PRON = 100 − 40 = 60; FLU = 100 − 35 = 65
NATIVE = 0,4×70 + 0,2×70 + 0,2×60 + 0,2×65 = 28 + 14 + 12 + 13 = 67

@@SCORE NATIVE 67 | HIEU 70 | TRALOI 70 | PRON 60 | FLU 65

@@FIXED

The museum is closed on Sundays, and students pay six dollars.

@@BETTER

It's closed on Mondays, and students only pay six dollars.

@@FEEDBACK

Nhận định: hiểu đúng giá vé sinh viên, nhưng nghe nhầm ngày đóng cửa. Đoạn nghe nói "on Mondays it's closed".

| Loại | Bạn nói | Sửa thành | Vì sao |
|---|---|---|---|
| Nghe hiểu | Sunday | Monday | đoạn nghe: "on Mondays it's closed" |
| Ngữ pháp | The museum close | The museum is closed | bị động: be + closed |

@@PRON

- dollars — /ˈdɑːlərz/ — bỏ âm cuối /z/ — cao

@@VOCAB

- half price — nửa giá
- be closed on Mondays — đóng cửa thứ Hai

@@DRILL

On Mondays, it's closed.

Đọc 3 lần, nhấn vào "Mon" và nối "it's closed".

@@VERDICT pass

@@SAY

The next train to the airport leaves at ten forty. It usually takes thirty-five minutes, but there's construction this week, so allow an extra ten.

@@Q 5

How long should you plan for the trip this week?

@@TR

Tuần này bạn nên tính chuyến đi mất bao lâu?

@@HINT

- Để ý thời gian thường lệ
- Để ý lý do có thay đổi
`;

const shadow = `
@@TRANSCRIPT

I love to, but I got a ton of work to finish tonight.

@@NOTES

ACC −8: "I'd" đọc thành "I" (mất 'd, đổi nghĩa)
ACC −8: "I've got" đọc thành "I got"
PRON −10: không nối âm "ton of" → /tʌnəv/
PRON −8: "tonight" trọng âm đặt sai vào âm đầu
PRON −8: /ʌ/ trong "ton" thành /ɔ/
PRON −6: ngữ điệu không xuống ở cuối câu
FLU −8: ngắt hơi sau "work"; −8: nhịp đều từng từ, không giữ được nhịp câu mẫu; −10: chậm hơn hẳn câu mẫu
ACC = 100 − 16 = 84; PRON = 100 − 32 = 68; FLU = 100 − 26 = 74
NATIVE = 0,5×68 + 0,25×74 + 0,25×84 = 34 + 18,5 + 21 = 73,5 → 74

@@SCORE NATIVE 74 | PRON 68 | FLU 74 | ACC 84

@@FIXED

I'd love to, but I've got a ton of work to finish tonight.

@@FEEDBACK

Nhận định: đọc rõ, nhưng nuốt mất hai dạng rút gọn làm đổi nghĩa và chưa nối âm.

| Loại | Bạn nói | Sửa thành | Vì sao |
|---|---|---|---|
| Phát âm | I love to | I'd love to | 'd (would) rất nhẹ nhưng phải có, nếu không thành "tôi yêu" |
| Phát âm | I got | I've got | /v/ nối vào "got": /aɪvɡɑːt/ |
| Phát âm | ton / of | ton of /tʌnəv/ | nối phụ âm cuối với nguyên âm sau |

Điểm trừ lớn nhất: PRON (nối âm và rút gọn).

@@PRON

- I'd love to — /aɪd ˈlʌv tə/ — mất âm /d/ — cao
- a ton of — /ə ˈtʌnəv/ — tách rời từng từ — vừa

@@DRILL

I'd love to. I've got a ton of work.

Đọc chậm 3 lần, giữ /d/ và /v/ thật nhẹ, rồi tăng dần tới tốc độ câu mẫu.

@@VERDICT pass

@@Q 4

Could you give me a hand with these boxes before you head out?

@@TR

Bạn giúp mình mấy cái thùng này trước khi đi được không?

@@HINT

- Nối "give me a" thành /ɡɪmiə/
- Nhấn "hand" và "boxes"
- Lên giọng nhẹ ở cuối câu hỏi
`;

export const EXAMPLES: Record<Mode, (short: string, out: string) => string> = {
  guided: (s, o) => wrap(s, o, guided),
  chat: (s, o) => wrap(s, o, chat),
  listening: (s, o) => wrap(s, o, listening),
  shadow: (s, o) => wrap(s, o, shadow),
};
