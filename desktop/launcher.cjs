/**
 * Lanceur des versions Windows et macOS de VideoPosting.
 * Démarre le serveur intégré (Node.js embarqué) sur http://localhost:3737 puis ouvre le navigateur.
 * Les données sont stockées dans le dossier de l'utilisateur, jamais dans le dossier de l'application.
 */
"use strict";

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");

const PORT = Number(process.env.VP_PORT || 3737);
const URL_APP = `http://localhost:${PORT}`;
const appDir = path.join(__dirname, "app");

function dataDirectory() {
  if (process.env.VP_DATA_DIR) return process.env.VP_DATA_DIR;
  if (process.platform === "win32") return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "VideoPosting");
  if (process.platform === "darwin") return path.join(os.homedir(), "Library", "Application Support", "VideoPosting");
  return path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share"), "VideoPosting");
}

const dataDir = dataDirectory();
fs.mkdirSync(path.join(dataDir, "logs"), { recursive: true });
const logFile = fs.createWriteStream(path.join(dataDir, "logs", "videoposting.log"), { flags: "a" });
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(" ")}`;
  console.log(args.join(" "));
  logFile.write(line + "\n");
}

function openBrowser(url) {
  if (process.env.VP_NO_BROWSER === "1") return;
  const cmd = process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    spawn(cmd, args, { detached: true, stdio: "ignore", windowsHide: true }).unref();
  } catch (err) {
    log("Ouvrez ce lien dans votre navigateur :", url);
  }
}

/** VideoPosting tourne-t-il déjà sur ce port ? */
function isRunning() {
  return new Promise((resolve) => {
    const req = http.get({ host: "127.0.0.1", port: PORT, path: "/api/session", timeout: 1500 }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve(body.includes("passwordRequired")));
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

function portFree() {
  return new Promise((resolve) => {
    const srv = require("node:net").createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(PORT, "127.0.0.1");
  });
}

async function waitReady(timeoutMs) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (await isRunning()) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function main() {
  log("");
  log("  VideoPosting");
  log("  ------------");
  if (await isRunning()) {
    log("  Déjà ouvert : ouverture du navigateur.");
    openBrowser(URL_APP);
    return;
  }
  if (!(await portFree())) {
    log(`  Le port ${PORT} est déjà utilisé par un autre programme. Fermez-le puis relancez VideoPosting.`);
    process.exitCode = 1;
    return;
  }

  // Le serveur Next.js autonome est démarré dans ce même processus.
  process.env.NODE_ENV = "production";
  process.env.PORT = String(PORT);
  process.env.HOSTNAME = "127.0.0.1";
  process.env.DATA_DIR = path.join(dataDir, "data");
  process.env.PUBLIC_URL = process.env.PUBLIC_URL || URL_APP;
  process.env.VP_DESKTOP = "1";
  process.env.NEXT_TELEMETRY_DISABLED = "1";
  log(`  Données : ${process.env.DATA_DIR}`);
  log("  Démarrage du serveur…");
  require(path.join(appDir, "server.js"));

  if (await waitReady(60_000)) {
    log(`  Prêt : ${URL_APP}`);
    log("  Gardez cette fenêtre ouverte pendant l'utilisation. Pour quitter : bouton « Quitter » dans l'application ou fermez cette fenêtre.");
    openBrowser(URL_APP);
  } else {
    log("  Le serveur n'a pas répondu à temps. Consultez le journal :", path.join(dataDir, "logs", "videoposting.log"));
  }
}

process.on("uncaughtException", (err) => log("Erreur :", err && err.stack ? err.stack : String(err)));
main();
