import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // tldraw validates its license key in the browser, so the key must be inlined into the client
  // bundle. Accept it under a plain name (TLDRAW_LICENSE_KEY) as well as the NEXT_PUBLIC_ one,
  // because Vercel's dashboard warns on public-prefixed variables. The key is domain-locked, so
  // shipping it to the browser is expected.
  env: {
    NEXT_PUBLIC_TLDRAW_LICENSE_KEY:
      process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY ?? process.env.TLDRAW_LICENSE_KEY ?? "",
  },
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
