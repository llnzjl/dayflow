/** @type {import('next').NextConfig} */
const pages = process.env.NEXT_PUBLIC_PAGES_PREVIEW === "true";
export default {
  reactStrictMode: true,
  experimental: { serverComponentsExternalPackages: ["better-sqlite3"] },
  ...(pages ? { output: "export", basePath: process.env.PAGES_BASE_PATH || "", trailingSlash: true, images: { unoptimized: true } } : {}),
};
