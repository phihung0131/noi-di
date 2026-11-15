import type { ScoreItem } from "@/lib/types";

const LABEL: Record<string, string> = {
  NATIVE: "Giống người bản xứ", PRON: "Phát âm & ngữ điệu", FLU: "Trôi chảy", NAT: "Tự nhiên", GRA: "Ngữ pháp",
  VOC: "Từ vựng", HIEU: "Mức hiểu", TRALOI: "Câu trả lời", ACC: "Khớp câu gốc",
  // Luyện thi
  FC: "Trôi chảy & mạch lạc", LR: "Vốn từ", P: "Phát âm", TASK: "Hoàn thành nhiệm vụ", LANG: "Sử dụng ngôn ngữ", DEL: "Truyền đạt",
};
/** Điểm tổng theo thang: mức giống bản xứ, điểm tổng bài thi (0–100) hoặc band IELTS (0–9). */
const OVERALL: Record<string, { title: string; sub: string; max: number }> = {
  NATIVE: { title: "Giống người bản xứ", sub: "trên 100 điểm, ước lượng", max: 100 },
  TOTAL: { title: "Điểm bài thi", sub: "trên 100, ước lượng để luyện", max: 100 },
  BAND: { title: "Band IELTS", sub: "0–9, ước lượng để luyện", max: 9 },
};
const bandColor = (v: number) => (v >= 80 ? "text-success" : v >= 55 ? "text-foreground" : "text-destructive");

export function Score({ items, raw }: { items: ScoreItem[]; raw?: string }) {
  const overall = items.find((i) => i.key in OVERALL);
  const meta = OVERALL[overall?.key ?? "NATIVE"];
  const rest = items.filter((i) => i !== overall);
  const v0 = overall ? parseFloat(overall.value) : 0;
  const n = meta.max === 100 ? Math.round(v0) : v0;
  const pct = meta.max === 100 ? n : (n / meta.max) * 100;
  const R = 30, C = 2 * Math.PI * R;
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg bg-muted/60 p-3">
      {overall && (
        <div className="flex items-center gap-3">
          <div className="relative h-[72px] w-[72px]" role="meter" aria-valuenow={n} aria-valuemin={0} aria-valuemax={meta.max} aria-label={meta.title}>
            <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="36" cy="36" r={R} fill="none" strokeWidth="6" className="stroke-border" />
              <circle cx="36" cy="36" r={R} fill="none" strokeWidth="6" strokeLinecap="round" className="stroke-primary transition-[stroke-dashoffset] duration-700" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} />
            </svg>
            <div className={`absolute inset-0 flex items-center justify-center font-serif text-2xl font-semibold tabular-nums ${bandColor(pct)}`}>{n}</div>
          </div>
          <div className="text-sm leading-tight"><div className="font-medium">{meta.title}</div><div className="text-xs text-muted-foreground">{meta.sub}</div>
            {raw && <div className="mt-0.5 text-xs text-muted-foreground" title="Nói Đi tính lại điểm tổng theo đúng công thức từ điểm từng tiêu chí và các giới hạn bắt buộc.">Đã tính lại theo công thức (giám khảo ghi {raw})</div>}</div>
        </div>
      )}
      <div className="grid min-w-[220px] flex-1 gap-x-5 gap-y-2 sm:grid-cols-2">
        {rest.map((i) => {
          const v = Math.max(0, Math.min(100, (parseFloat(i.value) / meta.max) * 100));
          return (
            <div key={i.key}>
              <div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">{LABEL[i.key] ?? i.key}</span><span className="font-medium tabular-nums">{i.value}</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-border" role="meter" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={LABEL[i.key] ?? i.key}>
                <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${v}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
