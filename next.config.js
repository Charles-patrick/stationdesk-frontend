/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Uploaded logos, product photos and receipts are served by the API
  images: { unoptimized: true },
};
module.exports = nextConfig;
