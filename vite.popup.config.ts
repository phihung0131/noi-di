import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

/** Popup của extension: build riêng, ghi thêm vào dist/ (không xoá content.js). */
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    cssCodeSplit: false,
    sourcemap: false,
    target: "es2022",
    lib: { entry: "src/popup/main.tsx", formats: ["iife"], name: "NoiDiPopup", fileName: () => "popup.js" },
  },
} as never);
