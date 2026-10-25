import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

const rootDir = import.meta.dirname;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@/": path.resolve(rootDir, "./src/") + "/",
      "@lib/": path.resolve(rootDir, "./src/lib/") + "/",
      "@modules/": path.resolve(rootDir, "./src/modules/") + "/",
      "@components/": path.resolve(rootDir, "./src/components/") + "/",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // e2e/ são specs do Playwright (etapa 12.1) — rodam com npm run
    // test:smoke, não com o Vitest.
    exclude: ["node_modules", ".next", "e2e"],
  },
});
