import { describe, it, expect } from "vitest";
import { parseModelElement } from "@/lib/parser";

const el = (h: string) => { const d = document.createElement("div"); d.innerHTML = h; return d; };

describe("parseModelElement", () => {
  it("đọc đủ các marker", () => {
    const t = parseModelElement(el(`
      <p>@@TRANSCRIPT</p><p>I am work at a company.</p>
      <p>@@SCORE NATIVE 62 | PRON 58 | FLU 66 | NAT 55 | GRA 70 | VOC 64</p><p>@@PRON</p><ul><li>work — /wɜːrk/ — đọc thành /wɔːk/</li></ul>
      <p>@@FEEDBACK</p><table><tr><th>Bạn nói</th><th>Sửa</th></tr><tr><td>I am work</td><td>I work</td></tr></table><ul><li>Tốt <strong>nhịp</strong></li></ul>
      <p>@@VOCAB</p><ul><li>work for — làm cho</li><li>quite demanding — khá áp lực</li></ul>
      <p>@@VERDICT pass</p>
      <p>@@Q 2</p><p>"Do you like your job?"</p>
      <p>@@TR</p><p>Bạn có thích công việc không?</p>
      <p>@@HINT</p><ul><li>ý một</li></ul>
      <p>@@SAMPLE</p><p>Yes, I do. It is rewarding.</p><p>@@SAMPLETR</p><p>Có. Nó rất đáng giá.</p>`));
    expect(t.empty).toBe(false);
    expect(t.q).toEqual({ n: "2", text: "Do you like your job?" });
    expect(t.score?.map((s) => s.key)).toEqual(["NATIVE", "PRON", "FLU", "NAT", "GRA", "VOC"]);
    expect(t.verdict).toBe("pass");
    expect(t.pron).toEqual(["work — /wɜːrk/ — đọc thành /wɔːk/"]);
    expect(t.vocab).toEqual(["work for — làm cho", "quite demanding — khá áp lực"]);
    expect(t.sample?.text).toBe("Yes, I do. It is rewarding.");
    expect(t.sample?.tr).toBe("Có. Nó rất đáng giá.");
    expect(t.feedback).toContain("<table>");
    expect(t.feedback).toContain("<strong>nhịp</strong>");
    expect(t.transcript).toBe("I am work at a company.");
  });

  it("chịu được marker và nội dung dính trong một đoạn (xuống dòng mềm)", () => {
    const t = parseModelElement(el(`<p>@@Q 1<br>Where do you live?<br>@@TR<br>Bạn sống ở đâu?</p>`));
    expect(t.q?.text).toBe("Where do you live?");
    expect(t.tr).toBe("Bạn sống ở đâu?");
  });

  it("tham số nằm ở dòng sau marker (cùng một đoạn)", () => {
    const t = parseModelElement(el(`<p>@@SCORE<br>NATIVE 59 | PRON 60 | FLU 58</p><p>@@VERDICT<br>pass</p>`));
    expect(t.score?.map((s) => `${s.key}=${s.value}`)).toEqual(["NATIVE=59", "PRON=60", "FLU=58"]);
    expect(t.verdict).toBe("pass");
  });

  it("stream dở: marker chưa đủ không làm vỡ", () => {
    const t = parseModelElement(el(`<p>@@Q 1</p><p>Where do</p><p>@@SAM</p>`));
    expect(t.q?.text).toBe("Where do");
    expect(t.sample).toBeUndefined();
  });

  it("open = mục đang viết dở", () => {
    expect(parseModelElement(el(`<p>@@TRANSCRIPT</p><p>hi</p><p>@@FEEDBACK</p><p>Bạn nói | Sửa</p>`)).open).toBe("FEEDBACK");
    expect(parseModelElement(el(`<p>@@Q 1</p><p>Where do</p><p>@@SAM</p>`)).open).toBe("Q");
  });

  it("turn lazy chưa render => empty", () => {
    expect(parseModelElement(el(``)).empty).toBe(true);
  });

  it("model cũ không marker => hiện như nhận xét", () => {
    const t = parseModelElement(el(`<p>Chào bạn</p>`));
    expect(t.feedback).toContain("Chào bạn");
  });
});

describe("bản sửa đầy đủ và stream trực tiếp", () => {
  const html = `<p>@@TRANSCRIPT</p><p>I go school yesterday and I very like it.</p>
    <p>@@FIXED</p><p>I went to school yesterday and I really liked it.</p>
    <p>@@BETTER</p><p>I headed to school yesterday, and honestly, I loved it.</p>
    <p>@@FEEDBACK</p><table><tr><th>Loại</th><th>Bạn nói</th><th>Sửa thành</th><th>Vì sao</th></tr><tr><td>Ngữ pháp</td><td>I go school</td><td>I went to school</td><td>quá khứ + giới từ</td></tr></table>
    <p>@@DRILL</p><p>I went to school yesterday.</p><p>Nhấn vào went.</p>`;
  it("đọc FIXED, BETTER, DRILL", () => {
    const t = parseModelElement(el(html));
    expect(t.fixed).toBe("I went to school yesterday and I really liked it.");
    expect(t.better).toBe("I headed to school yesterday, and honestly, I loved it.");
    expect(t.drill).toContain("Nhấn vào went");
    expect(t.feedback).toContain("<table>");
  });
  it("liveSections tách theo mục, bảng thành dòng chữ", async () => {
    const { liveSections } = await import("@/lib/parser");
    const s = liveSections(el(html));
    expect(s.map((x) => x.label)).toEqual(["Bạn nói", "Bản sửa đầy đủ", "Người bản xứ sẽ nói", "Nhận xét", "Bài tập"]);
    expect(s[3].text).toContain("Ngữ pháp  |  I go school");
  });
});

