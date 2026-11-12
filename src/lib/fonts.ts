/** @font-face cho Be Vietnam Pro (UI) và Source Serif 4 (câu hỏi). url() chuyển tên file thành địa chỉ. */
export function fontFaceCSS(url: (file: string) => string): string {
  const face = (fam: string, file: string, w: number, range: string) =>
    `@font-face{font-family:"${fam}";font-weight:${w};font-style:normal;font-display:swap;src:url(${url(file)}) format("woff2");unicode-range:${range}}`;
  const LAT = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
  const VI = "U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB";
  let h = "";
  for (const w of [400, 500, 600]) h += face("NoiDi Sans", `be-vietnam-pro-latin-${w}-normal.woff2`, w, LAT) + face("NoiDi Sans", `be-vietnam-pro-vietnamese-${w}-normal.woff2`, w, VI);
  for (const w of [400, 600]) h += face("NoiDi Serif", `source-serif-4-latin-${w}-normal.woff2`, w, LAT) + face("NoiDi Serif", `source-serif-4-vietnamese-${w}-normal.woff2`, w, VI);
  return h;
}
