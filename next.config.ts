import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La app depende casi por completo de la sesión del usuario, así que
  // usamos renderizado dinámico clásico en lugar de Cache Components.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
