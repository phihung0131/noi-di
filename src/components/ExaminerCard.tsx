import { useStore } from "@tanstack/react-store";
import { AlertTriangle, ChevronDown, Dumbbell, EyeOff, Eye, Languages, Lightbulb, MessageSquareQuote, RefreshCw, Timer } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { appStore, openReport, retryReply, setDialog, skipQuestion, switchModelAndRetry } from "@/lib/controller";
import { classifyError } from "@/lib/errors";
import { speakable, splitPhrase } from "@/lib/langs";
import type { ModelTurn } from "@/lib/types";
import { cn, fmtTime } from "@/lib/utils";
import { Fold, SaveBtn, SpeakBtn, useLang } from "./bits";
import { Score } from "./Score";
import { Button } from "./ui/button";
import { Words } from "./Words";

function Prep({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState<number | null>(null);
  const t = useRef<number>(0);
  useEffect(() => () => window.clearInterval(t.current), []);
  const start = () => {
    setLeft(seconds);
    window.clearInterval(t.current);
    t.current = window.setInterval(() => setLeft((l) => { if (l === null || l <= 1) { window.clearInterval(t.current); return 0; } return l - 1; }), 1000);
  };
  return (
    <Button variant={left === 0 ? "success" : "secondary"} size="sm" onClick={start}>
      <Timer size={16} />{left === null ? `Chuẩn bị ${seconds}s` : left === 0 ? "Hết giờ chuẩn bị, hãy nói" : fmtTime(left * 1000)}
    </Button>
  );
}

function PhraseList({ title, items, idp, lang }: { title: string; items: string[]; idp: string; lang: string }) {
  return (
    <div>
      <h4 className="mb-1.5 text-sm font-medium">{title}</h4>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {items.map((v, i) => {
          const [phrase, gloss] = splitPhrase(v);
          return (
            <li key={i} className="flex items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1"><span className="font-serif text-[15px] font-semibold">{phrase}</span>{gloss && <span className="ml-2 text-sm text-muted-foreground">{gloss}</span>}</div>
              <SpeakBtn id={`${idp}:${i}`} text={speakable(phrase)} compact label={phrase} />
              <SaveBtn note={{ text: phrase, tr: gloss, lang, kind: "vocab" }} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Rewrite({ title, text, id, lang, tone }: { title: string; text: string; id: string; lang: string; tone: "fix" | "native" }) {
  return (
    <div className={cn("rounded-lg border p-3", tone === "native" ? "border-success/40 bg-success/5" : "border-border bg-muted/40")}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{title}</span>
        <span className="flex gap-1.5">
          <SpeakBtn id={id} text={speakable(text)} compact label={title} />
          <SpeakBtn id={id} text={speakable(text)} slow compact label={title} />
          <SaveBtn note={{ text, lang, kind: "sample" }} />
        </span>
      </div>
      <Words id={id} text={text} className="font-serif text-[17px] leading-relaxed" />
    </div>
  );
}

function Concealed({ title }: { title: string }) {
  return (
    <div role="status" className="flex items-center gap-2.5 rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
      <EyeOff size={16} className="shrink-0" />
      <span><b className="font-medium text-foreground">{title}</b> đang được ẩn để bạn nói tự nhiên. Sẽ hiện lại khi ghi âm xong.</span>
    </div>
  );
}

function ErrorCard({ message, latest }: { message: string; latest: boolean }) {
  const kind = classifyError(message);
  const title = kind === "limit" ? "Model đã chạm giới hạn sử dụng" : kind === "blocked" ? "Nội dung bị AI Studio chặn" : "AI Studio báo lỗi";
  const help = kind === "limit"
    ? "Chuyển sang model nhẹ hơn (ví dụ Gemini Flash Lite) thường còn hạn mức, hoặc đợi vài phút rồi thử lại."
    : kind === "blocked" ? "Thử nói lại bằng cách diễn đạt khác, hoặc bấm “Câu khác”."
    : "Bạn có thể thử lại. Nếu lỗi lặp lại, mở AI Studio để xem chi tiết.";
  return (
    <section role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{help}</p>
          <p className="break-words rounded-md bg-card/60 px-2 py-1 font-mono text-xs text-muted-foreground">{message}</p>
        </div>
      </div>
      {latest && (
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          {kind === "limit" && <Button size="sm" onClick={() => void switchModelAndRetry()}>Chuyển sang model nhẹ hơn</Button>}
          {kind === "limit" && <Button size="sm" variant="outline" onClick={() => setDialog("model")}>Chọn model khác</Button>}
          <Button size="sm" variant="outline" onClick={() => void retryReply()}>Thử lại</Button>
          <Button size="sm" variant="ghost" onClick={() => openReport({ category: "studio", note: `AI Studio báo: ${message}` })}>Báo lỗi này</Button>
        </div>
      )}
    </section>
  );
}

/** Hiện trực tiếp phần AI Studio đang stream; xong mới dựng giao diện đầy đủ. */
export function LivePanel() {
  const live = useStore(appStore, (s) => s.live);
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4" aria-live="off" aria-label="Giám khảo đang trả lời, hiển thị trực tiếp">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" /></span>
        Giám khảo đang trả lời
        <span className="text-xs font-normal text-muted-foreground">Hiển thị trực tiếp, xong sẽ dựng lại đầy đủ</span>
      </div>
      {live.length === 0 && <Skeleton />}
      {live.map((sec, i) => (
        <div key={i}>
          {sec.label && <div className="mb-0.5 text-xs font-medium text-muted-foreground">{sec.label}</div>}
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{sec.text}{i === live.length - 1 && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-primary" />}</p>
        </div>
      ))}
    </section>
  );
}

const Skeleton = ({ label }: { label?: string }) => (
  <div className="flex items-center gap-1.5 py-1" aria-label={label ?? "Giám khảo đang soạn câu trả lời"}>
    {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-dot rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 0.18}s` }} />)}
    {label && <span className="ml-1 text-xs text-muted-foreground">{label}…</span>}
  </div>
);

export const ExaminerCard = memo(function ExaminerCard({ turn, latest, streaming, answered }: { turn: ModelTurn; latest: boolean; streaming: boolean; answered: boolean }) {
  const mode = useStore(appStore, (s) => s.session.mode);
  const listenOnly = useStore(appStore, (s) => s.prefs.listenOnly);
  const showTrans = useStore(appStore, (s) => s.prefs.showTrans);
  const lang = useLang();
  const recState = useStore(appStore, (s) => s.rec.state);
  // Đang ghi âm: ẩn câu mẫu, câu đã sửa, câu người bản xứ để người nói không nhìn đọc.
  const recording = recState === "starting" || recState === "recording" || recState === "stopping";
  const [open, setOpen] = useState<{ tr?: boolean; hint?: boolean; sample?: boolean; fb?: boolean; reveal?: boolean }>({});
  const t = turn;
  // Mục model đang viết dở (bảng, điểm, danh sách) chưa hiện, chờ đóng mục để khỏi nhấp nháy.
  const pending = (name: string) => streaming && t.open === name;
  const tgl = (k: keyof typeof open) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  const simpleFb = !!t.feedback && !t.transcript && !t.fixed && !t.better && !t.drill && !t.score && !t.vocab?.length && !t.pron?.length && !t.verdict;
  const hasReview = !simpleFb && !!(t.transcript || t.fixed || t.better || t.drill || t.score || t.feedback || t.vocab?.length || t.pron?.length || t.verdict);
  const concealSay = !!t.say && mode === "listening" && !answered && !open.reveal;
  const concealQ = !!t.q && latest && listenOnly && !open.reveal;
  const fbOpen = open.fb ?? latest;
  const trOpen = open.tr ?? showTrans;
  const audioId = (p: string) => `${p}:${t.key}`;

  return (
    <article className="animate-fade-in space-y-4" aria-label="Giám khảo">
      {t.error && <ErrorCard message={t.error} latest={latest} />}
      {t.empty && streaming && <Skeleton />}
      {simpleFb && !pending("FEEDBACK") && (t.q || t.say
        ? <div className="prose-fb px-1 text-muted-foreground" dangerouslySetInnerHTML={{ __html: t.feedback! }} />
        : <section className="rounded-lg border border-border bg-card p-4"><h3 className="mb-1 text-sm font-semibold">Giám khảo</h3><div className="prose-fb" dangerouslySetInnerHTML={{ __html: t.feedback! }} /></section>)}

      {hasReview && (
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{t.score ? "Nhận xét bài nói" : "Giám khảo"}</h3>
            {t.verdict && (
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", t.verdict === "pass" ? "bg-success/15 text-success" : "bg-accent/20 text-foreground")}>
                {t.verdict === "pass" ? "Qua câu" : "Nói lại câu này"}
              </span>
            )}
          </div>
          {t.transcript && (
            <blockquote className="border-l-2 border-primary/40 pl-3 font-serif text-[15px] italic text-muted-foreground">
              “{t.transcript}”
            </blockquote>
          )}
          {t.score && !pending("SCORE") && <Score items={t.score} />}
          {pending("SCORE") && <Skeleton label="Đang chấm điểm" />}
          {recording && !!(t.fixed || t.better || t.drill || t.feedback || t.pron?.length || t.vocab?.length) && <Concealed title="Câu đã sửa, câu người bản xứ sẽ nói, chi tiết lỗi và bài tập" />}
          {t.fixed && !recording && !pending("FIXED") && <Rewrite title="Câu của bạn, đã sửa" text={t.fixed} id={audioId("fixed")} lang={lang} tone="fix" />}
          {t.better && !recording && !pending("BETTER") && <Rewrite title="Người bản xứ sẽ nói" text={t.better} id={audioId("better")} lang={lang} tone="native" />}
          {pending("FEEDBACK") && <Skeleton label="Đang soạn nhận xét" />}
          {t.feedback && !recording && !pending("FEEDBACK") && (
            <div>
              <button className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => tgl("fb")} aria-expanded={fbOpen}>
                <span>Chi tiết lỗi và gợi ý</span><ChevronDown size={16} className={cn("transition-transform", fbOpen && "rotate-180")} />
              </button>
              <Fold open={fbOpen}><div className="prose-fb" dangerouslySetInnerHTML={{ __html: t.feedback }} /></Fold>
            </div>
          )}
          {!!t.pron?.length && !recording && !pending("PRON") && <PhraseList title="Phát âm cần sửa" items={t.pron} idp={audioId("pron")} lang={lang} />}
          {t.drill && !recording && !pending("DRILL") && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-sm font-medium"><Dumbbell size={15} className="text-primary" />Bài tập sửa lỗi</div>
              <div className="prose-fb" dangerouslySetInnerHTML={{ __html: t.drill }} />
            </div>
          )}
          {!!t.vocab?.length && !recording && !pending("VOCAB") && <PhraseList title="Nói tự nhiên hơn" items={t.vocab} idp={audioId("vocab")} lang={lang} />}
        </section>
      )}

      {t.say && (
        <section className="rounded-lg border border-border bg-card p-4">
          <p className="mb-2 text-sm text-muted-foreground">{mode === "listening" ? "Đoạn nghe" : mode === "chat" ? "Bạn trò chuyện nói" : "Giám khảo nói"}</p>
          {concealSay ? (
            <p className="font-serif text-lg text-muted-foreground">Nghe kỹ, chữ sẽ hiện sau khi bạn trả lời.</p>
          ) : (
            <Words id={audioId("say")} text={t.say} className="font-serif text-xl leading-relaxed" />
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <SpeakBtn id={audioId("say")} text={t.say} />
            <SpeakBtn id={audioId("say")} text={t.say} slow />
            {concealSay && <Button variant="ghost" size="sm" onClick={() => tgl("reveal")}><Eye size={16} />Xem chữ</Button>}
          </div>
        </section>
      )}

      {t.q && (
        <section className={cn("rounded-lg border bg-card p-5", latest ? "border-primary/50" : "border-border")}>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {t.q.n && <span className="rounded-full bg-primary px-2 py-0.5 font-medium text-primary-foreground">Câu {t.q.n}</span>}
          </div>
          <div className={cn(concealQ && "select-none blur-md")} onClick={concealQ ? () => tgl("reveal") : undefined} aria-hidden={concealQ}>
            <Words id={audioId("q")} text={t.q.text} className="font-serif text-[26px] font-medium leading-snug tracking-[-0.005em]" />
          </div>
          {concealQ && <p className="mt-2 text-xs text-muted-foreground">Chế độ nghe: bấm vào chữ để xem câu hỏi.</p>}
          {t.roman && <p className="mt-1 text-sm text-muted-foreground">{t.roman}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <SpeakBtn id={audioId("q")} text={t.q.text} />
            <SpeakBtn id={audioId("q")} text={t.q.text} slow />
            {t.tr && <Button variant={trOpen ? "default" : "ghost"} size="sm" onClick={() => tgl("tr")} aria-pressed={trOpen}><Languages size={16} />Dịch</Button>}
            {t.hint && !pending("HINT") && <Button variant={open.hint ? "default" : "ghost"} size="sm" onClick={() => tgl("hint")} aria-pressed={!!open.hint}><Lightbulb size={16} />Gợi ý</Button>}
            {t.sample && !pending("SAMPLE") && !pending("SAMPLETR") && <Button variant={open.sample ? "default" : "ghost"} size="sm" onClick={() => tgl("sample")} aria-pressed={!!open.sample}><MessageSquareQuote size={16} />Câu mẫu</Button>}
            {t.prep && latest && <Prep seconds={t.prep} />}
            {latest && !streaming && <Button variant="ghost" size="sm" className="ml-auto" onClick={() => void skipQuestion()}><RefreshCw size={16} />Câu khác</Button>}
          </div>
          {t.tr && <Fold open={trOpen}><p className="text-[15px] text-muted-foreground">{t.tr}</p></Fold>}
          {t.hint && <Fold open={!!open.hint}><div className="rounded-lg bg-accent-soft/60 p-3"><div className="mb-1 text-sm font-medium">Gợi ý ý tưởng</div><div className="prose-fb" dangerouslySetInnerHTML={{ __html: t.hint }} /></div></Fold>}
          {t.sample && recording && open.sample && <Concealed title="Câu mẫu" />}
          {t.sample && !recording && (
            <Fold open={!!open.sample}>
              <div className="rounded-lg bg-muted/70 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">Câu mẫu</span>
                  <span className="flex gap-1.5">
                    <SpeakBtn id={audioId("sample")} text={t.sample.text} compact label="câu mẫu" />
                    <SpeakBtn id={audioId("sample")} text={t.sample.text} slow compact label="câu mẫu" />
                    <SaveBtn note={{ text: t.sample.text, tr: t.sample.tr, lang, kind: "sample" }} />
                  </span>
                </div>
                <Words id={audioId("sample")} text={t.sample.text} className="font-serif text-lg leading-relaxed" />
                {t.sample.roman && <p className="mt-2 text-sm text-muted-foreground">{t.sample.roman}</p>}
                {t.sample.tr && <p className="mt-2 text-sm text-muted-foreground">{t.sample.tr}</p>}
                <p className="mt-3 text-xs text-muted-foreground">Mẹo: nghe chậm, nhại theo từng câu, rồi tự ghi âm. Bấm vào một từ để nghe riêng từ đó.</p>
              </div>
            </Fold>
          )}
        </section>
      )}
    </article>
  );
});
