import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // pdf-parse (pdfjs) breaks when webpack-bundled for the server
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  // Silence dual-lockfile warning when running from a git worktree
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
