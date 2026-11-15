import type { NextConfig } from "next";
import path from "path";

/** Set `NEXT_PUBLIC_BASE_PATH=/Agengt` for GitHub Pages project site builds. */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") || "";
const enableE2EBridge = process.env.NEXT_PUBLIC_ENABLE_E2E_BRIDGE === "1";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  ...(basePath
    ? {
        basePath,
        assetPrefix: basePath,
      }
    : {}),
  webpack: (config) => {
    // Production publishes use Providers.tsx (no store bridge). E2E builds
    // swap in Providers.e2e.tsx so Playwright can use window.__IIMCIP_OS__.
    if (enableE2EBridge) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@/components/Providers": path.resolve(
          __dirname,
          "src/components/Providers.e2e.tsx",
        ),
      };
    }
    return config;
  },
};

export default nextConfig;
