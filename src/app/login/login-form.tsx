"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertCircle, BookOpen, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api-client";
import { BASE_PATH, apiUrl } from "@/lib/paths";
import type { SessionInfo } from "@/lib/types";
import { TwitchLogo } from "@/components/icons";
import { Button, Card, CopyField, ExternalA, Field, Input, Skeleton, Steps, buttonClass } from "@/components/ui";
import { APP_NAME } from "@/lib/brand";

function Logo({ icon }: { icon: React.ReactNode }) {
  return (
    <div className="mx-auto flex size-14 items-center justify-center rounded-2xl gradient-brand text-white shadow-[0_8px_24px_-8px_var(--accent)]">{icon}</div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/8 p-3 text-sm text-danger">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

/** Nom d'application Twitch proposé : « Uplink Dsociety » pour dsociety.fr (le nom doit être unique sur Twitch). */
function suggestedName() {
  const label = window.location.hostname.replace(/^www\./, "").split(".")[0] ?? "";
  return /^[a-z0-9-]+$/i.test(label) && !/^\d+$/.test(label) ? `${APP_NAME} ${label[0].toUpperCase()}${label.slice(1)}` : `${APP_NAME} Studio`;
}

/** Première visite sur l'hébergement : code d'installation + application Twitch, puis connexion Twitch. */
function TwitchSetup({ info, initialError }: { info: SessionInfo; initialError: string | null }) {
  const [setupCode, setSetupCode] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const saved = !!info.twitchConfigured;
  const [guide, setGuide] = useState(!saved);
  const [error, setError] = useState(initialError ?? "");
  const [loading, setLoading] = useState(false);
  const redirectUri = info.redirectUri ?? "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { redirect } = await api<{ redirect: string }>("/api/session/setup", {
        method: "POST",
        json: { setupCode: setupCode.trim(), clientId: clientId.trim(), clientSecret: clientSecret.trim() },
      });
      window.location.assign(redirect);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <Card className="relative w-full max-w-lg animate-scale-in p-6 sm:p-8">
      <Logo icon={<KeyRound className="size-6" />} />
      <h1 className="mt-5 text-center text-xl font-semibold">Installation de {APP_NAME}</h1>
      <p className="mx-auto mt-1 max-w-sm text-center text-sm text-muted">
        Une seule fois : reliez votre application Twitch, puis connectez-vous. Vous deviendrez l&apos;administrateur de cet espace.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-5">
        <Field htmlFor="setup-code" label="1. Code d'installation" hint={`Il figure dans le fichier LISEZ-MOI.txt livré avec le dossier « ${BASE_PATH.split("/").pop() || APP_NAME.toLowerCase()} ».`}>
          <Input id="setup-code" autoFocus value={setupCode} onChange={(e) => setSetupCode(e.target.value)} placeholder="XXXX-XXXX-XXXX" autoComplete="off" spellCheck={false} />
        </Field>

        {info.twitchFromEnv ? (
          <div className="flex items-start gap-3 rounded-xl border border-success/25 bg-success/8 p-3.5 text-sm">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
            <p>
              <span className="font-medium">2. Application Twitch : trouvée dans votre fichier .env.</span>{" "}
              <span className="text-muted">Rien à saisir ici.</span>
            </p>
          </div>
        ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium">2. Application Twitch</p>
          <div className="rounded-xl border border-border">
            <button type="button" onClick={() => setGuide((g) => !g)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium">
              <BookOpen className="size-4 text-accent" /> Créer l&apos;application Twitch (2 minutes)
              <span className="ml-auto text-xs text-muted">{guide ? "Masquer" : "Afficher"}</span>
            </button>
            {guide && (
              <div className="space-y-3 border-t border-border p-4">
                <Steps
                  steps={[
                    <>
                      Ouvrez la <ExternalA href="https://dev.twitch.tv/console/apps/create">console Twitch Developers</ExternalA> et connectez-vous (Twitch
                      demande d&apos;activer l&apos;authentification à deux facteurs).
                    </>,
                    <>Nom : par exemple « {suggestedName()} » (nom libre, mais unique sur Twitch).</>,
                    <>
                      <span className="block">URL de redirection OAuth : collez exactement cette adresse.</span>
                      <span className="mt-1.5 block">
                        <CopyField value={redirectUri} wrap />
                      </span>
                    </>,
                    <>Catégorie : « Website Integration », type de client : « Confidentiel ». Cliquez sur « Créer ».</>,
                    <>
                      Cliquez sur « Gérer » : copiez l&apos;<strong>ID client</strong>, puis « Nouveau secret » et copiez le <strong>secret client</strong>.
                    </>,
                  ]}
                />
              </div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field htmlFor="twitch-client-id" label="ID client">
              <Input
                id="twitch-client-id"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder={saved ? "Déjà enregistré" : "Collez la valeur ici"}
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
            <Field htmlFor="twitch-client-secret" label="Secret client">
              <Input
                id="twitch-client-secret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder={saved ? "•••••••• (enregistré)" : "Collez la valeur ici"}
                autoComplete="new-password"
              />
            </Field>
          </div>
          {saved && <p className="text-xs text-muted">Application Twitch déjà enregistrée : laissez ces champs vides pour la conserver.</p>}
        </div>
        )}

        {error && <ErrorBox message={error} />}

        <Button
          type="submit"
          variant="twitch"
          size="lg"
          className="w-full"
          loading={loading}
          disabled={!setupCode.trim() || (!saved && (!clientId.trim() || !clientSecret.trim()))}
        >
          {!loading && <TwitchLogo className="size-[18px]" />} 3. Continuer avec Twitch
        </Button>
        {!redirectUri.startsWith("https://") && (
          <p className="text-center text-xs text-warning">
            Votre site n&apos;est pas en HTTPS : activez le certificat SSL (gratuit chez OVH) avant de continuer, Twitch l&apos;exige.
          </p>
        )}
      </form>
    </Card>
  );
}

/** Connexion habituelle : bouton « Se connecter avec Twitch ». */
function TwitchLogin({ error }: { error: string | null }) {
  const [loading, setLoading] = useState(false);
  return (
    <Card className="relative w-full max-w-sm animate-scale-in p-8">
      <Logo
        icon={
          <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden>
            <path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5Z" />
          </svg>
        }
      />
      <h1 className="mt-5 text-center text-xl font-semibold">{APP_NAME}</h1>
      <p className="mt-1 text-center text-sm text-muted">Connectez-vous avec Twitch pour retrouver votre espace : publications, comptes et statistiques.</p>
      <div className="mt-6 space-y-4">
        {error && <ErrorBox message={error} />}
        <Button
          variant="twitch"
          size="lg"
          className="w-full"
          loading={loading}
          onClick={() => {
            setLoading(true);
            window.location.assign(apiUrl("/api/auth/twitch/login"));
          }}
        >
          {!loading && <TwitchLogo className="size-[18px]" />} Se connecter avec Twitch
        </Button>
        <p className="flex items-start gap-2 text-xs text-muted">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" />
          Twitch sert uniquement à vous identifier : aucune autorisation de publication ni d&apos;accès à votre chaîne n&apos;est demandée.
        </p>
      </div>
    </Card>
  );
}

function HttpsNotice() {
  const secure = window.location.href.replace(/^http:/, "https:");
  return (
    <Card className="relative w-full max-w-sm animate-scale-in p-8 text-center">
      <Logo icon={<Lock className="size-6" />} />
      <h1 className="mt-5 text-xl font-semibold">Connexion sécurisée requise</h1>
      <p className="mt-1 text-sm text-muted">La connexion avec Twitch fonctionne uniquement en HTTPS.</p>
      <a href={secure} className={buttonClass("primary", "lg", "mt-6 w-full")}>
        Ouvrir la version sécurisée
      </a>
      <p className="mt-4 text-xs text-muted">
        Si la page ne s&apos;ouvre pas, activez le certificat SSL gratuit de votre hébergement (OVH : onglet « Multisite », colonne SSL).
      </p>
    </Card>
  );
}

/** Mot de passe unique (serveur Node.js avec APP_PASSWORD). */
function PasswordLogin({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/api/session", { method: "POST", json: { password } });
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <Card className="relative w-full max-w-sm animate-scale-in p-8">
      <Logo icon={<Lock className="size-6" />} />
      <h1 className="mt-5 text-center text-xl font-semibold">{APP_NAME}</h1>
      <p className="mt-1 text-center text-sm text-muted">Saisissez le mot de passe pour accéder au studio.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field error={error}>
          <Input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            autoComplete="current-password"
            invalid={!!error}
          />
        </Field>
        <Button type="submit" variant="primary" className="w-full" loading={loading} disabled={!password}>
          Se connecter
        </Button>
      </form>
    </Card>
  );
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [loadError, setLoadError] = useState("");

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
      .catch((err) => setLoadError((err as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loadError) {
    return (
      <Card className="relative w-full max-w-sm p-8">
        <ErrorBox message={`Le serveur ne répond pas correctement : ${loadError}`} />
      </Card>
    );
  }
  if (!info) {
    return (
      <Card className="relative w-full max-w-sm p-8">
        <Skeleton className="mx-auto size-14 rounded-2xl" />
        <Skeleton className="mx-auto mt-5 h-6 w-40" />
        <Skeleton className="mt-6 h-10" />
      </Card>
    );
  }
  if (info.loginMethod === "twitch") {
    // Twitch n'accepte que l'adresse de retour https déclarée : on bascule sur la version sécurisée du site.
    const insecure = window.location.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
    if (insecure) return <HttpsNotice />;
    return info.setupRequired ? <TwitchSetup info={info} initialError={params.get("error")} /> : <TwitchLogin error={params.get("error")} />;
  }
  return <PasswordLogin onDone={goNext} />;
}
