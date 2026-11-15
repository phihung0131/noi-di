/**
 * Đặc tả các kỳ thi nói cho chế độ "Luyện thi". Cấu trúc, thời gian và tiêu chí lấy theo mô tả công khai của từng kỳ thi.
 * Điểm chỉ là ƯỚC LƯỢNG để luyện tập: giám khảo AI không thay giám khảo được cấp chứng chỉ.
 *
 * - IELTS Speaking: 3 phần; 4 tiêu chí FC, LR, GRA, P chấm band nguyên 0–9; band tổng = trung bình 4 tiêu chí,
 *   làm tròn theo quy tắc IELTS (.25 → .5, .75 → lên band nguyên kế tiếp). Phần mềm tự tính band tổng.
 * - TOPIK 말하기: 6 câu theo 6 dạng, có thời gian chuẩn bị/trả lời riêng; 3 tiêu chí đánh giá
 *   내용 및 과제 수행, 언어 사용, 발화 전달력. Thang 0–100 mỗi tiêu chí là thang luyện tập của Nói Đi (không phải thang 200 chính thức).
 * - HSKK 初级/中级/高级: cấu trúc phần theo từng cấp; tổng 100 điểm, đạt từ 60.
 *   Trọng số tiêu chí của Nói Đi là ước lượng (HSKK không công bố rubric chi tiết).
 */
export type ExamId = "ielts" | "topik" | "hskk1" | "hskk2" | "hskk3";

export interface ExamTask {
  /** Số phần (hiện ở @@PART) */
  part: number;
  name: string;
  /** Mô tả nhiệm vụ cho giám khảo */
  brief: string;
  /** Số câu/lượt trong phần */
  items: number;
  /** Giây chuẩn bị trước khi nói (0 = không có) */
  prep: number;
  /** Giây nói tối đa cho mỗi lượt */
  limit: number;
  /** Phần này phát đoạn nghe (@@SAY, ẩn chữ tới khi trả lời) */
  listen?: boolean;
}

export interface ExamSpec {
  id: ExamId;
  name: string;
  /** Mã ngôn ngữ được dùng kỳ thi này */
  langs: string[];
  tasks: ExamTask[];
  /** Dòng @@SCORE mẫu */
  scoreFmt: string;
  /** Hướng dẫn chấm đưa vào prompt */
  rubric: string;
}

const IELTS: ExamSpec = {
  id: "ielts", name: "IELTS Speaking", langs: ["en-US", "en-GB"],
  tasks: [
    { part: 1, name: "Part 1 · Introduction and interview", items: 5, prep: 0, limit: 40,
      brief: "Câu hỏi ngắn về chủ đề quen thuộc (nhà ở, công việc/học tập, sở thích, thói quen hằng ngày), 2–3 chủ đề, mỗi câu trả lời khoảng 20–30 giây. Giọng giám khảo thi thật: hỏi thẳng, không khen, không giải thích." },
    { part: 2, name: "Part 2 · Long turn (cue card)", items: 1, prep: 60, limit: 120,
      brief: "Một cue card: đề bài \"Describe …\" và đúng 4 gạch đầu dòng \"You should say: …\" (gạch cuối dạng \"and explain …\"). In cue card trong @@Q (đề bài dòng đầu, các gạch đầu dòng ở các dòng sau). Học viên có 1 phút chuẩn bị và nói 1–2 phút. Sau khi chấm, có thể hỏi 1 câu ngắn kết thúc (rounding-off) trước khi sang Part 3." },
    { part: 3, name: "Part 3 · Discussion", items: 4, prep: 0, limit: 75,
      brief: "Câu hỏi thảo luận trừu tượng, mở rộng từ chủ đề Part 2 (so sánh, nguyên nhân, dự đoán, đánh giá xã hội). Câu sau đào sâu câu trước. Mỗi câu trả lời khoảng 45–60 giây." },
  ],
  scoreFmt: "@@SCORE BAND 6.5 | FC 6 | LR 7 | GRA 6 | P 7",
  rubric: `Chấm theo IELTS Speaking band descriptors (bản công khai), mỗi tiêu chí MỘT band nguyên 0–9:
- FC (Fluency and Coherence): nói liền mạch, độ dài câu trả lời, ngập ngừng do tìm ý hay tìm từ, tự sửa, dùng từ nối và phát triển ý mạch lạc.
- LR (Lexical Resource): độ rộng và chính xác của từ vựng, collocation, idiom dùng tự nhiên, khả năng diễn đạt lại (paraphrase).
- GRA (Grammatical Range and Accuracy): độ đa dạng cấu trúc (câu phức, mệnh đề, điều kiện…) và tỉ lệ câu không lỗi.
- P (Pronunciation): dễ hiểu, trọng âm từ và câu, ngữ điệu, nối âm, âm riêng lẻ; mức gánh nặng cho người nghe.
Mốc tham khảo: band 5 = nói được nhưng chậm, lặp từ nối, lỗi thường xuyên; band 6 = sẵn sàng nói dài, có lúc mất mạch, từ vựng đủ để bàn chủ đề, có câu phức nhưng còn lỗi; band 7 = nói dài không vất vả, dùng từ ít phổ biến và idiom, nhiều câu không lỗi; band 8 = trôi chảy, chỉ ngập ngừng khi tìm ý, lỗi hiếm.
BAND = trung bình 4 tiêu chí, làm tròn theo quy tắc IELTS: phần lẻ .25 làm tròn lên .5, phần lẻ .75 làm tròn lên band nguyên kế tiếp (ví dụ 6, 7, 6, 7 → 6.5; 6, 6, 6, 7 → 6.25 → 6.5; 7, 7, 7, 6 → 6.75 → 7). Phần mềm tính lại BAND theo đúng quy tắc này.
Một câu trả lời quá ngắn (Part 1 dưới 2 câu, Part 2 dưới 1 phút) thì FC tối đa 5.`,
};

