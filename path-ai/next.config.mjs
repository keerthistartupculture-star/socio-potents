/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Set NEXT_PUBLIC_BASE_PATH=/path-ai at build time to serve the app under sociopotents.in/path-ai.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  eslint: {
    // No eslint config is checked in yet; avoid `next build` prompting to install one.
    ignoreDuringBuilds: true,
  },
  // Gemini/Mixpanel secrets stay server-only: only NEXT_PUBLIC_* vars ever reach the client bundle.
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