describe("1.1.1: NOTES ẩn, bảng lỗi, điểm tính lại", () => {
  const html = `<p>@@TRANSCRIPT</p><p>Last weekend I go to the beach with my family and we eat a lot.</p>
    <p>@@NOTES</p><p>PRON −10: /θ/ → /t/</p><p>NATIVE = 66</p>
    <p>@@SCORE NATIVE 80 | PRON 62 | FLU 70 | NAT 60 | GRA 72 | VOC 68</p>
    <p>@@FEEDBACK</p><table><thead><tr><th>Loại</th><th>Bạn nói</th><th>Sửa thành</th><th>Vì sao</th></tr></thead><tbody><tr><td>Ngữ pháp</td><td>I go</td><td>I went</td><td>quá khứ</td></tr><tr><td>Phát âm</td><td>wit</td><td>with</td><td>LỖI LẶP LẠI</td></tr></tbody></table>
    <p>@@PRON</p><ul><li>with — /wɪð/ — đọc thành /wɪt/ — cao</li><li>seafood — /ˈsiːfuːd/ — mất /d/ — vừa</li></ul>`;
  it("NOTES không lộ ra nhận xét hay giao diện", () => {
    const t = parseModelElement(el(html));
    expect(t.feedback).not.toContain("PRON −10");
    expect(JSON.stringify(t)).not.toContain("/θ/ → /t/");
  });
  it("điểm NATIVE được tính lại, giữ số của model để ghi chú", () => {
    const t = parseModelElement(el(html));
    expect(t.score?.[0]).toEqual({ key: "NATIVE", value: "66" });
    expect(t.scoreRaw).toBe("80");
  });
  it("tách bảng lỗi thành dữ liệu, bỏ dòng tiêu đề", () => {
    expect(parseModelElement(el(html)).errors).toEqual([
      { type: "Ngữ pháp", said: "I go", fix: "I went", why: "quá khứ" },
      { type: "Phát âm", said: "wit", fix: "with", why: "LỖI LẶP LẠI" },
    ]);
  });
  it("ô bảng bị AI Studio bọc trong <ms-cmark-node> bên trong <tr> vẫn tách được", () => {
    const d = el(`<p>@@TRANSCRIPT</p><p>He go to school every day with his friends and teachers.</p><p>@@FEEDBACK</p><p>Nhận định: ổn.</p><div class="table-container"><table><tbody><tr id="h"></tr><tr id="r"></tr></tbody></table></div>`);
    // HTML parser không cho phần tử lạ nằm trong <tr>, nên dựng bằng DOM như Angular làm.
    const fill = (id: string, tag: string, cells: string[]) => {
      const w = document.createElement("ms-cmark-node");
      cells.forEach((c) => { const td = document.createElement(tag); td.textContent = c; w.appendChild(td); });
      d.querySelector("#" + id)!.appendChild(w);
    };
    fill("h", "th", ["Loại", "Bạn nói", "Sửa thành", "Vì sao"]);
    fill("r", "td", ["Ngữ pháp", "he go", "he goes", "ngôi ba số ít"]);
    const t = parseModelElement(d);
    expect(t.errors).toEqual([{ type: "Ngữ pháp", said: "he go", fix: "he goes", why: "ngôi ba số ít" }]);
  });
  it("bảng markdown chưa render (dấu |) vẫn tách được", () => {
    const t = parseModelElement(el(`<p>@@FEEDBACK</p><p>Nhận định: ổn.</p><p>| Loại | Bạn nói | Sửa thành | Vì sao |</p><p>|---|---|---|---|</p><p>| Ngữ pháp | he go | he goes | ngôi ba số ít |</p>`));
    expect(t.errors).toEqual([{ type: "Ngữ pháp", said: "he go", fix: "he goes", why: "ngôi ba số ít" }]);
  });
  it("bản tổng kết (không transcript) giữ nguyên điểm trung bình", () => {
    const t = parseModelElement(el(`<p>@@SCORE NATIVE 61 | PRON 40 | FLU 70 | NAT 60 | GRA 72 | VOC 68</p>`));
    expect(t.score?.[0].value).toBe("61");
    expect(t.scoreRaw).toBeUndefined();
  });
  it("liveSections chỉ hiện nhãn của NOTES, không hiện nội dung", async () => {
    const { liveSections } = await import("@/lib/parser");
    const s = liveSections(el(html));
    const notes = s.find((x) => x.label === "Giám khảo đang phân tích");
    expect(notes?.text).toBe("");
    expect(s.map((x) => x.text).join(" ")).not.toContain("NATIVE = 66");
  });
});
