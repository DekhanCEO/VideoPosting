// Fabrique le paquet pour hébergement mutualisé (OVH…) : dist/VideoPosting-hebergement.zip
// Contenu : un dossier « posting » à déposer à la racine du site (www) + LISEZ-MOI.txt.
// Usage : node scripts/package-hosting.mjs [--base /posting] [--skip-build]
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "/posting";
const folder = base.split("/").filter(Boolean).pop();

if (!args.includes("--skip-build")) {
  execSync(`node scripts/build-static.mjs --base ${base}`, { cwd: root, stdio: "inherit" });
}

const outRoot = path.join(root, "dist", "hebergement");
const app = path.join(outRoot, folder);
fs.rmSync(outRoot, { recursive: true, force: true });
fs.mkdirSync(outRoot, { recursive: true });

// 1. Interface (export statique)
fs.cpSync(path.join(root, ".build-static", "out"), app, { recursive: true });
// 2. API PHP + dossier de données protégé
fs.cpSync(path.join(root, "hosting", "php", "api"), path.join(app, "api"), { recursive: true });
fs.cpSync(path.join(root, "hosting", "php", "data"), path.join(app, "data"), { recursive: true });
fs.rmSync(path.join(app, "api", "config.php"), { force: true });

// 3. Code d'installation (demandé à la première connexion, pour que personne d'autre ne puisse s'approprier l'outil)
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const setupCode = Array.from({ length: 3 }, () =>
  Array.from({ length: 4 }, () => alphabet[crypto.randomInt(alphabet.length)]).join(""),
).join("-");
fs.writeFileSync(
  path.join(app, "api", "config.php"),
  `<?php\n// Configuration générée automatiquement — ne pas partager.\nreturn [\n    // Code demandé à la première connexion pour choisir votre mot de passe.\n    'setup_code' => '${setupCode}',\n];\n`,
);

// 4. Règles Apache
fs.writeFileSync(
  path.join(app, ".htaccess"),
  `# VideoPosting\nOptions -Indexes\nDirectoryIndex index.html index.php\nErrorDocument 404 ${base}/404.html\n\n<IfModule mod_headers.c>\n  Header always set X-Content-Type-Options "nosniff"\n  Header always set Referrer-Policy "strict-origin-when-cross-origin"\n</IfModule>\n`,
);
fs.writeFileSync(
  path.join(app, "_next", ".htaccess"),
  `<IfModule mod_headers.c>\n  Header set Cache-Control "public, max-age=31536000, immutable"\n</IfModule>\n`,
);

// 5. Mode d'emploi (hors du dossier publié : il contient le code d'installation)
const readme = fs
  .readFileSync(path.join(root, "hosting", "LISEZ-MOI.txt"), "utf8")
  .replaceAll("{{SETUP_CODE}}", setupCode)
  .replaceAll("{{FOLDER}}", folder)
  .replaceAll("{{BASE}}", base);
fs.writeFileSync(path.join(outRoot, "LISEZ-MOI.txt"), readme.replace(/\n/g, "\r\n"));

// 6. Archive
const zipName = "VideoPosting-hebergement.zip";
fs.rmSync(path.join(root, "dist", zipName), { force: true });
execSync(`zip -qr ../${zipName} ${folder} LISEZ-MOI.txt`, { cwd: outRoot });
console.log(`✓ dist/${zipName} (code d'installation : ${setupCode})`);
