import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "5000",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "wyomingllc-limited.com",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "digitalwealthpartnersllc.net",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "www.digitalwealthpartnersllc.net",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "cdn.jsdelivr.net",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
