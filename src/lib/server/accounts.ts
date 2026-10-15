import "server-only";
import { PLATFORMS } from "../platforms";
import type { Account, PlatformId, PublicAccount } from "../types";
import { getCredentials } from "./config";
import { PlatformError } from "./http";
import { adapters } from "./platforms";
import { getAccount, listAccounts, patchAccount } from "./store";

export function toPublicAccount(a: Account): PublicAccount {
  const expired = !!a.expiresAt && a.expiresAt < Date.now() && !a.refreshToken && a.platform !== "instagram";
  const refreshExpired = !!a.refreshExpiresAt && a.refreshExpiresAt < Date.now();
  const igExpired = a.platform === "instagram" && !!a.expiresAt && a.expiresAt < Date.now();
  return {
    platform: a.platform,
    name: a.name,
    username: a.username,
    avatarUrl: a.avatarUrl,
    expiresAt: a.expiresAt,
    connectedAt: a.connectedAt,
    demo: a.demo,
    needsReconnect: !a.demo && (expired || refreshExpired || igExpired || !!a.meta?.needsReconnect),
    meta: a.meta ? { loginType: a.meta.loginType, pageName: a.meta.pageName } : undefined,
  };
}

export function listPublicAccounts(): PublicAccount[] {
  return listAccounts().map(toPublicAccount);
}

const refreshing = new Map<PlatformId, Promise<Account>>();

/**
 * Renvoie le compte connecté avec un jeton valide, en le renouvelant si besoin.
 * `minValidityMs` : marge avant expiration en dessous de laquelle on renouvelle.
 */
export async function getUsableAccount(platform: PlatformId, minValidityMs = 10 * 60_000): Promise<Account> {
  const account = getAccount(platform);
  if (!account) throw new PlatformError(`Aucun compte ${PLATFORMS[platform].name} connecté : connectez-le dans « Comptes ».`);
  if (account.demo) return account;

  const needsRefresh =
    account.expiresAt !== undefined &&
    account.expiresAt - Date.now() < minValidityMs &&
    // Le jeton Instagram longue durée ne peut être renouvelé qu'après 24 h.
    !(platform === "instagram" && Date.now() - account.connectedAt < 24 * 3600_000 && account.expiresAt > Date.now());

  if (!needsRefresh) return account;

  const adapter = adapters[platform];
  if (!adapter.refresh) return account;

  const pending = refreshing.get(platform);
  if (pending) return pending;

  const task = (async () => {
    try {
      const patch = await adapter.refresh!(account, getCredentials(platform));
      patchAccount(platform, false, { ...patch, meta: { ...account.meta, needsReconnect: false } });
      return { ...account, ...patch };
    } catch (err) {
      patchAccount(platform, false, { meta: { ...account.meta, needsReconnect: true } });
      throw err instanceof PlatformError ? err : new PlatformError(`Session expirée : reconnectez votre compte ${PLATFORMS[platform].name}.`);
    } finally {
      refreshing.delete(platform);
    }
  })();
  refreshing.set(platform, task);
  return task;
}

/** Garde les jetons en vie (appelé périodiquement par le planificateur). */
export async function refreshExpiringTokens() {
  for (const account of listAccounts()) {
    if (account.demo || !account.expiresAt) continue;
    // Instagram : jetons de 60 jours, on renouvelle quand il reste moins de 10 jours.
    const margin = account.platform === "instagram" ? 10 * 86400_000 : 30 * 60_000;
    if (account.expiresAt - Date.now() < margin) {
      await getUsableAccount(account.platform, margin).catch((err) =>
        console.warn(`[tokens] Renouvellement ${account.platform} impossible :`, (err as Error).message),
      );
    }
  }
}
