import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_SETTINGS_DEFAULTS } from "../captions";
import type {
  Account,
  AccountSnapshot,
  DailyMetric,
  MediaAsset,
  PlatformId,
  Post,
  RevenueEntry,
  Settings,
  SyncState,
} from "../types";

/**
 * Stockage local très simple : un fichier JSON chargé en mémoire et réécrit
 * de façon atomique (fichier temporaire + rename) après chaque modification.
 * Suffisant pour un outil mono-utilisateur auto-hébergé.
 */

export interface DbShape {
  version: 1;
  secret: string;
  settings: Settings;
  accounts: Account[];
  posts: Post[];
  media: MediaAsset[];
  analytics: {
    snapshots: AccountSnapshot[];
    daily: DailyMetric[];
    sync: Partial<Record<PlatformId, SyncState>>;
  };
  revenues: RevenueEntry[];
  demoRevenueSeeded?: boolean;
}

// Le commentaire évite que le bundler trace (et surveille) tout le projet à cause de ce chemin dynamique.
export const DATA_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR || path.join(process.cwd(), "data"));
const DB_FILE = path.join(/*turbopackIgnore: true*/ DATA_DIR, "db.json");

function defaultSettings(): Settings {
  return {
    // Aucun identifiant d'API configuré au premier lancement : on démarre en mode démo
    // pour pouvoir essayer toute l'interface immédiatement.
    demoMode: true,
    credentials: {
      youtube: { clientId: "", clientSecret: "" },
      tiktok: { clientKey: "", clientSecret: "" },
      instagram: { appId: "", appSecret: "", loginType: "instagram", graphVersion: "v24.0" },
    },
    hashtagGroups: [
      { id: crypto.randomUUID(), name: "Viral", tags: ["fyp", "pourtoi", "viral", "trending"] },
      { id: crypto.randomUUID(), name: "Créateur", tags: ["contentcreator", "creator", "behindthescenes"] },
    ],
    currency: "EUR",
    monthlyRevenueGoal: 2000,
    defaults: { ...DEFAULT_SETTINGS_DEFAULTS },
  };
}

function emptyDb(): DbShape {
  return {
    version: 1,
    secret: crypto.randomBytes(32).toString("hex"),
    settings: defaultSettings(),
    accounts: [],
    posts: [],
    media: [],
    analytics: { snapshots: [], daily: [], sync: {} },
    revenues: [],
  };
}

/** Complète un fichier existant avec les champs ajoutés dans les versions récentes. */
function migrate(raw: Partial<DbShape>): DbShape {
  const base = emptyDb();
  const settings = { ...base.settings, ...(raw.settings ?? {}) } as Settings;
  settings.credentials = {
    youtube: { ...base.settings.credentials.youtube, ...(raw.settings?.credentials?.youtube ?? {}) },
    tiktok: { ...base.settings.credentials.tiktok, ...(raw.settings?.credentials?.tiktok ?? {}) },
    instagram: { ...base.settings.credentials.instagram, ...(raw.settings?.credentials?.instagram ?? {}) },
  };
  settings.defaults = { ...base.settings.defaults, ...(raw.settings?.defaults ?? {}) };
  return {
    version: 1,
    secret: raw.secret || base.secret,
    settings,
    accounts: raw.accounts ?? [],
    posts: raw.posts ?? [],
    media: raw.media ?? [],
    analytics: {
      snapshots: raw.analytics?.snapshots ?? [],
      daily: raw.analytics?.daily ?? [],
      sync: raw.analytics?.sync ?? {},
    },
    revenues: raw.revenues ?? [],
    demoRevenueSeeded: raw.demoRevenueSeeded,
  };
}

class Store {
  private data: DbShape;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(DB_FILE)) {
      try {
        this.data = migrate(JSON.parse(fs.readFileSync(DB_FILE, "utf8")));
      } catch (err) {
        const backup = `${DB_FILE}.corrupted-${Date.now()}`;
        fs.copyFileSync(DB_FILE, backup);
        console.error(`[store] db.json illisible, sauvegardé dans ${backup}`, err);
        this.data = emptyDb();
      }
    } else {
      this.data = emptyDb();
    }
    this.flush();
    process.once("beforeExit", () => this.flush());
  }

  /** Lecture : renvoie une copie pour éviter toute mutation accidentelle. */
  read<T>(fn: (db: DbShape) => T): T {
    return structuredClone(fn(this.data));
  }

  /** Écriture : la fonction modifie la base en place, la sauvegarde est différée. */
  update<T>(fn: (db: DbShape) => T): T {
    const result = fn(this.data);
    this.scheduleSave();
    return result === undefined ? result : structuredClone(result);
  }

  private scheduleSave() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.flush();
    }, 150);
  }

  flush() {
    const tmp = `${DB_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, DB_FILE);
  }
}

const globalForStore = globalThis as unknown as { __vpStore?: Store };

export function db(): Store {
  if (!globalForStore.__vpStore) globalForStore.__vpStore = new Store();
  return globalForStore.__vpStore;
}

/* ------------------------------------------------------------------ */
/* Raccourcis                                                          */
/* ------------------------------------------------------------------ */

export const getSettings = () => db().read((d) => d.settings);
export const getSecret = () => process.env.APP_SECRET || db().read((d) => d.secret);

export const getPost = (id: string) => db().read((d) => d.posts.find((p) => p.id === id));
export const getMedia = (id: string) => db().read((d) => d.media.find((m) => m.id === id));

/** Le compte utilisé dépend du mode : en démo, seuls les comptes de démo sont visibles. */
export function getAccount(platform: PlatformId): Account | undefined {
  return db().read((d) => {
    const demo = d.settings.demoMode;
    return d.accounts.find((a) => a.platform === platform && !!a.demo === demo);
  });
}

export function listAccounts(): Account[] {
  return db().read((d) => d.accounts.filter((a) => !!a.demo === d.settings.demoMode));
}

export function saveAccount(account: Account) {
  db().update((d) => {
    d.accounts = d.accounts.filter((a) => !(a.platform === account.platform && !!a.demo === !!account.demo));
    d.accounts.push(account);
  });
}

export function patchAccount(platform: PlatformId, demo: boolean, patch: Partial<Account>) {
  db().update((d) => {
    const acc = d.accounts.find((a) => a.platform === platform && !!a.demo === demo);
    if (acc) Object.assign(acc, patch);
  });
}

export function removeAccount(platform: PlatformId, demo: boolean) {
  db().update((d) => {
    d.accounts = d.accounts.filter((a) => !(a.platform === platform && !!a.demo === demo));
  });
}
