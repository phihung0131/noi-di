const c = (n) => `hsl(var(--${n}) / <alpha-value>)`;
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class", ".dark"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: c("background"), foreground: c("foreground"), card: c("card"), muted: c("muted"),
        "muted-foreground": c("muted-foreground"), border: c("border"), primary: c("primary"),
        "primary-foreground": c("primary-foreground"), accent: c("accent"), "accent-soft": c("accent-soft"),
        destructive: c("destructive"), success: c("success"), ring: c("ring"),
      },
      fontFamily: {
        sans: ['"NoiDi Sans"', "system-ui", "sans-serif"],
        serif: ['"NoiDi Serif"', "Georgia", "serif"],
      },
      borderRadius: { lg: "12px", md: "8px", sm: "6px" },
      keyframes: {
        "fade-in": { from: { opacity: 0, transform: "translateY(4px)" }, to: { opacity: 1, transform: "none" } },
        ring: { to: { boxShadow: "0 0 0 12px hsl(var(--destructive) / 0)" } },
        dot: { "0%,80%,100%": { opacity: 0.25 }, "40%": { opacity: 1 } },
        spin: { to: { transform: "rotate(360deg)" } },
      },
      animation: { "fade-in": "fade-in .18s ease-out both", ring: "ring 1.4s ease-out infinite", dot: "dot 1.2s infinite", spin: "spin .8s linear infinite" },
    },
  },
  plugins: [],
};
