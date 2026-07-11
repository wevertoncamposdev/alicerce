import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["172.26.80.1", "localhost", "127.0.0.1"],
};

export default nextConfig;
