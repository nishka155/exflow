import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tree-shakes barrel-file imports from these packages so a page that
  // uses e.g. one lucide icon or one recharts component doesn't pull in
  // the whole library's JS into its bundle.
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default nextConfig;
