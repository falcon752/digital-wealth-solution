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
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3002",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3003",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3004",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "144.91.86.110",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "144.91.86.110",
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
