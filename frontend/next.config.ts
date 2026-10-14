import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  reactStrictMode: true,
  allowedDevOrigins: ["172.26.80.1", "localhost", "127.0.0.1"],
  // Bundle mínimo autocontido em .next/standalone — usado pelo Dockerfile
  // para não precisar copiar node_modules inteiro na imagem final.
  output: "standalone",
};

export default nextConfig;