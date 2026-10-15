import type { NextConfig } from "next";

/**
 * Cibles de build (variable BUILD_TARGET) :
 *  - (aucune)     : serveur Next.js classique (npm run dev / npm start) ;
 *  - "standalone" : serveur autonome embarqué dans les versions Windows et macOS ;
 *  - "static"     : interface exportée en fichiers statiques pour l'hébergement PHP (OVH mutualisé…).
 */
const target = process.env.BUILD_TARGET;
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: { unoptimized: true },
  // Ne jamais embarquer les données locales (les paquets de bureau retirent aussi le module d'images, inutile ici).
  outputFileTracingExcludes: {
    "/*": ["./data/**/*"],
  },
  ...(target === "standalone" ? { output: "standalone" as const } : {}),
  ...(target === "static" ? { output: "export" as const, trailingSlash: true, basePath } : {}),
};

export default nextConfig;
