import { describe, it, expect } from "vitest";
import { all, byLabel, first, LABEL } from "@/lib/selectors";

const dom = (h: string) => { const d = document.createElement("div"); d.innerHTML = h; return d; };

describe("selectors", () => {
  it("first/all thử lần lượt các ứng viên, bỏ qua selector hỏng", () => {
    const d = dom(`<section class="run-button-x"><button>Run</button></section>`);
    expect(first(["ms-run-button button", "[class*='run-button' i] button"], d)?.textContent).toBe("Run");
    expect(first(["[[bad"], d)).toBeNull();
    expect(all(["nope", "button"], d)).toHaveLength(1);
  });
  it("byLabel dò theo chữ hoặc aria-label, kể cả tiếng Việt", () => {
    const d = dom(`<button aria-label="Start recording"></button><button>Dừng ghi</button><button>Close</button>`);
    expect(byLabel(LABEL.startRec, d)).toBeTruthy();
    expect(byLabel(LABEL.stopRec, d)?.textContent).toBe("Dừng ghi");
    expect(byLabel(LABEL.close, d)?.textContent).toBe("Close");
    expect(byLabel(LABEL.addToPrompt, d)).toBeUndefined();
  });
});