const TOPIK: ExamSpec = {
  id: "topik", name: "TOPIK 말하기", langs: ["ko-KR"],
  tasks: [
    { part: 1, name: "1번 · 질문에 대답하기", items: 1, prep: 20, limit: 30, brief: "Câu hỏi đời thường đơn giản (sơ cấp), trả lời 2–3 câu." },
    { part: 2, name: "2번 · 그림 보고 역할 수행하기", items: 1, prep: 30, limit: 40, brief: "Nhập vai theo tình huống sơ cấp (mua sắm, hẹn gặp, hỏi đường…). Đề thật dùng tranh: ở đây mô tả tranh bằng chữ trong @@Q (dòng đầu \"[그림] …\" bằng tiếng Hàn đơn giản) rồi lời người kia nói và yêu cầu nhập vai." },
    { part: 3, name: "3번 · 그림 보고 이야기하기", items: 1, prep: 40, limit: 60, brief: "Kể chuyện theo 4 tranh liên tiếp (trung cấp). Mô tả 4 tranh bằng chữ trong @@Q, mỗi tranh một dòng \"①…\" đến \"④…\", học viên kể lại thành câu chuyện có từ nối." },
    { part: 4, name: "4번 · 대화 완성하기", items: 1, prep: 40, limit: 60, brief: "Một đoạn hội thoại ngắn về vấn đề xã hội/đời sống (trung cấp) phát trong @@SAY; học viên nói lượt cuối: nêu ý kiến của mình và lý do." },
    { part: 5, name: "5번 · 자료 해석하기", items: 1, prep: 70, limit: 80, brief: "Diễn giải số liệu (cao cấp): in số liệu khảo sát/biểu đồ dạng bảng chữ ngắn trong @@Q (tiêu đề, 3–5 dòng số), học viên mô tả xu hướng, nguyên nhân và triển vọng." },
    { part: 6, name: "6번 · 의견 제시하기", items: 1, prep: 70, limit: 80, brief: "Trình bày ý kiến về một vấn đề xã hội (cao cấp): nêu lập trường, 2 lý do có dẫn chứng, kết luận; dùng văn phong trang trọng (합쇼체/문어체 phù hợp)." },
  ],
  scoreFmt: "@@SCORE TOTAL 68 | TASK 70 | LANG 65 | DEL 68",
  rubric: `Chấm theo 3 tiêu chí đánh giá của TOPIK 말하기, mỗi tiêu chí 0–100:
- TASK (내용 및 과제 수행): làm đúng yêu cầu của dạng câu, đủ nội dung, phát triển ý, mạch lạc.
- LANG (언어 사용): ngữ pháp và từ vựng đúng, đa dạng, phù hợp cấp độ của câu; văn phong và kính ngữ đúng tình huống.
- DEL (발화 전달력): phát âm, ngữ điệu, tốc độ và độ trôi chảy giúp người nghe hiểu dễ.
TOTAL = làm tròn((TASK + LANG + DEL) / 3). Phần mềm tính lại TOTAL.
Yêu cầu theo độ khó: câu 1–2 đánh giá theo chuẩn sơ cấp, câu 3–4 trung cấp, câu 5–6 cao cấp. Trả lời đúng nhưng ở trình độ thấp hơn yêu cầu của câu thì LANG tối đa 60. Bỏ trống hoặc lạc đề thì TASK tối đa 20.
Điểm 0–100 ở đây là thang luyện tập của Nói Đi, KHÔNG quy đổi sang thang 200 hay cấp TOPIK chính thức.`,
};

const hskkRubric = (lv: string) => `Chấm mỗi lượt theo thang 100 của HSKK (đạt từ 60), dùng 4 tiêu chí 0–100:
- TASK: hoàn thành nhiệm vụ của phần thi (lặp lại đúng và đủ, trả lời đúng ý, kể lại đủ ý chính, nói đủ thời lượng).
- PRON: thanh điệu (kể cả biến điệu 三声, 不, 一), phụ âm, vần; sai thanh làm đổi nghĩa trừ nặng.
- FLU: trôi chảy, ngắt nghỉ đúng chỗ, tốc độ tự nhiên.
- LANG: ngữ pháp và từ vựng đúng, phù hợp cấp ${lv}.
TOTAL = làm tròn(0,35 × TASK + 0,30 × PRON + 0,15 × FLU + 0,20 × LANG). Phần mềm tính lại TOTAL. Đây là trọng số ước lượng của Nói Đi; HSKK không công bố rubric chi tiết.`;

