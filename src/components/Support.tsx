import { Camera, Check, Coffee, Copy, Download, FileText, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { buildReport, CATEGORIES, assetUrl, captureTab, downloadImage, reportFormUrl, SUPPORT, type CategoryId, type Diag } from "@/lib/support";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

/* ---------------- Thẻ mời ủng hộ (dùng ở nhiều nơi) ---------------- */
export function SupportCard({ title, text, actionLabel = "Mời cà phê", onAction, onDismiss, dismissLabel = "Để sau", compact }: {
  title: string; text: string; actionLabel?: string; onAction: () => void; onDismiss?: () => void; dismissLabel?: string; compact?: boolean;
}) {
  return (
    <aside aria-label="Mời tác giả ly cà phê" className={cn("relative overflow-hidden rounded-lg border border-accent/45 bg-accent-soft/50", compact ? "p-3" : "p-4")}>
      <div className="flex items-start gap-3">
        <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-accent/25 text-accent", compact ? "h-8 w-8" : "h-10 w-10")}><Coffee size={compact ? 16 : 20} /></span>
        <div className="min-w-0 flex-1">
          <h3 className={cn("font-semibold text-foreground", compact ? "text-sm" : "text-[15px]")}>{title}</h3>
          <p className={cn("mt-0.5 text-muted-foreground", compact ? "text-xs leading-relaxed" : "text-sm leading-relaxed")}>{text}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Button size={compact ? "xs" : "sm"} className="bg-accent text-black hover:bg-accent/90" onClick={onAction}><Coffee size={14} />{actionLabel}</Button>
            {onDismiss && <Button size={compact ? "xs" : "sm"} variant="ghost" onClick={onDismiss}>{dismissLabel}</Button>}
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ---------------- Ủng hộ ---------------- */
export function DonateView({ open }: { open: (url: string) => void }) {
  const [copied, setCopied] = useState("");
  const copy = async (what: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(""), 1800); } catch { /* */ }
  };
  const b = SUPPORT.bank;
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Nói Đi miễn phí và mã nguồn mở. Nếu nó giúp bạn nói tự tin hơn, một ly cà phê sẽ cho mình thêm thời gian để làm tiếp: thêm ngôn ngữ, chấm điểm sát hơn, sửa lỗi nhanh hơn.
        Không bắt buộc đâu, bạn cứ dùng bình thường nhé.
      </p>
      <ul className="space-y-1.5 text-sm">
        {["Thêm ngôn ngữ, giọng đọc và chế độ luyện mới", "Chấm điểm phát âm sát giọng bản xứ hơn", "Sửa lỗi nhanh khi AI Studio đổi giao diện"].map((t) => (
          <li key={t} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-success" /><span>{t}</span></li>
        ))}
      </ul>
      <div className="mx-auto w-[min(100%,280px)] rounded-lg border border-border bg-white p-2.5 shadow-sm">
        <img src={assetUrl("donate-qr.jpg")} alt={`Mã QR VietQR chuyển khoản tới ${b.owner}, ${b.name}`} className="h-auto w-full" />
      </div>
      <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
        <div className="font-medium">{b.owner}</div>
        <div className="mt-0.5 flex items-center justify-between gap-2 text-muted-foreground">
          <span>{b.name} · <span className="font-mono tabular-nums">{b.display}</span></span>
          <Button variant="ghost" size="xs" onClick={() => void copy("stk", b.number)} aria-label="Sao chép số tài khoản">
            {copied === "stk" ? <Check size={13} className="text-success" /> : <Copy size={13} />}{copied === "stk" ? "Đã chép" : "Chép số"}
          </Button>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">Quét bằng app ngân hàng bất kỳ (VietQR). Một ly cà phê khoảng 25.000đ, bao nhiêu cũng là niềm vui. Cảm ơn bạn rất nhiều!</p>
      <div className="border-t border-border pt-3">
        <p className="mb-2 text-xs text-muted-foreground">Không tiện chuyển khoản? Những việc này cũng giúp ích rất nhiều:</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => open(SUPPORT.repo)}><Star size={14} />Gắn sao trên GitHub</Button>
          <Button variant="outline" size="sm" onClick={() => void copy("link", SUPPORT.repo)}>{copied === "link" ? <Check size={14} className="text-success" /> : <Copy size={14} />}{copied === "link" ? "Đã chép link" : "Chép link cho bạn bè"}</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Báo sự cố ---------------- */
export interface ReportProps {
  getDiag: () => Promise<Diag>;
  open: (url: string) => void;
  /** Cho phép chọn chụp giao diện Nói Đi hay trang AI Studio gốc (chỉ có trong giao diện chính) */
  captureModes?: boolean;
  /** Ẩn/hiện lớp giao diện trước khi chụp; trả hàm khôi phục */
  prepareCapture?: (mode: "ui" | "page") => Promise<() => void>;
  preset?: { category?: CategoryId; note?: string };
}

export function ReportView({ getDiag, open, captureModes, prepareCapture, preset }: ReportProps) {
  const [category, setCategory] = useState<CategoryId>(preset?.category ?? "ui");
  const [note, setNote] = useState(preset?.note ?? "");
  const [withDiag, setWithDiag] = useState(true);
  const [mode, setMode] = useState<"ui" | "page">("ui");
  const [shot, setShot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const doCapture = async () => {
    setBusy(true); setMsg("");
    let restore: (() => void) | undefined;
    try {
      restore = await prepareCapture?.(mode);
      await new Promise((r) => setTimeout(r, 350));
      setShot(await captureTab());
    } catch (e) { setMsg((e as Error).message); }
    finally { restore?.(); setBusy(false); }
  };

  const build = async () => buildReport({ category, note, diag: withDiag ? await getDiag() : undefined });

  const send = async () => {
    setBusy(true);
    try {
      const r = await build();
      let hint = "";
      if (shot) { downloadImage(shot); hint = " Ảnh chụp đã được tải về máy: trong form, bấm “Thêm tệp” ở câu ảnh chụp màn hình để đính kèm."; }
      open(reportFormUrl(r));
      setMsg(`Đã mở form báo sự cố, đã điền sẵn nội dung. Kiểm tra rồi bấm Gửi ở cuối form.${hint}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Chọn loại sự cố và mô tả thêm nếu cần. Mình điền sẵn form báo sự cố gửi tới tác giả, bạn chỉ việc kiểm tra rồi bấm Gửi.</p>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Loại sự cố">
        {CATEGORIES.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={category === c.id} onClick={() => setCategory(c.id)}
            className={cn("rounded-full border px-3 py-1 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", category === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted")}>{c.label}</button>
        ))}
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Mô tả thêm <span className="font-normal text-muted-foreground">(không bắt buộc)</span></span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} maxLength={1200}
          placeholder="Bạn đang làm gì? Điều gì xảy ra, và bạn mong đợi điều gì? Càng cụ thể càng dễ sửa."
          className="w-full resize-none rounded-lg border border-border bg-card p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </label>

      <div className="space-y-2 rounded-lg border border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Ảnh chụp màn hình</span>
          <Button variant="secondary" size="sm" onClick={() => void doCapture()} disabled={busy}><Camera size={14} />{shot ? "Chụp lại" : "Chụp ngay"}</Button>
        </div>
        {captureModes && (
          <div className="flex gap-1.5 text-xs" role="radiogroup" aria-label="Chụp gì">
            {([["ui", "Giao diện Nói Đi"], ["page", "Trang AI Studio gốc"]] as const).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={mode === v} onClick={() => setMode(v)}
                className={cn("rounded-md border px-2.5 py-1 transition-colors", mode === v ? "border-primary bg-primary/10" : "border-border text-muted-foreground hover:bg-muted")}>{l}</button>
            ))}
          </div>
        )}
        {shot && (
          <div className="flex items-start gap-2">
            <img src={shot} alt="Ảnh chụp màn hình sẽ đính kèm" className="h-20 w-32 rounded-md border border-border object-cover object-top" />
            <div className="flex flex-col gap-1">
              <Button variant="ghost" size="xs" onClick={() => downloadImage(shot)}><Download size={13} />Tải ảnh</Button>
              <Button variant="ghost" size="xs" onClick={() => setShot(null)}><Trash2 size={13} />Bỏ ảnh</Button>
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Khi gửi, ảnh được tải về máy; trong form bạn bấm “Thêm tệp” để đính kèm (form yêu cầu đăng nhập Google, bạn đang dùng AI Studio nên đã có sẵn).</p>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={withDiag} onChange={(e) => setWithDiag(e.target.checked)} className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" />
        <span>Kèm thông tin kỹ thuật (phiên bản, trình duyệt, model, trạng thái). <span className="text-muted-foreground">Không gửi nội dung hội thoại của bạn.</span></span>
      </label>
      <button type="button" className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground" onClick={async () => setPreview(preview === null ? await (async () => { const r = await build(); return `Loại sự cố: ${r.category}\n\nMô tả:\n${r.note}${r.diag ? `\n\nThông tin kỹ thuật:\n${r.diag}` : ""}`; })() : null)}>
        {preview === null ? "Xem nội dung sẽ điền vào form" : "Ẩn nội dung"}
      </button>
      {preview !== null && <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/60 p-3 text-xs">{preview}</pre>}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void send()} disabled={busy}><FileText size={16} />Mở form để gửi</Button>
      </div>
      {msg && <p role="status" className="rounded-lg bg-primary/10 p-3 text-sm">{msg}</p>}
    </div>
  );
}
