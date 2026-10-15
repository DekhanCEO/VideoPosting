"use client";

import useSWR from "swr";
import { fetcher } from "./api-client";
import type { PublicDiscordWebhook } from "./discord";
import type {
  AdminOverview,
  AnalyticsRange,
  AnalyticsSummary,
  DashboardData,
  PostWithMedia,
  PublicAccount,
  PublicSettings,
  RevenueSummary,
  SessionInfo,
} from "./types";

const isActive = (p?: PostWithMedia | null) =>
  !!p && (p.status === "publishing" || Object.values(p.publications).some((x) => x && ["pending", "uploading", "processing"].includes(x.status)));

export function useSettings() {
  return useSWR<PublicSettings>("/api/settings", fetcher, { revalidateOnFocus: false });
}

export function useSession() {
  return useSWR<SessionInfo>("/api/session", fetcher, { revalidateOnFocus: false });
}

/** Gestion des espaces (hébergement avec connexion Twitch, administrateurs uniquement). */
export function useAdmin(enabled = true) {
  return useSWR<AdminOverview>(enabled ? "/api/admin" : null, fetcher);
}

export function useAccounts() {
  return useSWR<PublicAccount[]>("/api/accounts", fetcher);
}

export function usePosts() {
  return useSWR<PostWithMedia[]>("/api/posts", fetcher, {
    refreshInterval: (data) => (data?.some(isActive) ? 1500 : 30_000),
  });
}

export function usePost(id: string | null | undefined) {
  return useSWR<PostWithMedia>(id ? `/api/posts/${id}` : null, fetcher, {
    refreshInterval: (data) => (isActive(data) ? 1000 : 0),
  });
}

export function useDashboard() {
  return useSWR<DashboardData>("/api/dashboard", fetcher, {
    refreshInterval: (data) => (data && data.counts.publishing > 0 ? 2000 : 30_000),
  });
}

export function useAnalytics(range: AnalyticsRange) {
  return useSWR<AnalyticsSummary>(`/api/analytics?range=${range}`, fetcher, { keepPreviousData: true });
}

export function useRevenue(from?: string, to?: string) {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  return useSWR<RevenueSummary>(`/api/revenue?${q}`, fetcher, { keepPreviousData: true });
}

/** Webhooks Discord de l'espace (annonces automatiques des publications). */
export function useDiscordWebhooks() {
  return useSWR<PublicDiscordWebhook[]>("/api/discord/webhooks", fetcher, { revalidateOnFocus: false });
}
