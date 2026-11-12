import { createRoot } from "react-dom/client";
import { App } from "@/components/App";
import { boot } from "@/lib/controller";
import css from "@/styles.css?inline";

declare const __BUILD__: string;
declare global { interface Window { __noidiLoaded?: boolean } }

/** @font-face không hoạt động trong shadow DOM, phải khai báo ở document. */
function injectFonts() {
  const url = (f: string) => (typeof chrome !== "undefined" && chrome.runtime?.getURL ? chrome.runtime.getURL(`dist/fonts/${f}`) : `/fonts/${f}`);
  const face = (fam: string, file: string, w: number, range: string) =>
    `@font-face{font-family:"${fam}";font-weight:${w};font-style:normal;font-display:swap;src:url(${url(file)}) format("woff2");unicode-range:${range}}`;
  const LAT = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
  const VI = "U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB";
  let h = "";
  for (const w of [400, 500, 600]) h += face("NoiDi Sans", `be-vietnam-pro-latin-${w}-normal.woff2`, w, LAT) + face("NoiDi Sans", `be-vietnam-pro-vietnamese-${w}-normal.woff2`, w, VI);
  for (const w of [400, 600]) h += face("NoiDi Serif", `source-serif-4-latin-${w}-normal.woff2`, w, LAT) + face("NoiDi Serif", `source-serif-4-vietnamese-${w}-normal.woff2`, w, VI);
  const s = document.createElement("style");
  s.textContent = h + `html.noidi-on ms-app{opacity:0!important;pointer-events:none!important}html.noidi-on .cdk-overlay-container,html.noidi-on .cdk-overlay-container *{opacity:0!important;pointer-events:none!important}html.noidi-on{overflow:hidden!important}`;
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
