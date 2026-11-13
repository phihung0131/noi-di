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
