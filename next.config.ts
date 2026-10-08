import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "thumbnail.komiku.org",
      },
      {
        protocol: "https",
        hostname: "komiku.org",
      },
      {
        protocol: "https",
        hostname: "thumbnail.komiku.to",
      },
      {
        protocol: "https",
        hostname: "komiku.to",
      },
      {
        protocol: "https",
        hostname: "api.komiku.org",
      },
      {
        protocol: "https",
        hostname: "cvr.voratoon.id",
      },
      {
        protocol: "https",
        hostname: "cvr.voratoon.com",
      },
      {
        protocol: "https",
        hostname: "cdn.voratoon.com",
      },
      {
        protocol: "https",
        hostname: "assets.shngm.id",
      },
      {
        protocol: "https",
        hostname: "shinigami.moe",
      },
      {
        protocol: "https",
        hostname: "komikcast.bz",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
    ],
  },
  allowedDevOrigins: [
    "10.160.36.166",
    "localhost",
    "127.0.0.1",
    "voidverse.my.id",
    "voidreader-phi.vercel.app",
  ],
};

export default nextConfig;
