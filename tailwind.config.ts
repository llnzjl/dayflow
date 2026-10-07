import type { Config } from "tailwindcss";
const v = (n: string) => `rgb(var(--${n}) / <alpha-value>)`;
export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { bg: v("bg"), surface: v("surface"), ink: v("ink"), muted: v("muted"), line: v("line"), brand: v("brand"), ok: v("ok"), warn: v("warn"), bad: v("bad") },
      fontFamily: { sans: ["Pretendard", "Noto Sans KR", "system-ui", "sans-serif"] },
      borderRadius: { xl2: "1.25rem" },
    },
  },
  plugins: [],
} satisfies Config;
