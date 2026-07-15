import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  reactStrictMode: true,
  allowedDevOrigins: ["172.26.80.1", "localhost", "127.0.0.1"],
};

export default nextConfig;