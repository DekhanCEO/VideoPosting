"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Lock } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button, Card, Field, Input } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api("/api/session", { method: "POST", json: { password } });
      const next = params.get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <Card className="relative w-full max-w-sm animate-scale-in p-8">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl gradient-brand text-white shadow-[0_8px_24px_-8px_var(--accent)]">
        <Lock className="size-6" />
      </div>
      <h1 className="mt-5 text-center text-xl font-semibold">VideoPosting</h1>
      <p className="mt-1 text-center text-sm text-muted">Saisissez le mot de passe pour accéder au studio.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field error={error}>
          <Input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" invalid={!!error} />
        </Field>
        <Button type="submit" variant="primary" className="w-full" loading={loading} disabled={!password}>
          Se connecter
        </Button>
      </form>
    </Card>
  );
}
