import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      include: ["src/lib/rules/**/*.ts", "src/selectors/**/*.ts"],
      exclude: ["src/lib/rules/index.ts", "src/selectors/index.ts"],
      thresholds: {
        // M3 acceptance: ≥ 90% of lib/rules and selectors (scoped include)
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 80,
        "src/lib/rules/**.ts": {
          lines: 90,
          functions: 90,
          statements: 90,
        },
        "src/selectors/**.ts": {
          lines: 90,
          functions: 90,
          statements: 90,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
