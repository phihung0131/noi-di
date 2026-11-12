import { describe, it, expect } from "vitest";
import { parseModelElement } from "@/lib/parser";

const el = (h: string) => { const d = document.createElement("div"); d.innerHTML = h; return d; };

describe("parseModelElement", () => {
  it("đọc đủ các marker", () => {
    const t = parseModelElement(el(`
      <p>@@TRANSCRIPT</p><p>I am work at a company.</p>
      <p>@@SCORE BAND 6.0 | FC 6 | LR 6.5 | GRA 5.5 | PR 6</p>
      <p>@@FEEDBACK</p><table><tr><th>Bạn nói</th><th>Sửa</th></tr><tr><td>I am work</td><td>I work</td></tr></table><ul><li>Tốt <strong>nhịp</strong></li></ul>
      <p>@@VOCAB</p><ul><li>work for — làm cho</li><li>quite demanding — khá áp lực</li></ul>
      <p>@@VERDICT pass</p>
      <p>@@Q 2</p><p>"Do you like your job?"</p>
      <p>@@TR</p><p>Bạn có thích công việc không?</p>
      <p>@@HINT</p><ul><li>ý một</li></ul>
      <p>@@SAMPLE</p><p>Yes, I do. It is rewarding.</p><p>@@SAMPLETR</p><p>Có. Nó rất đáng giá.</p>`));
    expect(t.empty).toBe(false);
    expect(t.q).toEqual({ n: "2", text: "Do you like your job?" });
    expect(t.score?.map((s) => s.key)).toEqual(["BAND", "FC", "LR", "GRA", "PR"]);
    expect(t.verdict).toBe("pass");
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

  it("stream dở: marker chưa đủ không làm vỡ", () => {
    const t = parseModelElement(el(`<p>@@Q 1</p><p>Where do</p><p>@@SAM</p>`));
    expect(t.q?.text).toBe("Where do");
    expect(t.sample).toBeUndefined();
  });

  it("turn lazy chưa render => empty", () => {
    expect(parseModelElement(el(``)).empty).toBe(true);
  });

  it("model cũ không marker => hiện như nhận xét", () => {
    const t = parseModelElement(el(`<p>Chào bạn</p>`));
    expect(t.feedback).toContain("Chào bạn");
  });
});
