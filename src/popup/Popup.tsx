import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { BookMarked, Cpu, ExternalLink, Mic, Plus, RefreshCw, Search, SlidersHorizontal, Trash2, Volume2, VolumeX, Zap } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { langChip, MODES } from "@/lib/langs";
import { useNoteActions, useNotes } from "@/lib/notes";
import { speak, speechStore } from "@/lib/speech";
import { DEFAULT_PREFS, storage } from "@/lib/storage";
import type { NoteItem, Prefs, SessionConfig } from "@/lib/types";
import { cn } from "@/lib/utils";

const STUDIO = "https://aistudio.google.com/";
const NEW_CHAT = STUDIO + "prompts/new_chat";

interface Status { on: boolean; hasSession: boolean; rec: string; model: string; session: SessionConfig; generating: boolean; score?: number }
type Ctx = { kind: "away" } | { kind: "stale"; tabId: number } | { kind: "ok"; tabId: number; s: Status };

/** Đọc trạng thái của tab AI Studio đang mở (qua extension). */
async function readCtx(): Promise<Ctx> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.startsWith(STUDIO)) return { kind: "away" };
  try {
    const s = (await chrome.tabs.sendMessage(tab.id, { noidi: "status" })) as Status | undefined;
    return s ? { kind: "ok", tabId: tab.id, s } : { kind: "stale", tabId: tab.id };
  } catch { return { kind: "stale", tabId: tab.id }; }
}
async function command(tabId: number, noidi: "open" | "record" | "new" | "model") {
  await chrome.tabs.sendMessage(tabId, { noidi });
  if (noidi !== "open") window.close();
}

const qc = new QueryClient();

export function Popup() {
  return <QueryClientProvider client={qc}><Shell /></QueryClientProvider>;
}

function Shell() {
  const [tab, setTab] = useState<"run" | "notes" | "settings">("run");
  const [sysDark, setSysDark] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => { const m = matchMedia("(prefers-color-scheme: dark)"); const h = () => setSysDark(m.matches); m.addEventListener("change", h); return () => m.removeEventListener("change", h); }, []);
  const prefs = useQuery({ queryKey: ["prefs"], queryFn: storage.prefs });
  const theme = prefs.data?.theme ?? "auto";
  const dark = theme === "dark" || (theme === "auto" && sysDark);
  const notes = useNotes();

  return (
    <div className={cn("noidi flex min-h-[420px] w-[380px] flex-col bg-background text-foreground", dark && "dark")}>
      <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <Logo size={30} />
        <div className="leading-tight"><div className="text-[15px] font-semibold">Nói Đi</div><div className="text-xs text-muted-foreground">Luyện nói với giám khảo AI</div></div>
      </header>
      <nav className="grid grid-cols-3 gap-1 border-b border-border p-1.5" role="tablist">
        {([["run", "Luyện nói", Mic], ["notes", `Sổ từ vựng${notes.data?.length ? ` (${notes.data.length})` : ""}`, BookMarked], ["settings", "Cài đặt", SlidersHorizontal]] as const).map(([id, label, Icon]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={cn("flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === id ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60")}>
            <Icon size={14} /><span className="truncate">{label}</span>
          </button>
        ))}
      </nav>
      <main className="flex-1 p-4">
        {tab === "run" && <RunTab />}
        {tab === "notes" && <NotesTab prefs={prefs.data ?? DEFAULT_PREFS} />}
        {tab === "settings" && <SettingsTab prefs={prefs.data ?? DEFAULT_PREFS} />}
      </main>
      <footer className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
        <span>Alt+R ghi/dừng · Alt+P nghe lại · Alt+L nghe câu hỏi</span>
        <a href="https://github.com/phihung0131/noi-di" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-foreground"><ExternalLink size={12} />GitHub</a>
      </footer>
    </div>
  );
}

