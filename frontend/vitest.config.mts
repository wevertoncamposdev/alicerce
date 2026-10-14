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
    exclude: ["node_modules", ".next"],
  },
});
