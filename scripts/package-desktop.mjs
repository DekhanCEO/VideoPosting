// Fabrique les versions « portables » Windows et macOS :
//   dist/VideoPosting-Windows.zip  (Windows 10/11, 64 bits)
//   dist/VideoPosting-macOS.zip    (macOS 11+, Apple Silicon et Intel)
// Chaque version embarque Node.js (binaire officiel vérifié par SHA-256) et le serveur Next.js autonome.
// Usage : node scripts/package-desktop.mjs [--only windows|macos] [--skip-build]
import { execFileSync, execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : "all";
const work = path.join(root, ".build-desktop");
const cache = path.join(work, "cache");
const dist = path.join(root, "dist");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
fs.mkdirSync(cache, { recursive: true });
fs.mkdirSync(dist, { recursive: true });

const run = (cmd, opts = {}) => execSync(cmd, { cwd: root, stdio: "inherit", ...opts });
const curl = (url, out) => execFileSync("curl", ["-fsSL", "--retry", "3", "-o", out, url], { stdio: "inherit" });

/* 1. Serveur autonome ------------------------------------------------------- */
if (!args.includes("--skip-build")) {
  fs.rmSync(path.join(root, ".next"), { recursive: true, force: true });
  run("npx next build", { env: { ...process.env, BUILD_TARGET: "standalone", NEXT_TELEMETRY_DISABLED: "1" } });
}
const standalone = path.join(root, ".next", "standalone");
if (!fs.existsSync(path.join(standalone, "server.js"))) throw new Error("Build autonome introuvable (.next/standalone/server.js)");

const app = path.join(work, "app");
fs.rmSync(app, { recursive: true, force: true });
fs.cpSync(standalone, app, { recursive: true, verbatimSymlinks: true });
// Jamais de données locales ni de binaires d'images Linux dans le paquet.
for (const p of ["data", "dist", "src", "node_modules/@img", "node_modules/sharp"]) fs.rmSync(path.join(app, p), { recursive: true, force: true });
fs.cpSync(path.join(root, ".next", "static"), path.join(app, ".next", "static"), { recursive: true });
fs.cpSync(path.join(root, "public"), path.join(app, "public"), { recursive: true });

/* 2. Node.js officiel -------------------------------------------------------- */
const index = JSON.parse(execFileSync("curl", ["-fsSL", "https://nodejs.org/dist/index.json"]).toString());
const release = index.find((r) => r.version.startsWith("v22.") && r.lts);
const version = release.version;
console.log(`→ Node.js ${version}`);
const shasums = execFileSync("curl", ["-fsSL", `https://nodejs.org/dist/${version}/SHASUMS256.txt`]).toString();

function download(file) {
  const out = path.join(cache, file);
  if (!fs.existsSync(out)) curl(`https://nodejs.org/dist/${version}/${file}`, out);
  const expected = shasums.split("\n").find((l) => l.endsWith(`  ${file}`))?.split(/\s+/)[0];
  const actual = crypto.createHash("sha256").update(fs.readFileSync(out)).digest("hex");
  if (!expected || expected !== actual) {
    fs.rmSync(out, { force: true });
    throw new Error(`Empreinte SHA-256 invalide pour ${file}`);
  }
  return out;
}

function extract(archive, member, dest) {
  const tmp = fs.mkdtempSync(path.join(work, "x-"));
  if (archive.endsWith(".zip")) execFileSync("unzip", ["-q", archive, member, "-d", tmp]);
  else execFileSync("tar", ["-xzf", archive, "-C", tmp, member]);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(tmp, member), dest);
  fs.rmSync(tmp, { recursive: true, force: true });
}

function zip(cwd, name, entries) {
  const out = path.join(dist, name);
  fs.rmSync(out, { force: true });
  // -y : conserve les liens ; les droits d'exécution Unix sont enregistrés dans l'archive.
  execFileSync("zip", ["-qry", out, ...entries], { cwd });
  console.log(`✓ dist/${name} (${(fs.statSync(out).size / 1024 ** 2).toFixed(0)} Mo)`);
}

