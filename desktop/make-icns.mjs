// Assemble un fichier .icns (icône macOS) à partir des PNG de desktop/icons.
import fs from "node:fs";
import path from "node:path";

const dir = path.join(import.meta.dirname, "icons");
const types = [["icp4", 16], ["icp5", 32], ["icp6", 64], ["ic07", 128], ["ic08", 256], ["ic09", 512], ["ic10", 1024]];
const entries = types.map(([type, size]) => {
  const png = fs.readFileSync(path.join(dir, `icon-${size}.png`));
  const head = Buffer.alloc(8);
  head.write(type, 0, "ascii");
  head.writeUInt32BE(png.length + 8, 4);
  return Buffer.concat([head, png]);
});
const body = Buffer.concat(entries);
const header = Buffer.alloc(8);
header.write("icns", 0, "ascii");
header.writeUInt32BE(body.length + 8, 4);
fs.writeFileSync(path.join(import.meta.dirname, "AppIcon.icns"), Buffer.concat([header, body]));
console.log("AppIcon.icns", body.length + 8, "octets");
