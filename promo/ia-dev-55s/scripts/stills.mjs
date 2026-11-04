// Rend des images fixes de la composition (contrôle visuel) : node scripts/stills.mjs <dossier> <composition> <images...>
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { mkdirSync } from "node:fs";

const [outDir = "build/stills", compId = "IaDev55", ...frames] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: compId, browserExecutable: process.env.REMOTION_BROWSER ?? null });
for (const fr of frames.length ? frames.map(Number) : [0]) {
  const output = path.join(outDir, `${compId}_${String(fr).padStart(4, "0")}.png`);
  await renderStill({ serveUrl, composition, frame: fr, output, scale: 1, browserExecutable: process.env.REMOTION_BROWSER ?? null });
  console.log(output);
}
