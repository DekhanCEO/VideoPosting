import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ensureScheduler } from "./scheduler";

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return json({ error: message, ...extra }, status);
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response> | Response;

/** Enveloppe commune : démarre le planificateur et transforme les erreurs en réponses JSON lisibles. */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      ensureScheduler();
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ZodError) {
        const issue = err.issues[0];
        return fail(`Données invalides : ${issue?.path.join(".")} ${issue?.message ?? ""}`.trim(), 422);
      }
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      console.error("[api]", err);
      return fail(message, 500);
    }
  };
}

export async function readJson<T = unknown>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("Corps de requête JSON invalide.");
  }
}
