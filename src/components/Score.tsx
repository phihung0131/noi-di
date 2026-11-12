import type { ScoreItem } from "@/lib/types";

const LABEL: Record<string, string> = {
  BAND: "Band", FC: "Trôi chảy & mạch lạc", LR: "Từ vựng", GRA: "Ngữ pháp", PR: "Phát âm",
  CEFR: "CEFR", FLU: "Trôi chảy", VOC: "Từ vựng", HIEU: "Mức hiểu", TRALOI: "Câu trả lời",
};
const isNum = (v: string) => /^\d/.test(v);

export function Score({ items }: { items: ScoreItem[] }) {
  const overall = items.find((i) => i.key === "BAND" || i.key === "CEFR");
  const rest = items.filter((i) => i !== overall && isNum(i.value));
  const max = items.some((i) => i.key === "BAND") ? 9 : 5;
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg bg-muted/60 p-3">
      {overall && (
        <div className="min-w-[64px] text-center">
          <div className="font-serif text-4xl font-semibold leading-none tabular-nums">{overall.value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{LABEL[overall.key]}</div>
        </div>
      )}
      <div className="grid min-w-[220px] flex-1 gap-x-5 gap-y-2 sm:grid-cols-2">
        {rest.map((i) => (
          <div key={i.key}>
            <div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">{LABEL[i.key] ?? i.key}</span><span className="font-medium tabular-nums">{i.value}</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border" role="meter" aria-valuenow={parseFloat(i.value)} aria-valuemin={0} aria-valuemax={max} aria-label={LABEL[i.key] ?? i.key}>
              <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${Math.min(100, (parseFloat(i.value) / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
