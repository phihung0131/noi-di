import { createRoot } from "react-dom/client";
import { Popup } from "./Popup";
import { fontFaceCSS } from "@/lib/fonts";
import css from "@/styles.css?inline";

const style = document.createElement("style");
style.textContent = fontFaceCSS((f) => `dist/fonts/${f}`) + css;
document.head.appendChild(style);
createRoot(document.getElementById("root")!).render(<Popup />);
