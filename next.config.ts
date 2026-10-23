import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image autonome pour Docker sur le Cloud Server Systalink
  output: "standalone",
  // sharp (libvips, LGPL) est exclu : licence interdite par l'art. 6 du règlement CADEV
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
