/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["@heroicons/react", "framer-motion"],
  },
};

export default nextConfig;