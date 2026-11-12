// rem -> px: trang AI Studio có thể đặt font-size gốc khác 16px, giao diện của extension không được phụ thuộc vào đó.
const remToPx = () => ({
  postcssPlugin: "rem-to-px",
  Declaration(decl) {
    if (decl.value.includes("rem")) decl.value = decl.value.replace(/(-?[\d.]+)rem/g, (_, n) => `${+(parseFloat(n) * 16).toFixed(3)}px`);
  },
});
remToPx.postcss = true;
export default { plugins: [(await import("tailwindcss")).default, (await import("autoprefixer")).default, remToPx()] };
