import type { NextConfig } from "next";
import { execSync } from "child_process";
import { readFileSync } from "fs";

// Get version from git tags at build time
function getVersionFromGit(): string {
  try {
    // Get latest tag (e.g., "v0.80.1")
    const tag = execSync("git describe --tags --abbrev=0", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return tag.replace(/^v/, ""); // Remove 'v' prefix
  } catch {
    // Fallback to package.json version if no tags
    try {
      const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
      return pkg.version || "0.0.0";
    } catch {
      return "0.0.0";
    }
  }
}

const APP_VERSION = getVersionFromGit();

const nextConfig: NextConfig = {
  env: {
    APP_VERSION,
  },
  serverExternalPackages: ["@prisma/client", "prisma"],
  images: {
    // We must whitelist the domains we'll be using for our product images.
    // This is a security feature of Next.js Image Optimization.
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 480],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "github.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.blob.vercel-storage.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
