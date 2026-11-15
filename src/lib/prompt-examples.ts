import type { Mode } from "./types";

/**
 * Một lượt mẫu hoàn chỉnh cho từng chế độ (few-shot), giúp model nhẹ theo đúng giao thức marker.
 * Số liệu trong ví dụ phải tự khớp: NATIVE đúng công thức, NOTES khớp SCORE (test kiểm tra).
 */
const wrap = (short: string, out: string, body: string) => `# Ví dụ MỘT lượt hoàn chỉnh (chỉ minh hoạ định dạng)
Ví dụ dùng tiếng Anh và giải thích bằng tiếng Việt chỉ để minh hoạ cấu trúc, thứ tự marker, cách trừ điểm và cách tính. Khi làm thật: nội dung bằng ${short}, giải thích bằng ${out}, chủ đề và lỗi lấy từ chính audio của học viên. TUYỆT ĐỐI không chép câu, lỗi hay điểm số của ví dụ.${out === "tiếng Việt" ? "" : `
NGÔN NGỮ GIẢI THÍCH: ví dụ viết phần giải thích bằng tiếng Việt chỉ vì là ví dụ. Khi làm thật, MỌI câu giải thích phải viết bằng ${out}, không được viết bằng tiếng Việt: nội dung nhận định và gạch đầu dòng trong @@FEEDBACK, cột "Vì sao", nghĩa trong @@VOCAB, ghi chú trong @@PRON, hướng dẫn trong @@DRILL, @@TR, @@HINT, @@SAMPLETR. Giữ NGUYÊN VĂN các nhãn cố định mà phần mềm đọc: "Nhận định:", "Điểm trừ lớn nhất:", tiêu đề 4 cột "Loại | Bạn nói | Sửa thành | Vì sao", giá trị cột Loại (Phát âm, Ngữ pháp, Từ vựng, Tự nhiên, Trôi chảy) và "LỖI LẶP LẠI". Các dòng @@NOTES nội bộ viết bằng ngôn ngữ nào cũng được.`}
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

const ielts = `
@@TRANSCRIPT

I am working as a accountant in a small company, it is in district 3. I like my job because, uh, my colleagues is very nice and I can learn many thing.

@@NOTES

FC 6: trả lời đủ dài, có "because" phát triển ý; 1 lần "uh" ngập ngừng tìm từ, từ nối còn đơn điệu
LR 6: đủ từ để nói về công việc nhưng "learn many thing" chung chung, chưa có từ ít phổ biến
GRA 5: chủ yếu câu đơn và 1 mệnh đề because; lỗi lặp: "a accountant", "colleagues is", "many thing"
P 6: dễ hiểu; mất âm cuối /s/ ở "colleagues" và /t/ ở "district"; ngữ điệu khá phẳng
BAND = (6 + 6 + 5 + 6) / 4 = 5,75 → làm tròn lên 6

@@SCORE BAND 6 | FC 6 | LR 6 | GRA 5 | P 6

@@FIXED

I work as an accountant in a small company in District 3. I like my job because my colleagues are very nice and I can learn many things.

@@BETTER

I'm an accountant at a small firm in District 3. I really enjoy it, mainly because my colleagues are great and I'm picking up new skills all the time.

@@FEEDBACK

Nhận định: trả lời đủ ý và dễ hiểu, nhưng lỗi cơ bản về mạo từ và hoà hợp chủ ngữ giữ GRA ở band 5.

| Loại | Bạn nói | Sửa thành | Vì sao |
|---|---|---|---|
| Ngữ pháp | a accountant | an accountant | "an" trước âm nguyên âm |
| Ngữ pháp | my colleagues is | my colleagues are | chủ ngữ số nhiều đi với "are" |
| Ngữ pháp | many thing | many things | "many" + danh từ số nhiều |
| Từ vựng | learn many thing | pick up new skills | cụm tự nhiên, nâng LR |

Điểm trừ lớn nhất: GRA (band 5), kéo band tổng xuống.

@@PRON

- colleagues — /ˈkɒliːɡz/ — mất âm cuối /z/ — cao

