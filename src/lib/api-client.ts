"use client";

import { API_MODE, apiUrl, pageUrl } from "./paths";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const method = (rest.method ?? "GET").toUpperCase();
  // Certains hébergements mutualisés filtrent PUT/DELETE : on passe par POST + en-tête de substitution.
  const override = API_MODE === "php" && !["GET", "POST", "HEAD"].includes(method);
  const res = await fetch(apiUrl(url), {
    ...rest,
    method: override ? "POST" : method,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(override ? { "X-HTTP-Method-Override": method } : {}),
      ...rest.headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (res.status === 401 && typeof window !== "undefined" && !url.startsWith("/api/session")) {
    window.location.href = pageUrl("/login", `next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }
  if (!res.ok) {
    const d = (data ?? {}) as Record<string, unknown>;
    throw new ApiError(typeof d.error === "string" ? d.error : `Erreur ${res.status}`, res.status, d);
  }
  return data as T;
}

export const fetcher = <T,>(url: string) => api<T>(url);
