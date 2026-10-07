import { defineConfig } from "vitest/config";
import path from "path";
export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: { include: ["tests/**/*.test.{ts,tsx}"], environmentMatchGlobs: [["tests/**/*.ui.test.tsx", "jsdom"]], setupFiles: ["tests/setup.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