@@VOCAB

- pick up new skills — học thêm kỹ năng mới
- a small firm — một công ty nhỏ

@@DRILL

I'm an accountant. My colleagues are great.

Đọc 3 lần: nối "an accountant" thành /ənəˈkaʊntənt/, bật rõ /z/ cuối "colleagues".

@@VERDICT pass

@@Q 2

What do you find most challenging about your job?

@@TR

Điều gì trong công việc khiến bạn thấy khó khăn nhất?

@@LIMIT 40

@@HINT

- Một khó khăn cụ thể
- Vì sao nó khó
- Bạn xử lý thế nào

@@SAMPLE

Probably the end of the financial year. The workload doubles, so I have to stay late and double-check every figure.

@@SAMPLETR

Có lẽ là cuối năm tài chính. Khối lượng việc tăng gấp đôi nên tôi phải ở lại muộn và kiểm tra lại từng con số.
`;

const topik = `
@@TRANSCRIPT

주말에 저는 친구를 만나요. 그리고 영화 봤어요. 재미있어요.

@@NOTES

TASK 70: trả lời đúng câu hỏi nhưng chỉ 3 câu ngắn, chưa nêu chi tiết (ở đâu, phim gì)
LANG 60: câu đơn sơ cấp; trộn thì 만나요/봤어요 không nhất quán khi nói thói quen
DEL 65: phát âm dễ hiểu, ngắt từng câu, ngữ điệu phẳng
TOTAL = (70 + 60 + 65) / 3 = 65

@@SCORE TOTAL 65 | TASK 70 | LANG 60 | DEL 65

@@FIXED

주말에 저는 보통 친구를 만나요. 그리고 같이 영화를 봐요. 정말 재미있어요.

@@BETTER

주말에는 보통 친구를 만나서 영화를 봐요. 영화를 보고 나서 카페에서 이야기도 해요. 그래서 주말이 정말 기다려져요.

@@FEEDBACK

Nhận định: làm đúng yêu cầu câu 1 nhưng quá ngắn và lẫn thì, chưa dùng hết 30 giây.

| Loại | Bạn nói | Sửa thành | Vì sao |
|---|---|---|---|
| Ngữ pháp | 영화 봤어요 | 영화를 봐요 | nói thói quen hằng tuần dùng hiện tại |
| Tự nhiên | 친구를 만나요. 그리고 영화 봤어요. | 친구를 만나서 영화를 봐요 | nối hai hành động bằng -아서/어서 |

Điểm trừ lớn nhất: LANG (câu đơn, lẫn thì).

@@PRON

- 재미있어요 — 재미이써요 — nối âm ㅆ sang âm tiết sau chưa rõ — vừa

@@VOCAB

- 만나서 — gặp rồi (nối hành động)
- 기다려져요 — thấy mong chờ

@@DRILL

친구를 만나서 영화를 봐요.

Đọc 3 lần, nối liền "만나서" với "영화를".

@@VERDICT pass

@@PART 2

@@Q 2

[그림] 옷 가게. 손님이 산 바지가 너무 작아요. 점원: "어서 오세요. 무엇을 도와드릴까요?" 손님이 되어 바지를 교환해 달라고 말하세요.

@@TR

[Tranh] Cửa hàng quần áo. Chiếc quần khách đã mua quá chật. Nhân viên: "Xin chào, tôi giúp gì được ạ?" Hãy đóng vai khách hàng xin đổi quần.

@@ROMAN

[geurim] ot gage. sonnim-i san baji-ga neomu jagayo. jeomwon: "eoseo oseyo. mueoseul dowadeurilkkayo?" sonnim-i doeeo bajireul gyohwanhae dallago malhaseyo.

@@PREP 30

@@LIMIT 40

@@HINT

- Nêu vấn đề: mua khi nào, bị làm sao
- Xin đổi cỡ lớn hơn, lịch sự (-아/어 주세요)
- Hỏi có cần hoá đơn không

@@SAMPLE

어제 이 바지를 샀는데 너무 작아요. 한 사이즈 큰 걸로 바꿔 주세요. 영수증도 가지고 왔어요.

