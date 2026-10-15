// Construit l'interface en fichiers statiques pour l'hébergement PHP (sortie : .build-static/out).
// Usage : node scripts/build-static.mjs [--base /posting]
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const argBase = process.argv.indexOf("--base");
const basePath = argBase > -1 ? process.argv[argBase + 1] : "/posting";
if (!/^\/[\w-]+(\/[\w-]+)*$/.test(basePath)) throw new Error(`Chemin invalide : ${basePath} (ex. /posting)`);

const work = path.join(root, ".build-static");
fs.rmSync(work, { recursive: true, force: true });
fs.mkdirSync(work, { recursive: true });

// Le serveur Next.js (routes /api, proxy, planificateur) n'existe pas en export statique : l'API est fournie par PHP.
const EXCLUDE = new Set(["src/app/api", "src/proxy.ts", "src/instrumentation.ts", "src/lib/server"].map((p) => path.join(root, p)));
for (const entry of ["package.json", "tsconfig.json", "next.config.ts", "postcss.config.mjs", "public", "src"]) {
  fs.cpSync(path.join(root, entry), path.join(work, entry), {
    recursive: true,
    filter: (src) => !EXCLUDE.has(src),
  });
}
fs.symlinkSync(path.join(root, "node_modules"), path.join(work, "node_modules"), "dir");

console.log(`→ Export statique (base ${basePath})…`);
execSync("npx next build", {
  cwd: work,
  stdio: "inherit",
  env: {
    ...process.env,
    BUILD_TARGET: "static",
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_API_MODE: "php",
    NEXT_PUBLIC_TRAILING_SLASH: "1",
    NEXT_TELEMETRY_DISABLED: "1",
  },
});
console.log(`✓ Interface exportée dans ${path.relative(root, path.join(work, "out"))}`);
