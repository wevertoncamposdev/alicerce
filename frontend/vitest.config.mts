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
      // Etapa 12.3 — `@core/*` faltava (nenhum teste anterior precisou
      // dele); `serializable-contracts.test.ts` importa os contratos dos
      // módulos, que usam esse alias internamente.
      "@core/": path.resolve(rootDir, "./src/core/") + "/",
      // `server-only` sempre lança ao importar (não é checagem de
      // runtime) — stub vazio só pro Vitest, build real do Next intocado.
      "server-only": path.resolve(rootDir, "./vitest.server-only-stub.ts"),
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