const HSKK1: ExamSpec = {
  id: "hskk1", name: "HSKK 初级", langs: ["zh-CN"],
  tasks: [
    { part: 1, name: "第一部分 · 听后重复", items: 5, prep: 0, limit: 15, listen: true, brief: "Phát MỘT câu ngắn (sơ cấp) trong @@SAY, học viên nghe rồi lặp lại y hệt. @@Q chỉ ghi \"请重复\". Đề thật có 15 câu; ở đây luyện 5." },
    { part: 2, name: "第二部分 · 听后回答", items: 4, prep: 0, limit: 20, listen: true, brief: "Phát MỘT câu hỏi đơn giản trong @@SAY, học viên trả lời ngắn. @@Q chỉ ghi \"请回答\". Đề thật có 10 câu; ở đây luyện 4." },
    { part: 3, name: "第三部分 · 回答问题", items: 2, prep: 60, limit: 90, brief: "In câu hỏi bằng chữ Hán trong @@Q (kèm pinyin ở @@ROMAN), học viên nói khoảng 1 phút 30 giây (ít nhất 5 câu). Đề thật có 7 phút chuẩn bị chung; ở đây 60 giây mỗi câu." },
  ],
  scoreFmt: "@@SCORE TOTAL 72 | TASK 75 | PRON 68 | FLU 70 | LANG 74",
  rubric: hskkRubric("HSK 1–2"),
};
const HSKK2: ExamSpec = {
  id: "hskk2", name: "HSKK 中级", langs: ["zh-CN"],
  tasks: [
    { part: 1, name: "第一部分 · 听后重复", items: 4, prep: 0, limit: 20, listen: true, brief: "Phát MỘT câu (trung cấp) trong @@SAY, học viên nghe rồi lặp lại y hệt. @@Q chỉ ghi \"请重复\". Đề thật có 10 câu; ở đây luyện 4." },
    { part: 2, name: "第二部分 · 看图说话", items: 2, prep: 60, limit: 120, brief: "Đề thật dùng tranh: ở đây mô tả tranh bằng chữ Hán trong @@Q (dòng đầu \"【图片】…\", 2–3 câu mô tả cảnh), học viên nói về tranh khoảng 2 phút." },
    { part: 3, name: "第三部分 · 回答问题", items: 2, prep: 60, limit: 120, brief: "Câu hỏi nêu quan điểm/kinh nghiệm trong @@Q, học viên nói khoảng 2 phút." },
  ],
  scoreFmt: "@@SCORE TOTAL 72 | TASK 75 | PRON 68 | FLU 70 | LANG 74",
  rubric: hskkRubric("HSK 3–4"),
};
const HSKK3: ExamSpec = {
  id: "hskk3", name: "HSKK 高级", langs: ["zh-CN"],
  tasks: [
    { part: 1, name: "第一部分 · 听后复述", items: 2, prep: 0, limit: 120, listen: true, brief: "Phát một đoạn kể/thuyết minh 5–7 câu trong @@SAY, học viên nghe rồi kể lại đủ ý chính. @@Q chỉ ghi \"请复述\". Đề thật có 3 đoạn; ở đây luyện 2." },
    { part: 2, name: "第二部分 · 朗读", items: 1, prep: 60, limit: 120, brief: "In một đoạn văn khoảng 120–160 chữ Hán trong @@Q để học viên đọc to; chấm chủ yếu PRON và FLU, TASK là đọc đủ không bỏ chữ." },
    { part: 3, name: "第三部分 · 回答问题", items: 2, prep: 60, limit: 150, brief: "Câu hỏi nghị luận về xã hội trong @@Q, học viên nói khoảng 2 phút 30 giây có lập luận." },
  ],
  scoreFmt: "@@SCORE TOTAL 72 | TASK 75 | PRON 68 | FLU 70 | LANG 74",
  rubric: hskkRubric("HSK 5–6"),
};

export const EXAMS: Record<ExamId, ExamSpec> = { ielts: IELTS, topik: TOPIK, hskk1: HSKK1, hskk2: HSKK2, hskk3: HSKK3 };

export const examsFor = (lang: string): ExamSpec[] => Object.values(EXAMS).filter((e) => e.langs.includes(lang));
export const examOf = (id: string | undefined, lang: string): ExamSpec | undefined =>
  (id && EXAMS[id as ExamId]?.langs.includes(lang) ? EXAMS[id as ExamId] : undefined) ?? examsFor(lang)[0];

/** Band tổng IELTS: trung bình 4 tiêu chí, phần lẻ .25 → .5, .75 → band nguyên kế tiếp. */
export function ieltsOverall(bands: number[]): number {
  const mean = bands.reduce((a, b) => a + b, 0) / bands.length;
  const whole = Math.floor(mean), frac = mean - whole;
  if (frac < 0.25 - 1e-9) return whole;
  if (frac < 0.75 - 1e-9) return whole + 0.5;
  return whole + 1;
}