/* ---------------- Tab Luyện nói ---------------- */
function RunTab() {
  const ctx = useQuery({ queryKey: ["ctx"], queryFn: readCtx, refetchInterval: 1500 });
  const c = ctx.data;
  if (!c) return <p className="py-10 text-center text-sm text-muted-foreground">Đang kiểm tra tab hiện tại…</p>;

  if (c.kind === "away") {
    return (
      <Panel title="Mở AI Studio để bắt đầu" text="Nói Đi chạy trên trang Google AI Studio. Mở một cuộc trò chuyện mới và bật chế độ luyện nói.">
        <Button size="lg" className="w-full" onClick={() => { void chrome.tabs.create({ url: NEW_CHAT }); window.close(); }}><ExternalLink size={16} />Mở AI Studio</Button>
      </Panel>
    );
  }
  if (c.kind === "stale") {
    return (
      <Panel title="Cần tải lại trang" text="Tab AI Studio này được mở trước khi cài hoặc cập nhật extension, nên chưa kết nối được.">
        <Button size="lg" className="w-full" onClick={() => { void chrome.tabs.reload(c.tabId); window.close(); }}><RefreshCw size={16} />Tải lại tab này</Button>
      </Panel>
    );
  }

  const { s, tabId } = c;
  const primary = !s.on
    ? { label: "Mở chế độ luyện nói", icon: <Zap size={18} />, run: () => command(tabId, "open") }
    : s.hasSession
      ? { label: s.rec === "recording" ? "Đang ghi âm…" : "Bắt đầu nói", icon: <Mic size={18} />, run: () => command(tabId, "record"), disabled: s.rec !== "idle" }
      : { label: "Tạo buổi luyện mới", icon: <Plus size={18} />, run: () => command(tabId, "new") };

  return (
    <div className="space-y-4">
      <Button size="lg" className="h-12 w-full text-base" disabled={"disabled" in primary && primary.disabled} onClick={() => void primary.run().then(() => ctx.refetch())}>{primary.icon}{primary.label}</Button>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => void command(tabId, "new")}><Plus size={16} />Buổi mới</Button>
        <Button variant="outline" onClick={() => void command(tabId, "model")}><Cpu size={16} />Chọn model</Button>
      </div>
      <SessionCard s={s} />
    </div>
  );
}

function Panel({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return <div className="space-y-4 py-4 text-center"><div className="mx-auto w-fit"><Logo size={52} /></div><div><h2 className="text-lg font-semibold">{title}</h2><p className="mx-auto mt-1.5 max-w-[290px] text-sm text-muted-foreground">{text}</p></div>{children}</div>;
}

function SessionCard({ s }: { s: Status }) {
  if (!s.hasSession) return <p className="rounded-lg border border-dashed border-border p-3 text-center text-sm text-muted-foreground">Chưa có buổi luyện nào trong tab này.</p>;
  const mode = MODES.find((m) => m.id === s.session.mode)?.label;
  return (
    <section className="space-y-2 rounded-lg border border-border bg-card p-3" aria-label="Buổi đang mở">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-sm"><div className="truncate font-medium">{langChip(s.session.lang)} · {s.session.level}</div><div className="truncate text-xs text-muted-foreground">{mode}</div></div>
        {s.score !== undefined && <div className="text-right"><div className="font-serif text-2xl font-semibold leading-none tabular-nums">{s.score}%</div><div className="text-[11px] text-muted-foreground">giống bản xứ</div></div>}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground"><span className="truncate font-mono">{s.model || "model chưa rõ"}</span><span>{s.generating ? "Giám khảo đang trả lời…" : "Sẵn sàng"}</span></div>
    </section>
  );
}

/* ---------------- Tab Sổ từ vựng ---------------- */
function NotesTab({ prefs }: { prefs: Prefs }) {
  const { data = [] } = useNotes();
  const { remove } = useNoteActions();
  const [q, setQ] = useState("");
  const playing = useStore(speechStore, (s) => s.key);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? data.filter((n) => n.text.toLowerCase().includes(t) || (n.tr ?? "").toLowerCase().includes(t)) : data;
  }, [data, q]);

  if (!data.length) return <p className="py-10 text-center text-sm text-muted-foreground">Chưa có gì. Trong buổi luyện, bấm biểu tượng đánh dấu cạnh câu mẫu hoặc cách nói hay hơn để lưu vào đây.</p>;
  return (
    <div className="space-y-3">
      <label className="relative block"><Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm trong sổ" aria-label="Tìm trong sổ từ vựng" className="h-9 w-full rounded-lg border border-border bg-card pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
      <ul className="max-h-[300px] divide-y divide-border overflow-y-auto rounded-lg border border-border">
        {list.map((n: NoteItem) => {
          const on = playing === `note:${n.id}`;
          return (
            <li key={n.id} className="flex items-start gap-2 p-2.5">
              <div className="min-w-0 flex-1"><p className="font-serif text-[15px] leading-snug">{n.text}</p>{n.tr && <p className="mt-0.5 text-xs text-muted-foreground">{n.tr}</p>}<p className="mt-0.5 text-[11px] text-muted-foreground">{n.kind === "sample" ? "Câu mẫu" : "Cách nói hay hơn"} · {n.lang}</p></div>
              <Button variant={on ? "default" : "secondary"} size="icon-sm" aria-label={on ? "Dừng" : `Nghe: ${n.text}`} onClick={() => speak({ key: `note:${n.id}`, text: n.text.replace(/[\[(（【].*?[\])）】]/g, " "), lang: n.lang, rate: prefs.rate, voiceName: prefs.voiceName })}>{on ? <VolumeX size={15} /> : <Volume2 size={15} />}</Button>
              <Button variant="ghost" size="icon-sm" aria-label="Xoá khỏi sổ" onClick={() => remove.mutate(n.id)}><Trash2 size={15} /></Button>
            </li>
          );
        })}
        {!list.length && <li className="p-4 text-center text-sm text-muted-foreground">Không có mục nào khớp.</li>}
      </ul>
    </div>
  );
}

