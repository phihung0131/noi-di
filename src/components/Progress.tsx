import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useState } from "react";
import { appStore, setDialog } from "@/lib/controller";
import { LANGS, MODES } from "@/lib/langs";
import { computeProgress } from "@/lib/progress";
import { storage } from "@/lib/storage";
import type { HistoryItem } from "@/lib/types";
import { Dialog, DialogContent } from "./ui/dialog";
import { Select } from "./ui/select";

const LABEL: Record<string, string> = { PRON: "Phát âm & ngữ điệu", FLU: "Trôi chảy", NAT: "Tự nhiên", GRA: "Ngữ pháp", VOC: "Từ vựng", HIEU: "Mức hiểu", TRALOI: "Câu trả lời", ACC: "Khớp câu gốc" };

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-serif text-2xl font-semibold tabular-nums">{value}</div>
      {note && <div className="text-xs text-muted-foreground">{note}</div>}
    </div>
  );
}

function Chart({ values }: { values: number[] }) {
  const W = 640, H = 160, P = 24;
  if (values.length < 2) return <p className="py-6 text-center text-sm text-muted-foreground">Cần ít nhất 2 lượt đã chấm để vẽ biểu đồ.</p>;
  const x = (i: number) => P + (i / (values.length - 1)) * (W - 2 * P);
  const y = (v: number) => H - P - (v / 100) * (H - 2 * P);
  // trung bình trượt 5 lượt cho dễ thấy xu hướng
  const ma = values.map((_, i) => { const w = values.slice(Math.max(0, i - 4), i + 1); return w.reduce((a, b) => a + b, 0) / w.length; });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Điểm giống người bản xứ qua ${values.length} lượt gần nhất, mới nhất ${values[values.length - 1]}`}>
      {[25, 50, 75].map((g) => <g key={g}><line x1={P} x2={W - P} y1={y(g)} y2={y(g)} className="stroke-border" strokeDasharray="3 4" /><text x={4} y={y(g) + 4} className="fill-muted-foreground text-[10px]">{g}</text></g>)}
      <polyline points={values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" className="stroke-muted-foreground/50" strokeWidth={1.5} />
      {values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={2.5} className="fill-muted-foreground/60" />)}
      <polyline points={ma.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function ProgressDialog() {
  const open = useStore(appStore, (s) => s.dialog === "progress");
  const session = useStore(appStore, (s) => s.session);
  const [all, setAll] = useState<HistoryItem[] | null>(null);
  const [lang, setLang] = useState(session.lang);
  const [mode, setMode] = useState("all");
  useEffect(() => { if (open) { setLang(session.lang); void storage.history().then(setAll); } }, [open, session.lang]);
  const langs = useMemo(() => [...new Set([session.lang, ...(all ?? []).map((h) => h.lang)])], [all, session.lang]);
  const p = useMemo(() => computeProgress((all ?? []).filter((h) => h.lang === lang && (mode === "all" || h.mode === mode))), [all, lang, mode]);
  const delta = p.last7 !== undefined && p.prev7 !== undefined ? p.last7 - p.prev7 : undefined;

  return (
    <Dialog open={open} onOpenChange={(o) => setDialog(o ? "progress" : null)}>
      <DialogContent title="Tiến bộ của bạn" description="Tính từ các lượt đã chấm, lưu trong trình duyệt này." wide>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select ariaLabel="Ngôn ngữ" value={lang} onChange={setLang} options={langs.map((l) => ({ value: l, label: LANGS[l]?.name ?? l }))} />
            <Select ariaLabel="Chế độ" value={mode} onChange={setMode} options={[{ value: "all", label: "Mọi chế độ" }, ...MODES.map((m) => ({ value: m.id, label: m.label }))]} />
          </div>
          {all && p.total === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Chưa có lượt nào được chấm cho lựa chọn này. Luyện vài câu rồi quay lại nhé.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Lượt đã chấm" value={String(p.total)} note={`${p.days} ngày luyện`} />
                <Stat label="Chuỗi ngày" value={String(p.streak)} note={p.streak ? "ngày liên tiếp" : "luyện hôm nay để bắt đầu"} />
                <Stat label="TB 7 ngày qua" value={p.last7 !== undefined ? String(p.last7) : "–"} note={delta !== undefined ? `${delta >= 0 ? "+" : ""}${delta} so với 7 ngày trước` : undefined} />
                <Stat label="Mới nhất" value={p.recent.length ? String(p.recent[p.recent.length - 1]) : "–"} note="giống người bản xứ" />
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="mb-1 flex items-center justify-between text-sm"><span className="font-medium">Điểm qua {p.recent.length} lượt gần nhất</span><span className="text-xs text-muted-foreground">đường đậm: trung bình 5 lượt</span></div>
                <Chart values={p.recent} />
              </div>
              {!!p.criteria.length && (
                <div>
                  <h4 className="mb-2 text-sm font-medium">Tiêu chí (20 lượt gần nhất), yếu nhất trước</h4>
                  <div className="grid gap-x-5 gap-y-2 sm:grid-cols-2">
                    {p.criteria.map((c, i) => (
                      <div key={c.key}>
                        <div className="mb-1 flex justify-between text-xs"><span className={i === 0 ? "font-medium text-foreground" : "text-muted-foreground"}>{LABEL[c.key] ?? c.key}{i === 0 && " · nên tập trung"}</span><span className="tabular-nums">{c.value}</span></div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary" style={{ width: `${c.value}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
