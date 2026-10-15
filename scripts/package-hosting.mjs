// Fabrique le paquet pour hébergement mutualisé (IONOS, OVH…) : dist/<Nom>-hebergement.zip
// Contenu : un dossier (par défaut « uplink ») à déposer à la racine du site, un modèle de .env (hors du dossier public)
// et LISEZ-MOI.txt.
// Usage : node scripts/package-hosting.mjs [--name Uplink] [--base /uplink] [--site https://www.votre-domaine.fr] [--skip-build]
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const arg = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
// Nom de l'application (interface, annonces, pages légales) et dossier publié (par défaut, le nom en minuscules).
const appName = (arg("--name") ?? "Uplink").trim();
if (!/^[\p{L}\p{N} ._-]{2,40}$/u.test(appName)) throw new Error(`Nom invalide : ${appName}`);
const slug = appName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const base = arg("--base") ?? `/${slug}`;
const folder = base.split("/").filter(Boolean).pop();
// Adresse du site : mode d'emploi (adresses à copier) et redirection vers l'adresse officielle (www ou non).
const siteGiven = arg("--site");
const site = (siteGiven ?? "https://votre-domaine.fr").replace(/\/+$/, "");
const siteHost = new URL(site).host;
const domain = siteHost.replace(/^www\./, "");
const label = domain.split(".")[0];

if (!args.includes("--skip-build")) {
  execSync(`node scripts/build-static.mjs --base ${base}`, { cwd: root, stdio: "inherit", env: { ...process.env, NEXT_PUBLIC_APP_NAME: appName } });
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
  `<?php\n// Configuration générée automatiquement — ne pas partager.\nreturn [\n    // Code demandé à la première connexion (installation et désignation de l'administrateur).\n    'setup_code' => '${setupCode}',\n    // Nom de l'application (annonces Discord, pages légales).\n    'app_name' => '${appName.replace(/'/g, "")}',\n];\n`,
);

// 4. Règles Apache (un .env déposé par erreur dans le dossier public reste illisible)
// Adresse officielle : les adresses de retour déclarées chez Twitch, Google, TikTok et Meta doivent correspondre
// exactement ; une visite sur l'autre variante (avec ou sans www) y est donc redirigée.
const canonical = siteGiven
  ? `<IfModule mod_rewrite.c>\n  RewriteEngine On\n  RewriteCond %{HTTP_HOST} !^${siteHost.replace(/\./g, "\\.")}$ [NC]\n  RewriteCond %{HTTP_HOST} ^(www\\.)?${domain.replace(/\./g, "\\.")}$ [NC]\n  RewriteRule ^(.*)$ ${site}${base}/$1 [R=301,L]\n</IfModule>\n\n`
  : "";
fs.writeFileSync(
  path.join(app, ".htaccess"),
  `# ${appName}\nOptions -Indexes\nDirectoryIndex index.html index.php\nErrorDocument 404 ${base}/404.html\n\n${canonical}<FilesMatch "(^\\.env|\\.env$)">\n  <IfModule mod_authz_core.c>\n    Require all denied\n  </IfModule>\n  <IfModule !mod_authz_core.c>\n    Deny from all\n  </IfModule>\n</FilesMatch>\n\n<IfModule mod_headers.c>\n  Header always set X-Content-Type-Options "nosniff"\n  Header always set Referrer-Policy "strict-origin-when-cross-origin"\n</IfModule>\n`,
);
fs.writeFileSync(
  path.join(app, "_next", ".htaccess"),
  `<IfModule mod_headers.c>\n  Header set Cache-Control "public, max-age=31536000, immutable"\n</IfModule>\n`,
);

// 5. Mode d'emploi (hors du dossier publié : il contient le code d'installation)
const readme = fs
  .readFileSync(path.join(root, "hosting", "LISEZ-MOI.txt"), "utf8")
  .replaceAll("{{SETUP_CODE}}", setupCode)
  .replaceAll("{{APP_UPPER}}", appName.toUpperCase())
  .replaceAll("{{APP}}", appName)
  .replaceAll("{{DOMAIN}}", domain)
  .replaceAll("{{SITE_HOST}}", siteHost)
  .replaceAll("{{HOST_PREFIX}}", siteHost === domain ? "@" : siteHost.slice(0, -domain.length - 1))
  .replaceAll("{{LABEL_LOWER}}", label.toLowerCase())
  .replaceAll("{{LABEL}}", label.charAt(0).toUpperCase() + label.slice(1))
  .replaceAll("{{FOLDER}}", folder)
  .replaceAll("{{BASE}}", base)
  .replaceAll("{{SITE}}", site);
fs.writeFileSync(path.join(outRoot, "LISEZ-MOI.txt"), readme.replace(/\n/g, "\r\n"));
// Modèle de .env, à déposer hors du dossier public.
const env = fs
  .readFileSync(path.join(root, "hosting", "env.example"), "utf8")
  .replaceAll("{{APP}}", appName)
  .replaceAll("{{BASE}}", base)
  .replaceAll("{{SITE}}", site);
fs.writeFileSync(path.join(outRoot, ".env"), env);

// 6. Archive
const zipName = `${appName.replace(/[^\p{L}\p{N}_-]+/gu, "-")}-hebergement.zip`;
fs.rmSync(path.join(root, "dist", zipName), { force: true });
execSync(`zip -qr ../${zipName} ${folder} .env LISEZ-MOI.txt`, { cwd: outRoot });
console.log(`✓ dist/${zipName} (code d'installation : ${setupCode})`);
