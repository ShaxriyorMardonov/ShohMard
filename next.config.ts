import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["exceljs"],
  experimental: {
    // Excel fayllarni server amali orqali yuklash uchun
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
