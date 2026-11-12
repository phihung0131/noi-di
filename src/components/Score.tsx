import type { ScoreItem } from "@/lib/types";

const LABEL: Record<string, string> = {
  NATIVE: "Giống người bản xứ", PRON: "Phát âm & ngữ điệu", FLU: "Trôi chảy", NAT: "Tự nhiên", GRA: "Ngữ pháp",
  VOC: "Từ vựng", HIEU: "Mức hiểu", TRALOI: "Câu trả lời",
};
const bandColor = (v: number) => (v >= 80 ? "text-success" : v >= 55 ? "text-foreground" : "text-destructive");

export function Score({ items }: { items: ScoreItem[] }) {
  const overall = items.find((i) => i.key === "NATIVE");
  const rest = items.filter((i) => i !== overall);
  const n = overall ? Math.round(parseFloat(overall.value)) : 0;
  const R = 30, C = 2 * Math.PI * R;
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg bg-muted/60 p-3">
      {overall && (
        <div className="flex items-center gap-3">
          <div className="relative h-[72px] w-[72px]" role="meter" aria-valuenow={n} aria-valuemin={0} aria-valuemax={100} aria-label="Mức giống người bản xứ">
            <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="36" cy="36" r={R} fill="none" strokeWidth="6" className="stroke-border" />
              <circle cx="36" cy="36" r={R} fill="none" strokeWidth="6" strokeLinecap="round" className="stroke-primary transition-[stroke-dashoffset] duration-700" strokeDasharray={C} strokeDashoffset={C * (1 - n / 100)} />
            </svg>
            <div className={`absolute inset-0 flex items-center justify-center font-serif text-2xl font-semibold tabular-nums ${bandColor(n)}`}>{n}</div>
          </div>
          <div className="text-sm leading-tight"><div className="font-medium">Giống người bản xứ</div><div className="text-xs text-muted-foreground">trên 100 điểm, ước lượng</div></div>
        </div>
      )}
      <div className="grid min-w-[220px] flex-1 gap-x-5 gap-y-2 sm:grid-cols-2">
        {rest.map((i) => {
          const v = Math.max(0, Math.min(100, parseFloat(i.value)));
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
