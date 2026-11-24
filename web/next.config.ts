import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The shared package ships TypeScript source, not compiled JS.
  transpilePackages: ["@dg/shared"],
  // Tailwind v4 via the Turbopack loader (what create-next-app 16 sets up).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
