"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { KeyRound, Lock } from "lucide-react";
import { api } from "@/lib/api-client";
import type { SessionInfo } from "@/lib/types";
import { Button, Card, Field, Input, Skeleton } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const goNext = () => {
    const next = params.get("next");
    // Chemin interne uniquement (évite toute redirection vers un autre site).
    if (next && next.startsWith("/") && !next.startsWith("//")) window.location.assign(next);
    else router.replace("/");
  };

  useEffect(() => {
    api<SessionInfo>("/api/session")
      .then((s) => {
        if (s.authenticated && !s.setupRequired) goNext();
        else setInfo(s);
      })
      .catch(() => setInfo({ authenticated: false, passwordRequired: true, setupRequired: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (info?.setupRequired) {
      if (password.length < 8) return setError("Choisissez un mot de passe d'au moins 8 caractères.");
      if (password !== confirm) return setError("Les deux mots de passe ne correspondent pas.");
    }
    setLoading(true);
    try {
      await api("/api/session", {
        method: "POST",
        json: info?.setupRequired ? { password, setupCode: setupCode.trim() } : { password },
      });
      goNext();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  if (!info) {
    return (
      <Card className="relative w-full max-w-sm p-8">
        <Skeleton className="mx-auto size-14 rounded-2xl" />
        <Skeleton className="mx-auto mt-5 h-6 w-40" />
        <Skeleton className="mt-6 h-10" />
      </Card>
    );
  }

  const setup = info.setupRequired;

  return (
    <Card className="relative w-full max-w-sm animate-scale-in p-8">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl gradient-brand text-white shadow-[0_8px_24px_-8px_var(--accent)]">
        {setup ? <KeyRound className="size-6" /> : <Lock className="size-6" />}
      </div>
      <h1 className="mt-5 text-center text-xl font-semibold">{setup ? "Bienvenue sur VideoPosting" : "VideoPosting"}</h1>
      <p className="mt-1 text-center text-sm text-muted">
        {setup
          ? "Première connexion : saisissez le code d'installation (fichier LISEZ-MOI.txt) et choisissez votre mot de passe."
          : "Saisissez le mot de passe pour accéder au studio."}
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {setup && (
          <Field label="Code d'installation">
            <Input autoFocus value={setupCode} onChange={(e) => setSetupCode(e.target.value)} placeholder="XXXX-XXXX-XXXX" autoComplete="off" />
          </Field>
        )}
        <Field label={setup ? "Nouveau mot de passe" : undefined} error={setup ? undefined : error}>
          <Input
            type="password"
            autoFocus={!setup}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            autoComplete={setup ? "new-password" : "current-password"}
            invalid={!setup && !!error}
          />
        </Field>
        {setup && (
          <Field label="Confirmer le mot de passe" error={error}>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Mot de passe" autoComplete="new-password" />
          </Field>
        )}
        <Button type="submit" variant="primary" className="w-full" loading={loading} disabled={!password || (setup && !setupCode)}>
          {setup ? "Créer mon accès" : "Se connecter"}
        </Button>
      </form>
    </Card>
  );
}
