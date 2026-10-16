import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["exceljs", "word-extractor"],
  experimental: {
    // Excel fayllarni server amali orqali yuklash uchun
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
