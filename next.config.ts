import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les vidéos sont envoyées par morceaux : pas besoin d'augmenter la taille des corps de requête.
  poweredByHeader: false,
  images: { unoptimized: true },
};

export default nextConfig;
