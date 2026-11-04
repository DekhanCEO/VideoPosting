// Exporte la liste des bruitages (calculée par src/cues.ts) vers build/cues.json pour scripts/soundtrack.py.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const { sfxList } = await import("../src/cues.ts");
const tl = JSON.parse(readFileSync(new URL("../src/data/timeline.json", import.meta.url)));
mkdirSync(new URL("../build/", import.meta.url), { recursive: true });
writeFileSync(new URL("../build/cues.json", import.meta.url), JSON.stringify(sfxList(tl), null, 1));
console.log(`build/cues.json : ${sfxList(tl).length} bruitages`);