/* ---------------- Tab Cài đặt ---------------- */
function SettingsTab({ prefs }: { prefs: Prefs }) {
  const qcl = useQueryClient();
  const save = useMutation({
    mutationFn: async (p: Partial<Prefs>) => { const next = { ...prefs, ...p }; await storage.setPrefs(next); return next; },
    onSuccess: (n) => qcl.setQueryData(["prefs"], n),
  });
  const row = "flex items-center justify-between gap-4";
  return (
    <div className="space-y-4">
      <div className={row}><div><div className="text-sm font-medium">Tự đọc câu hỏi mới</div><div className="text-xs text-muted-foreground">Nghe giám khảo như hội thoại thật.</div></div><Switch label="Tự đọc câu hỏi mới" checked={prefs.autoPlay} onCheckedChange={(v) => save.mutate({ autoPlay: v })} /></div>
      <div className={row}><div><div className="text-sm font-medium">Chế độ nghe</div><div className="text-xs text-muted-foreground">Che chữ câu hỏi, chỉ nghe rồi trả lời.</div></div><Switch label="Chế độ nghe" checked={prefs.listenOnly} onCheckedChange={(v) => save.mutate({ listenOnly: v })} /></div>
      <div className={row}><div className="text-sm font-medium">Tự hiện bản dịch</div><Switch label="Tự hiện bản dịch" checked={prefs.showTrans} onCheckedChange={(v) => save.mutate({ showTrans: v })} /></div>
      <label className="block space-y-1.5"><span className="flex justify-between text-sm font-medium"><span>Tốc độ đọc</span><span className="tabular-nums text-muted-foreground">{prefs.rate.toFixed(2)}×</span></span>
        <input type="range" min={0.5} max={1.2} step={0.05} value={prefs.rate} onChange={(e) => save.mutate({ rate: parseFloat(e.target.value) })} className="w-full accent-[hsl(var(--primary))]" aria-label="Tốc độ đọc" /></label>
      <label className="block space-y-1.5"><span className="text-sm font-medium">Giao diện</span>
        <Select ariaLabel="Giao diện" value={prefs.theme} onChange={(v) => save.mutate({ theme: v as Prefs["theme"] })} options={[{ value: "auto", label: "Theo hệ thống" }, { value: "light", label: "Sáng" }, { value: "dark", label: "Tối" }]} /></label>
      <p className="text-xs text-muted-foreground">Ngôn ngữ, chế độ và trình độ chọn khi tạo buổi mới, không đổi được giữa buổi.</p>
    </div>
  );
}
