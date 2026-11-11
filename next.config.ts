import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image autonome pour Docker sur le Cloud Server Systalink
  output: "standalone",
  // Le projet est sa propre racine (évite de remonter vers un package-lock.json parent)
  outputFileTracingRoot: path.join(__dirname),
  // sharp (libvips, LGPL) est exclu : licence interdite par l'art. 6 du règlement CADEV
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
