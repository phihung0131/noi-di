import { describe, it, expect, beforeEach } from "vitest";
import { lastDomActivity, resetChatCache, snapshot } from "@/lib/bridge";

const turn = (role: "user" | "model", text: string) =>
  `<div class="chat-turn-container ${role}"><ms-text-chunk>${text}</ms-text-chunk></div>`;

describe("snapshot với turn bị AI Studio ảo hoá", () => {
  beforeEach(() => { document.body.innerHTML = ""; resetChatCache(); });

  it("turn đã có nội dung rồi bị render rỗng không làm DOM 'đổi' mãi mãi", async () => {
    document.body.innerHTML = turn("user", "Start") + turn("user", "My answer is in the audio");
    expect(snapshot()).toHaveLength(2);
    // AI Studio gỡ nội dung turn ra khỏi DOM khi nó ở ngoài màn hình.
    document.body.querySelectorAll("ms-text-chunk")[1].textContent = "";
    snapshot();
    const after = lastDomActivity();
    await new Promise((r) => setTimeout(r, 20));
    const turns = snapshot();
    expect(lastDomActivity()).toBe(after);
    // vẫn giữ bản đã cache, không bị thay bằng turn rỗng
    expect(turns[1].empty).toBe(false);
    expect(turns[1].role === "user" && turns[1].text).toBe("My answer is in the audio");
  });
});
