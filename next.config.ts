import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.MOBILE_EXPORT === "1" ? "export" : "standalone",
  images: {
    unoptimized: process.env.MOBILE_EXPORT === "1",
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
