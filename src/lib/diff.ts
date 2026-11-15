/** So khớp từng từ (hoặc từng chữ với tiếng Nhật/Trung) giữa câu học viên nói và câu đã sửa / câu gốc. */
export type DiffOp = { op: "same" | "add" | "del"; text: string };

const CJK = /[぀-ヿ㐀-鿿]/;

export function tokenize(s: string): string[] {
  const t = s.trim();
  if (!t) return [];
  if (CJK.test(t)) return Array.from(t.replace(/\s+/g, ""));
  return t.split(/\s+/);
}

/** Bỏ dấu câu và hoa/thường khi so (giữ chữ hiển thị nguyên văn). */
const key = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}'’]/gu, "").replace(/’/g, "'");

/** LCS cổ điển; câu nói thường dưới vài trăm từ nên O(n·m) đủ nhanh. */
export function diffWords(from: string, to: string): DiffOp[] {
  const a = tokenize(from), b = tokenize(to);
  const ka = a.map(key), kb = b.map(key);
  const n = a.length, m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    L[i][j] = ka[i] && ka[i] === kb[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: DiffOp[] = [];
  const push = (op: DiffOp["op"], text: string) => {
    const last = out[out.length - 1];
    const sep = CJK.test(text) ? "" : " ";
    if (last && last.op === op) last.text += sep + text; else out.push({ op, text });
  };
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (ka[i] && ka[i] === kb[j]) { push("same", b[j]); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) push("del", a[i++]);
    else push("add", b[j++]);
  }
  while (i < n) push("del", a[i++]);
  while (j < m) push("add", b[j++]);
  return out;
}

/** Tỉ lệ từ của `ref` được nói ra (0..1): dùng cho chế độ đọc nhại. */
export function coverage(said: string, ref: string): number {
  const ops = diffWords(said, ref);
  const total = tokenize(ref).length;
  if (!total) return 0;
  const same = ops.filter((o) => o.op === "same").reduce((s, o) => s + tokenize(o.text).length, 0);
  return same / total;
}
