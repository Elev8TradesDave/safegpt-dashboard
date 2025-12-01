import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turn off ESLint blocking the production build.
  // Lint will still run in dev, but build on Render won't fail on style issues.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
