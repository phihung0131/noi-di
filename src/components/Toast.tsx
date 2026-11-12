import { useStore } from "@tanstack/react-store";
import { useEffect, useState } from "react";
import { appStore } from "@/lib/controller";

export function Toast() {
  const t = useStore(appStore, (s) => s.toast);
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    if (!t) return;
    setShown(t.msg);
    const id = window.setTimeout(() => setShown(null), 4200);
    return () => window.clearTimeout(id);
  }, [t]);
  if (!shown) return null;
  return <div role="status" aria-live="polite" className="absolute bottom-24 left-1/2 z-30 max-w-[min(90vw,480px)] -translate-x-1/2 animate-fade-in rounded-lg bg-foreground px-4 py-2.5 text-sm text-background shadow-lg">{shown}</div>;
}
