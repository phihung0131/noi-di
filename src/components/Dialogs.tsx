import { useStore } from "@tanstack/react-store";
import { Check, Loader2, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { listModels, type ModelInfo } from "@/lib/bridge";
import { appStore, collectDiagnostics, isLocked, openReport, pickModel, prepareCapture, setDialog, startNewSession, updatePrefs } from "@/lib/controller";
import { DonateView, ReportView } from "./Support";
import { LANGS, LEVELS, MODES } from "@/lib/langs";
import { onVoices, voicesFor } from "@/lib/speech";
import { storage } from "@/lib/storage";
import type { Mode, SessionConfig } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Dialog, DialogContent } from "./ui/dialog";
import { Select } from "./ui/select";
import { Switch } from "./ui/switch";

const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <label className="block space-y-1.5"><span className="text-sm font-medium">{label}</span>{children}{hint && <span className="block text-xs text-muted-foreground">{hint}</span>}</label>
);

export function NewSessionDialog() {
  const open = useStore(appStore, (s) => s.dialog === "new");
  const [cfg, setCfg] = useState<SessionConfig | null>(null);
  useEffect(() => { if (open) void storage.lastConfig().then(setCfg); }, [open]);
  const c = cfg;
  const upd = (p: Partial<SessionConfig>) => setCfg((x) => {
    return { ...x!, ...p };
  });
  return (
    <Dialog open={open} onOpenChange={(o) => setDialog(o ? "new" : null)}>
      <DialogContent title="Buổi luyện mới" description="Thiết lập này được giữ nguyên suốt buổi. Muốn đổi, bạn tạo buổi mới." wide>
        {c && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void startNewSession({ ...c, topic: c.topic.trim() }); }}>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Chế độ</legend>
              <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
                {MODES.map((m) => {
                  return (
                    <button key={m.id} type="button" role="radio" aria-checked={c.mode === m.id} onClick={() => upd({ mode: m.id as Mode })}
                      className={cn("rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40", c.mode === m.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted")}>
                      <div className="text-sm font-medium">{m.label}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{m.hint}</div>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ngôn ngữ luyện nói"><Select ariaLabel="Ngôn ngữ luyện nói" value={c.lang} onChange={(v) => upd({ lang: v })} options={Object.entries(LANGS).map(([value, l]) => ({ value, label: l.name }))} /></Field>
              <Field label="Trình độ"><Select ariaLabel="Trình độ" value={c.level} onChange={(v) => upd({ level: v })} options={LEVELS.map((l) => ({ value: l.id, label: l.label }))} /></Field>
              <Field label="Giải thích bằng"><Select ariaLabel="Ngôn ngữ giải thích" value={c.output} onChange={(v) => upd({ output: v as "vi" | "en" })} options={[{ value: "vi", label: "Tiếng Việt" }, { value: "en", label: "English" }]} /></Field>
              <Field label="Chủ đề (tuỳ chọn)">
                <input value={c.topic} onChange={(e) => upd({ topic: e.target.value })} placeholder="Ví dụ: du lịch, công việc, công nghệ" className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialog(null)}>Huỷ</Button>
              <Button type="submit">Bắt đầu buổi mới</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function SettingsDialog() {
  const open = useStore(appStore, (s) => s.dialog === "settings");
  const prefs = useStore(appStore, (s) => s.prefs);
  const session = useStore(appStore, (s) => s.session);
  const locked = useStore(appStore, (s) => isLocked(s));
  const [, force] = useState(0);
  useEffect(() => onVoices(() => force((n) => n + 1)), []);
  const voices = voicesFor(session.lang);
  const row = "flex items-center justify-between gap-4";
  return (
    <Dialog open={open} onOpenChange={(o) => setDialog(o ? "settings" : null)}>
      <DialogContent title="Cài đặt" description="Áp dụng ngay, lưu cho các buổi sau.">
        <div className="space-y-5">
          {locked && (
            <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              <Lock size={16} className="mt-0.5 shrink-0" />
              <span>Ngôn ngữ, chế độ và trình độ của buổi này đã khoá: {LANGS[session.lang]?.short} · {MODES.find((m) => m.id === session.mode)?.label} · {session.level}. Tạo buổi mới để đổi.</span>
            </div>
          )}
          <Field label="Giọng đọc">
            <Select ariaLabel="Giọng đọc" value={prefs.voiceName || "auto"} onChange={(v) => void updatePrefs({ voiceName: v === "auto" ? "" : v })} options={[{ value: "auto", label: "Tự chọn giọng tốt nhất" }, ...voices.map((v) => ({ value: v.name, label: v.name }))]} />
          </Field>
          <Field label={`Tốc độ đọc: ${prefs.rate.toFixed(2)}×`}>
            <input type="range" min={0.5} max={1.2} step={0.05} value={prefs.rate} onChange={(e) => void updatePrefs({ rate: parseFloat(e.target.value) })} className="w-full accent-[hsl(var(--primary))]" aria-label="Tốc độ đọc" />
          </Field>
          <div className={row}><div><div className="text-sm font-medium">Tự đọc câu hỏi mới</div><div className="text-xs text-muted-foreground">Nghe giám khảo nói như hội thoại thật.</div></div><Switch label="Tự đọc câu hỏi mới" checked={prefs.autoPlay} onCheckedChange={(v) => void updatePrefs({ autoPlay: v })} /></div>
          <div className={row}><div><div className="text-sm font-medium">Chế độ nghe</div><div className="text-xs text-muted-foreground">Che chữ câu hỏi, chỉ nghe rồi trả lời.</div></div><Switch label="Chế độ nghe" checked={prefs.listenOnly} onCheckedChange={(v) => void updatePrefs({ listenOnly: v })} /></div>
          <div className={row}><div><div className="text-sm font-medium">Tự hiện bản dịch</div></div><Switch label="Tự hiện bản dịch" checked={prefs.showTrans} onCheckedChange={(v) => void updatePrefs({ showTrans: v })} /></div>
          <Field label="Giao diện"><Select ariaLabel="Giao diện" value={prefs.theme} onChange={(v) => void updatePrefs({ theme: v as "auto" | "light" | "dark" })} options={[{ value: "auto", label: "Theo hệ thống" }, { value: "light", label: "Sáng" }, { value: "dark", label: "Tối" }]} /></Field>
          <p className="text-xs leading-relaxed text-muted-foreground">Phím tắt: Alt+R ghi/dừng · Alt+P nghe lại · Alt+Enter gửi · Alt+L nghe lại câu hỏi.</p>
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button variant="outline" size="sm" onClick={() => openReport()}>Báo sự cố</Button>
            <Button variant="outline" size="sm" onClick={() => setDialog("donate")}>Mời tác giả ly cà phê</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ModelDialog() {
  const open = useStore(appStore, (s) => s.dialog === "model");
  const current = useStore(appStore, (s) => s.model);
  const [items, setItems] = useState<ModelInfo[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  useEffect(() => {
    if (!open) return;
    setItems(null); setErr(""); setBusy("");
    listModels().then(setItems).catch((e: Error) => setErr(e.message));
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={(o) => setDialog(o ? "model" : null)}>
      <DialogContent title="Chọn model" description="Model nhẹ hơn (Lite) thường còn hạn mức khi model chính bị giới hạn." wide>
        {!items && !err && <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" />Đang đọc danh sách model từ AI Studio…</p>}
        {err && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm">{err}</p>}
        {items && (
          <ul className="max-h-[52vh] divide-y divide-border overflow-y-auto rounded-lg border border-border" role="radiogroup" aria-label="Model">
            {items.map((m) => {
              const on = m.id === current;
              return (
                <li key={m.id}>
                  <button type="button" role="radio" aria-checked={on} disabled={!!busy}
                    onClick={() => (on ? setDialog(null) : (setBusy(m.id), void pickModel(m.id)))}
                    className={cn("flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60", on && "bg-primary/10")}>
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">{busy === m.id ? <Loader2 size={14} className="animate-spin" /> : on ? <Check size={16} /> : null}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">{m.name}</span>
                        {m.paid && <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">Trả phí</span>}
                        {/lite/i.test(m.id) && <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] text-success">Nhẹ</span>}</span>
                      <span className="block font-mono text-xs text-muted-foreground">{m.id}</span>
                      {m.desc && <span className="mt-0.5 block text-xs text-muted-foreground">{m.desc}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function SupportDialog() {
  const dialog = useStore(appStore, (s) => s.dialog);
  const preset = useStore(appStore, (s) => s.reportPreset);
  const open = dialog === "donate" || dialog === "report";
  const openUrl = (u: string) => window.open(u, "_blank", "noopener");
  return (
    <Dialog open={open} onOpenChange={(o) => !o && setDialog(null)}>
      {dialog === "donate" && <DialogContent title="Mời tác giả ly cà phê" description="Cảm ơn bạn đã dùng Nói Đi."><DonateView open={openUrl} /></DialogContent>}
      {dialog === "report" && <DialogContent title="Báo sự cố" wide><ReportView key={preset?.note ?? "r"} getDiag={collectDiagnostics} open={openUrl} captureModes prepareCapture={prepareCapture} preset={preset ?? undefined} /></DialogContent>}
    </Dialog>
  );
}
