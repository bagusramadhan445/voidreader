import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' blob: data: https: http:",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self' https: wss:",
      "media-src 'self' blob: data: https: http:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Content-Security-Policy",
            value: csp,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
