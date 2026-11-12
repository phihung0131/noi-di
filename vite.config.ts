import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  define: { "process.env.NODE_ENV": JSON.stringify("production"), __BUILD__: JSON.stringify(new Date().toISOString()) },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    sourcemap: false,
    target: "es2022",
    lib: { entry: "src/content/main.tsx", formats: ["iife"], name: "NoiDi", fileName: () => "content.js" },
  },
  test: { environment: "jsdom", include: ["tests/**/*.test.{ts,tsx}"] },
} as never);
