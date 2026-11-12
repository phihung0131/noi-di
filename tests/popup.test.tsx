// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Popup } from "@/popup/Popup";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
if (!window.matchMedia) window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as never;

function mockChrome(tab: { id: number; url: string } | null, status: unknown | Error) {
  (globalThis as unknown as { chrome: unknown }).chrome = {
    tabs: {
      query: vi.fn(async () => (tab ? [tab] : [])),
      sendMessage: vi.fn(async () => { if (status instanceof Error) throw status; return status; }),
      create: vi.fn(), reload: vi.fn(),
    },
    storage: { local: { get: (k: string, cb: (o: object) => void) => cb({}), set: (_o: object, cb?: () => void) => cb?.() } },
  };
}
async function render() {
  const el = document.createElement("div"); document.body.appendChild(el);
  await act(async () => { createRoot(el).render(<Popup />); });
  await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
  return el;
}
const session = { lang: "en-US", mode: "guided", level: "B1", output: "vi", topic: "" };

describe("Popup", () => {
  beforeEach(() => { document.body.innerHTML = ""; });

  it("không ở AI Studio: nút mở AI Studio", async () => {
    mockChrome({ id: 1, url: "https://example.com/" }, undefined);
    expect((await render()).textContent).toContain("Mở AI Studio");
  });
  it("tab cũ chưa kết nối: nút tải lại", async () => {
    mockChrome({ id: 1, url: "https://aistudio.google.com/prompts/x" }, new Error("no receiver"));
    expect((await render()).textContent).toContain("Tải lại tab này");
  });
  it("đã có buổi: nút Bắt đầu nói + thông tin buổi", async () => {
    mockChrome({ id: 1, url: "https://aistudio.google.com/prompts/x" }, { on: true, hasSession: true, rec: "idle", model: "gemini-3.5-flash-lite", session, generating: false, score: 62 });
    const t = (await render()).textContent ?? "";
    expect(t).toContain("Bắt đầu nói"); expect(t).toContain("62%"); expect(t).toContain("gemini-3.5-flash-lite");
  });
  it("chưa bật: nút mở chế độ luyện nói; chưa có buổi: tạo buổi mới", async () => {
    mockChrome({ id: 1, url: "https://aistudio.google.com/prompts/x" }, { on: false, hasSession: false, rec: "idle", model: "", session, generating: false });
    expect((await render()).textContent).toContain("Mở chế độ luyện nói");
    document.body.innerHTML = "";
    mockChrome({ id: 1, url: "https://aistudio.google.com/prompts/x" }, { on: true, hasSession: false, rec: "idle", model: "", session, generating: false });
    expect((await render()).textContent).toContain("Tạo buổi luyện mới");
  });
});
