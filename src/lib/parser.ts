import { SEL } from "./selectors";
import type { ModelTurn, ScoreItem } from "./types";

const THOUGHT = SEL.thought.join(", ");

/* ---------- làm sạch HTML của AI Studio -> HTML tối giản, an toàn ---------- */
const ALLOWED = new Set(["P", "UL", "OL", "LI", "STRONG", "EM", "B", "I", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "BR", "CODE", "BLOCKQUOTE", "H1", "H2", "H3", "H4", "H5"]);
const escapeHtml = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));

export function sanitize(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.nodeValue ?? "");
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as Element;
  const inner = Array.from(el.childNodes).map(sanitize).join("");
  if (!ALLOWED.has(el.tagName)) return inner;
  const tag = el.tagName.toLowerCase();
  if (tag === "br") return "<br>";
  if (tag === "td" || tag === "th") {
    const cs = el.getAttribute("colspan");
    return `<${tag}${cs && /^\d+$/.test(cs) ? ` colspan="${cs}"` : ""}>${inner}</${tag}>`;
  }
  return `<${tag}>${inner}</${tag}>`;
}

const textOf = (el: Element): string => {
  const c = el.cloneNode(true) as Element;
  c.querySelectorAll("br").forEach((b) => b.replaceWith("\n"));
  return (c.textContent ?? "").replace(/ /g, " ");
};

/** Các khối cấp cao nhất của một turn (bỏ phần "thinking"). */
export function topBlocks(turn: Element): Element[] {
  const all = Array.from(turn.querySelectorAll("p, blockquote, table, ul, ol, h1, h2, h3, h4, h5"));
  return all.filter((el) => !el.closest(THOUGHT) && !el.parentElement?.closest("blockquote, table, ul, ol, p, li"));
}

interface Section { name: string; args: string; paras: string[]; html: string[] }
const MARKER = /^\s*@@([A-Z]+)(?:[ \t]+(.*))?$/;
const KNOWN = new Set(["PART", "Q", "SAY", "TR", "ROMAN", "HINT", "SAMPLE", "SAMPLETR", "SAMPLEROMAN", "TRANSCRIPT", "SCORE", "FEEDBACK", "VOCAB", "PRON", "VERDICT", "PREP", "FIXED", "BETTER", "DRILL"]);

