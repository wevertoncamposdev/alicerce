import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  reactStrictMode: true,
  allowedDevOrigins: ["172.26.80.1", "localhost", "127.0.0.1"],
  experimental: {
    // Desliga o nudge automático de upgrade do `next build` (default
    // "security" no 16.4): ele mata o processo filho do build e descarta a
    // saída antes de terminar, deixando o .next sem BUILD_ID. Upgrade de
    // dependência aqui é só via /upgrade-deps, nunca automático.
    agentUpgrade: false,
  },
  // Bundle mínimo autocontido em .next/standalone — usado pelo Dockerfile
  // para não precisar copiar node_modules inteiro na imagem final.
  output: "standalone",
};

export default nextConfig;