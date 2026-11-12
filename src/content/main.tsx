import { createRoot } from "react-dom/client";
import { App } from "@/components/App";
import { boot } from "@/lib/controller";
import { fontFaceCSS } from "@/lib/fonts";
import css from "@/styles.css?inline";

declare const __BUILD__: string;
declare global { interface Window { __noidiLoaded?: boolean } }

/** @font-face không hoạt động trong shadow DOM, phải khai báo ở document. */
function injectFonts() {
  const url = (f: string) => (typeof chrome !== "undefined" && chrome.runtime?.getURL ? chrome.runtime.getURL(`dist/fonts/${f}`) : `/fonts/${f}`);
  const s = document.createElement("style");
  s.textContent = fontFaceCSS(url) + `html.noidi-on ms-app{opacity:0!important;pointer-events:none!important}html.noidi-on .cdk-overlay-container,html.noidi-on .cdk-overlay-container *{opacity:0!important;pointer-events:none!important}html.noidi-on{overflow:hidden!important}`;
  document.head.appendChild(s);
}

if (!window.__noidiLoaded) {
  window.__noidiLoaded = true;
  injectFonts();
  const host = document.createElement("div");
  host.id = "noidi-host";
  host.dataset.build = __BUILD__;
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = css;
  const mount = document.createElement("div");
  shadow.append(style, mount);
  /**
   * Radix khoá cuộn (react-remove-scroll) bằng listener ở document và so sánh event.target.
   * Trong Shadow DOM target bị đổi thành host nên nó tưởng cuộn ra ngoài hộp thoại và chặn.
   * Chặn từ window (capture, chạy trước document): cuộn trong giao diện Nói Đi không đi tiếp tới lớp khoá;
   * hành vi cuộn mặc định của trình duyệt vẫn chạy.
   */
  const fromUI = (e: Event) => e.composedPath().includes(host);
  for (const type of ["wheel", "touchmove"] as const)
    window.addEventListener(type, (e) => { if (fromUI(e)) e.stopPropagation(); }, { capture: true, passive: true });
  createRoot(mount).render(<App />);
  void boot();
}