/* 3. Windows ----------------------------------------------------------------- */
if (only === "all" || only === "windows") {
  const base = `node-${version}-win-x64`;
  const archive = download(`${base}.zip`);
  const out = path.join(work, "windows");
  const dir = path.join(out, "VideoPosting");
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  extract(archive, `${base}/node.exe`, path.join(dir, "runtime", "node.exe"));
  extract(archive, `${base}/LICENSE`, path.join(dir, "runtime", "LICENSE-nodejs.txt"));
  fs.cpSync(app, path.join(dir, "app"), { recursive: true, verbatimSymlinks: true });
  fs.copyFileSync(path.join(root, "desktop", "launcher.cjs"), path.join(dir, "launcher.cjs"));
  const readme = fs.readFileSync(path.join(root, "desktop", "LISEZ-MOI-Windows.txt"), "utf8").replace(/\r?\n/g, "\r\n");
  fs.writeFileSync(path.join(dir, "LISEZ-MOI.txt"), readme);
  fs.writeFileSync(
    path.join(dir, "VideoPosting.bat"),
    [
      "@echo off",
      "title VideoPosting",
      'cd /d "%~dp0"',
      "echo.",
      "echo   VideoPosting demarre, votre navigateur va s'ouvrir...",
      "echo   Laissez cette fenetre ouverte pendant l'utilisation (reduisez-la si besoin).",
      "echo.",
      '"%~dp0runtime\\node.exe" "%~dp0launcher.cjs"',
      "if errorlevel 1 pause",
      "",
    ].join("\r\n"),
  );
  zip(out, "VideoPosting-Windows.zip", ["VideoPosting"]);
}

/* 4. macOS ------------------------------------------------------------------- */
if (only === "all" || only === "macos") {
  const out = path.join(work, "macos");
  const bundle = path.join(out, "VideoPosting.app");
  const contents = path.join(bundle, "Contents");
  const res = path.join(contents, "Resources");
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(contents, "MacOS"), { recursive: true });
  fs.mkdirSync(path.join(res, "runtime"), { recursive: true });

  for (const arch of ["arm64", "x64"]) {
    const base = `node-${version}-darwin-${arch}`;
    const archive = download(`${base}.tar.gz`);
    extract(archive, `${base}/bin/node`, path.join(res, "runtime", `node-${arch}`));
    fs.chmodSync(path.join(res, "runtime", `node-${arch}`), 0o755);
    if (arch === "arm64") extract(archive, `${base}/LICENSE`, path.join(res, "runtime", "LICENSE-nodejs.txt"));
  }
  fs.cpSync(app, path.join(res, "app"), { recursive: true, verbatimSymlinks: true });
  fs.copyFileSync(path.join(root, "desktop", "launcher.cjs"), path.join(res, "launcher.cjs"));
  fs.copyFileSync(path.join(root, "desktop", "AppIcon.icns"), path.join(res, "AppIcon.icns"));

  const main = path.join(contents, "MacOS", "VideoPosting");
  fs.writeFileSync(
    main,
    `#!/bin/bash
# Lance VideoPosting avec le Node.js adapté au processeur (Apple Silicon ou Intel).
RES="$(cd "$(dirname "$0")/../Resources" && pwd)"
if [ "$(uname -m)" = "arm64" ] || [ "$(sysctl -n sysctl.proc_translated 2>/dev/null)" = "1" ]; then
  NODE="$RES/runtime/node-arm64"
else
  NODE="$RES/runtime/node-x64"
fi
mkdir -p "$HOME/Library/Logs"
exec "$NODE" "$RES/launcher.cjs" >> "$HOME/Library/Logs/VideoPosting.log" 2>&1
`,
  );
  fs.chmodSync(main, 0o755);
  fs.writeFileSync(
    path.join(contents, "Info.plist"),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>VideoPosting</string>
  <key>CFBundleDisplayName</key><string>VideoPosting</string>
  <key>CFBundleIdentifier</key><string>fr.malabop.videoposting</string>
  <key>CFBundleVersion</key><string>${pkg.version}</string>
  <key>CFBundleShortVersionString</key><string>${pkg.version}</string>
  <key>CFBundleExecutable</key><string>VideoPosting</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>LSUIElement</key><true/>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
`,
  );
  fs.writeFileSync(path.join(out, "LISEZ-MOI.txt"), fs.readFileSync(path.join(root, "desktop", "LISEZ-MOI-macOS.txt")));
  zip(out, "VideoPosting-macOS.zip", ["VideoPosting.app", "LISEZ-MOI.txt"]);
}
