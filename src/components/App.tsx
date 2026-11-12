import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useEffect, useState } from "react";
import { appStore, setOn } from "@/lib/controller";
import { cn } from "@/lib/utils";
import { Dock } from "./Dock";
import { NewSessionDialog, SettingsDialog } from "./Dialogs";
import { Feed } from "./Feed";
import { Header } from "./Header";
import { Logo } from "./Logo";
import { NotebookDialog } from "./Notebook";
import { Toast } from "./Toast";
import { PortalCtx } from "./ui/portal";
import { TooltipProvider } from "./ui/tooltip";

const qc = new QueryClient();

export function App() {
  const on = useStore(appStore, (s) => s.on);
  const ready = useStore(appStore, (s) => s.ready);
  const theme = useStore(appStore, (s) => s.prefs.theme);
  const [sysDark, setSysDark] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches);
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const m = matchMedia("(prefers-color-scheme: dark)");
    const h = () => setSysDark(m.matches);
    m.addEventListener("change", h);
    return () => m.removeEventListener("change", h);
  }, []);
  const dark = theme === "dark" || (theme === "auto" && sysDark);

  return (
    <div className={cn("noidi", dark && "dark")}>
      <QueryClientProvider client={qc}>
        <PortalCtx.Provider value={portal}>
          <TooltipProvider>
            {ready && !on && (
              <button onClick={() => void setOn(true)} aria-label="Mở Nói Đi, chế độ luyện nói"
                className="fixed bottom-5 right-5 z-[2147483000] flex h-12 w-12 items-center justify-center rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Logo size={48} />
              </button>
            )}
            {on && (
              <div className="fixed inset-0 z-[2147482000] flex flex-col bg-background text-foreground">
                <Header />
                <main className="relative min-h-0 flex-1"><Feed /><Dock /><Toast /></main>
                <NewSessionDialog /><SettingsDialog /><NotebookDialog />
              </div>
            )}
          </TooltipProvider>
          {/* Radix portal: luôn nằm trên khung chính */}
          <div ref={setPortal} className="pointer-events-none fixed inset-0 z-[2147483000] [&>*]:pointer-events-auto" />
        </PortalCtx.Provider>
      </QueryClientProvider>
    </div>
  );
}