/** Tham số có thể nằm ngay trên dòng marker hoặc ở dòng kế tiếp (AI Studio gộp chung một đoạn). */
const argText = (s: Section) => `${s.args} ${s.paras.join(" ")}`.trim();
const unquote = (t: string) => t.replace(/^["“”'‘’「」『』]+|["“”'‘’「」『』]+$/g, "").trim();
const oneLine = (paras: string[]) => paras.join(" ").replace(/\s+/g, " ").trim();

function listItems(sec: Section | undefined, blocks: Element[] | undefined): string[] {
  if (!sec) return [];
  const items: string[] = [];
  blocks?.forEach((b) => b.querySelectorAll("li").forEach((li) => items.push((li.textContent ?? "").replace(/\s+/g, " ").trim())));
  if (!items.length) sec.paras.forEach((p) => items.push(p.replace(/^[-*•]\s*/, "")));
  return items.filter(Boolean);
}

export function parseModelElement(turn: Element): Omit<ModelTurn, "key"> {
  const blocks = topBlocks(turn);
  const secs: Section[] = [];
  const secBlocks = new Map<Section, Element[]>();
  let cur: Section | null = null;
  let anyText = false;
  const pre: string[] = [];

  for (const b of blocks) {
    if (b.tagName === "P") {
      const lines = textOf(b).split("\n");
      const hasMarker = lines.some((l) => MARKER.test(l));
      if (!hasMarker) {
        const t = lines.join(" ").replace(/\s+/g, " ").trim();
        if (!t) continue;
        anyText = true;
        if (cur) { cur.paras.push(t); cur.html.push(`<p>${sanitize(b)}</p>`); } else pre.push(`<p>${sanitize(b)}</p>`);
        continue;
      }
      for (const line of lines) {
        const m = MARKER.exec(line);
        if (m) {
          anyText = true;
          if (!KNOWN.has(m[1])) { cur = null; continue; }
          cur = { name: m[1], args: (m[2] ?? "").trim(), paras: [], html: [] };
          secs.push(cur);
        } else if (line.trim() && cur) { cur.paras.push(line.trim()); cur.html.push(`<p>${escapeHtml(line.trim())}</p>`); }
      }
    } else {
      anyText ||= (b.textContent ?? "").trim().length > 0;
      const h = sanitize(b);
      if (cur) { cur.html.push(h); (secBlocks.get(cur) ?? secBlocks.set(cur, []).get(cur)!).push(b); } else pre.push(h);
    }
  }

  const get = (n: string) => secs.filter((s) => s.name === n).pop();
  const out: Omit<ModelTurn, "key"> = { role: "model", empty: !anyText };
  if (secs.length) out.open = secs[secs.length - 1].name;
  const q = get("Q");
  if (q) out.q = { n: q.args.replace(/\D/g, ""), text: unquote(oneLine(q.paras).replace(/^\s*Q\s*\d+\s*[:：.)]\s*/i, "")) };
  const say = get("SAY"); if (say) out.say = oneLine(say.paras);
  const tr = get("TR"); if (tr) out.tr = oneLine(tr.paras);
  const roman = get("ROMAN"); if (roman) out.roman = oneLine(roman.paras);
  const hint = get("HINT"); if (hint) out.hint = hint.html.join("");
  const sample = get("SAMPLE");
  if (sample) out.sample = { text: unquote(oneLine(sample.paras)), tr: oneLine(get("SAMPLETR")?.paras ?? []), roman: oneLine(get("SAMPLEROMAN")?.paras ?? []) };
  const ts = get("TRANSCRIPT"); if (ts) out.transcript = oneLine(ts.paras);
  const fixed = get("FIXED"); if (fixed) out.fixed = unquote(oneLine(fixed.paras));
  const better = get("BETTER"); if (better) out.better = unquote(oneLine(better.paras));
  const drill = get("DRILL"); if (drill) out.drill = drill.html.join("");
  const fb = get("FEEDBACK"); if (fb) out.feedback = fb.html.join("");
  const vocab = get("VOCAB"); if (vocab) out.vocab = listItems(vocab, secBlocks.get(vocab));
  const pron = get("PRON"); if (pron) out.pron = listItems(pron, secBlocks.get(pron));
  const part = get("PART"); if (part) out.part = part.args.replace(/\D/g, "") || undefined;
  const prep = get("PREP"); if (prep && /\d/.test(argText(prep))) out.prep = parseInt(argText(prep).replace(/\D/g, ""), 10);
  const vd = get("VERDICT"); if (vd) out.verdict = /pass/i.test(argText(vd)) ? "pass" : /retry/i.test(argText(vd)) ? "retry" : undefined;
  const sc = get("SCORE");
  if (sc) {
    const items: ScoreItem[] = [];
    for (const m of argText(sc).matchAll(/([A-Z]+)\s*[:=]?\s*([0-9]+(?:\.[0-9])?)/g)) items.push({ key: m[1], value: m[2] });
    if (items.length) out.score = items;
  }
  // Model cũ / lệch giao thức: hiện nguyên văn như phần nhận xét.
  if (!secs.length && pre.length) out.feedback = pre.join("");
  return out;
}

const LABELS: Record<string, string> = {
  TRANSCRIPT: "Bạn nói", SCORE: "Điểm", FIXED: "Bản sửa đầy đủ", BETTER: "Người bản xứ sẽ nói", FEEDBACK: "Nhận xét", PRON: "Phát âm", VOCAB: "Nói tự nhiên hơn",
  DRILL: "Bài tập", VERDICT: "Kết luận", Q: "Câu hỏi", TR: "Dịch", SAY: "Giám khảo nói", HINT: "Gợi ý", SAMPLE: "Câu mẫu", SAMPLETR: "Dịch câu mẫu", ROMAN: "Phiên âm", SAMPLEROMAN: "Phiên âm câu mẫu", PREP: "Chuẩn bị", PART: "Phần",
};
export interface LiveSection { label: string; text: string }

/** Nội dung model đang stream, dạng chữ thuần theo từng mục: để hiện trực tiếp, chưa dựng giao diện. */
export function liveSections(turn: Element): LiveSection[] {
  const out: LiveSection[] = [];
  let cur: LiveSection | null = null;
  const push = (line: string) => { if (!line.trim()) return; if (!cur) { cur = { label: "", text: "" }; out.push(cur); } cur.text += (cur.text ? "\n" : "") + line.trim(); };
  for (const b of topBlocks(turn)) {
    if (b.tagName === "TABLE") {
      b.querySelectorAll("tr").forEach((tr) => push(Array.from(tr.children).map((c) => (c.textContent ?? "").replace(/\s+/g, " ").trim()).join("  |  ")));
      continue;
    }
    if (b.tagName === "UL" || b.tagName === "OL") { b.querySelectorAll("li").forEach((li) => push("• " + (li.textContent ?? "").replace(/\s+/g, " ").trim())); continue; }
    for (const line of textOf(b).split("\n")) {
      const m = MARKER.exec(line);
      if (m) {
        if (KNOWN.has(m[1])) { cur = { label: LABELS[m[1]] ?? m[1], text: "" }; out.push(cur); if (m[2]) push(m[2]); }
        continue;
      }
      push(line.replace(/\s+/g, " "));
    }
  }
  return out;
}