@@SAMPLETR

Hôm qua tôi mua chiếc quần này nhưng chật quá. Làm ơn đổi cho tôi cỡ lớn hơn một số. Tôi có mang hoá đơn theo.
`;

const hskk = `
@@TRANSCRIPT

我周末一般在家看书，有时候我和朋友去公园玩。我很喜欢周末。

@@NOTES

TASK 70: trả lời đúng câu hỏi nhưng chỉ 3 câu, chưa đủ thời lượng yêu cầu
PRON 66: 周末 đọc zhōu thành zōu (không uốn lưỡi); 一般 chưa biến điệu yì; 喜欢 thanh 3 chưa đủ thấp
FLU 70: ngắt sau mỗi câu, nói chậm
LANG 75: đúng ngữ pháp, từ vựng sơ cấp, chưa có từ nối
TOTAL = 0,35×70 + 0,30×66 + 0,15×70 + 0,20×75 = 24,5 + 19,8 + 10,5 + 15 = 69,8 → 70

@@SCORE TOTAL 70 | TASK 70 | PRON 66 | FLU 70 | LANG 75

@@FIXED

我周末一般在家看书，有时候和朋友去公园玩。我很喜欢周末。

@@BETTER

周末我一般在家看看书、休息一下。天气好的时候，我会约朋友去公园散散步。所以我特别喜欢周末。

@@FEEDBACK

Nhận định: đúng ý và đúng ngữ pháp, nhưng quá ngắn so với thời lượng phần này và còn lỗi thanh điệu.

| Loại | Bạn nói | Sửa thành | Vì sao |
|---|---|---|---|
| Phát âm | zōumò | zhōumò | zh là âm uốn lưỡi |
| Phát âm | yībān | yìbān | 一 trước thanh 1 đọc thanh 4 |
| Tự nhiên | 我和朋友去公园玩 | 约朋友去公园散散步 | cách nói tự nhiên hơn, thêm động từ lặp |

Điểm trừ lớn nhất: PRON (thanh điệu và âm uốn lưỡi).

@@PRON

- 周末 — zhōumò — đọc thành zōumò — cao
- 一般 — yìbān — giữ thanh 1 của 一 — cao

@@VOCAB

- 约朋友 — hẹn bạn
- 散散步 — đi dạo một chút

@@DRILL

周末我一般在家。

Đọc 3 lần: cong lưỡi ở zh của 周, đọc 一 thành yì.

@@VERDICT pass

@@Q 2

你最喜欢哪个季节？为什么？

@@TR

Bạn thích mùa nào nhất? Vì sao?

@@ROMAN

Nǐ zuì xǐhuan nǎge jìjié? Wèishénme?

@@PREP 60

@@LIMIT 90

@@HINT

- Mùa bạn thích và thời tiết mùa đó
- Hoạt động bạn hay làm
- Một kỷ niệm cụ thể

@@SAMPLE

我最喜欢秋天。秋天不冷也不热，天气很舒服。周末我常常和家人去爬山。

@@SAMPLETR

Tôi thích nhất mùa thu. Mùa thu không lạnh cũng không nóng, thời tiết rất dễ chịu. Cuối tuần tôi thường đi leo núi cùng gia đình.
`;

/** Ví dụ cho chế độ luyện thi, theo nhóm kỳ thi. */
export const EXAM_EXAMPLES: Record<"ielts" | "topik" | "hskk", string> = { ielts, topik, hskk };
export const examExample = (examId: string, short: string, out: string) =>
  wrap(short, out, EXAM_EXAMPLES[examId.startsWith("hskk") ? "hskk" : examId === "topik" ? "topik" : "ielts"]);

export const EXAMPLES: Record<Exclude<Mode, "exam">, (short: string, out: string) => string> = {
  guided: (s, o) => wrap(s, o, guided),
  chat: (s, o) => wrap(s, o, chat),
  listening: (s, o) => wrap(s, o, listening),
  shadow: (s, o) => wrap(s, o, shadow),
};
