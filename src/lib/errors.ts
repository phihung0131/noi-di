export type ErrorKind = "limit" | "blocked" | "other";

/** Phân loại thông báo lỗi mà AI Studio in trong lượt của model. */
export function classifyError(message: string): ErrorKind {
  if (/rate.?limit|quota|resource.?exhaust|too many requests|\b429\b|exceeded|usage limit|limit (reached|exceeded)/i.test(message)) return "limit";
  if (/blocked|safety|prohibited|policy/i.test(message)) return "blocked";
  return "other";
}

/** Chọn model nhẹ hơn: ưu tiên Lite, rồi Gemma, rồi Flash; bỏ model trả phí, ảnh/âm thanh/video và model đang dùng. */
export function pickLighter<T extends { id: string; paid: boolean }>(items: T[], currentId: string): T | undefined {
  const score = (id: string) => (/lite/i.test(id) ? 3 : /gemma/i.test(id) ? 2 : /flash/i.test(id) ? 1 : 0);
  return items
    .filter((x) => x.id && x.id !== currentId && !x.paid && !/image|banana|nano|live|tts|audio|veo|imagen|music|embed/i.test(x.id) && score(x.id) > 0)
    .map((x, i) => ({ x, i, s: score(x.id) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)[0]?.x;
}
