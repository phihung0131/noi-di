import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...i: ClassValue[]) => twMerge(clsx(i));
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const fmtTime = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
};
export async function waitFor<T>(fn: () => T | null | undefined | false, timeout = 8000, step = 100): Promise<T | null> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    let v: T | null | undefined | false = null;
    try { v = fn(); } catch { v = null; }
    if (v) return v;
    await sleep(step);
  }
  return null;
}
