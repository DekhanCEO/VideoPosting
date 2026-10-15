"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import useSWR from "swr";
import { ArrowUpRight, Mail } from "lucide-react";
import { fetcher } from "@/lib/api-client";
import { DEFAULT_LEGAL, LEGAL_PAGES, LEGAL_UPDATED, legalInfo, type LegalInfo } from "@/lib/legal";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Informations de l'éditeur (chargées depuis le serveur)              */
/* ------------------------------------------------------------------ */

const LegalContext = createContext<{ info: LegalInfo; host: string }>({ info: DEFAULT_LEGAL, host: "" });

function useLegal() {
  return useContext(LegalContext);
}

/** Nom du service (nom de l'application par défaut). */
export function Service() {
  return <>{useLegal().info.serviceName}</>;
}

/** Adresse du site, ex. « malabop.fr ». */
export function Site() {
  const { host } = useLegal();
  return <>{host || "ce site"}</>;
}

/** Éditeur : nom renseigné par l'administrateur, à défaut l'exploitant du site. */
export function Editor() {
  const { info, host } = useLegal();
  return <>{info.editor || `l'exploitant du site ${host || "sur lequel le service est installé"}`}</>;
}

/** Moyen de contact : adresse e-mail renseignée par l'administrateur. */
export function Contact() {
  const { info, host } = useLegal();
  if (info.email) {
    return (
      <a href={`mailto:${info.email}`} className="font-medium">
        {info.email}
      </a>
    );
  }
  return <>l&apos;éditeur, par les moyens de contact indiqués sur {host || "le site"}</>;
}

/** Fiche d'identification (seuls les champs renseignés sont affichés). */
export function EditorCard() {
  const { info, host } = useLegal();
  const rows: [string, ReactNode][] = [
    ["Service", info.serviceName],
    ["Site", host || "—"],
    ...(info.editor ? ([["Éditeur", info.editor]] as [string, ReactNode][]) : []),
    ...(info.email ? ([["Contact", <a key="m" href={`mailto:${info.email}`}>{info.email}</a>]] as [string, ReactNode][]) : []),
  ];
  return (
    <dl className="not-prose mt-4 grid gap-x-6 gap-y-2 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-[auto_1fr]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="font-medium break-words [&_a]:text-accent">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------ */
/* Mise en page                                                        */
/* ------------------------------------------------------------------ */

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

export interface LegalHighlight {
  icon: ReactNode;
  title: string;
  text: ReactNode;
}

function LogoMark() {
  return (
    <span className="flex size-8 items-center justify-center rounded-lg gradient-brand shadow-[0_4px_14px_-4px_var(--accent)]">
      <svg viewBox="0 0 24 24" className="size-3.5 text-white" fill="currentColor" aria-hidden>
        <path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5Z" />
      </svg>
    </span>
  );
}

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  const key = ids.join("|");
  useEffect(() => {
    const ids = key.split("|");
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -65% 0px" },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [key]);
  return active;
}

export function LegalPage({
  current,
  intro,
  highlights,
  sections,
}: {
  current: keyof typeof LEGAL_PAGES;
  intro: ReactNode;
  highlights: LegalHighlight[];
  sections: LegalSection[];
}) {
  const { data } = useSWR<LegalInfo>("/api/legal", fetcher, { revalidateOnFocus: false, shouldRetryOnError: false });
  const [host, setHost] = useState("");
  useEffect(() => setHost(window.location.host), []);
  const info = legalInfo(data);
  const active = useActiveSection(sections.map((s) => s.id));
  const other = current === "terms" ? "privacy" : "terms";
  const page = LEGAL_PAGES[current];

  return (
    <LegalContext.Provider value={{ info, host }}>
      <div className="min-h-dvh bg-bg">
        <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur print:hidden">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link href="/" className="flex min-w-0 items-center gap-2.5">
              <LogoMark />
              <span className="truncate text-[15px] font-semibold tracking-tight">{info.serviceName}</span>
            </Link>
            <nav className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-surface-2 p-1 text-sm" aria-label="Documents légaux">
              {(Object.keys(LEGAL_PAGES) as (keyof typeof LEGAL_PAGES)[]).map((k) => (
                <Link
                  key={k}
                  href={LEGAL_PAGES[k].path}
                  aria-current={k === current ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-2.5 py-1 font-medium whitespace-nowrap transition-colors sm:px-3",
                    k === current ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg",
                  )}
                >
                  {k === "terms" ? "Conditions" : "Confidentialité"}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
          <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] xl:gap-16">
            <aside className="hidden print:hidden lg:block">
              <nav className="sticky top-24" aria-label="Sur cette page">
                <p className="mb-3 text-xs font-semibold tracking-wide text-subtle uppercase">Sur cette page</p>
                <ol className="space-y-0.5 border-l border-border">
                  {sections.map((s, i) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className={cn(
                          "-ml-px block border-l-2 py-1.5 pr-2 pl-3 text-[13px] leading-snug transition-colors",
                          active === s.id ? "border-accent font-medium text-fg" : "border-transparent text-muted hover:border-border-strong hover:text-fg",
                        )}
                      >
                        <span className="mr-1.5 tabular-nums text-subtle">{i + 1}.</span>
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>

            <article className="min-w-0 max-w-3xl">
              <p className="text-sm font-medium text-accent">
                Document légal · <Service />
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{page.title}</h1>
              <p className="mt-3 text-sm text-muted">Dernière mise à jour : {LEGAL_UPDATED}</p>

              <div className="legal-prose mt-6 text-[16px] sm:text-[17px]">{intro}</div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {highlights.map((h) => (
                  <div key={h.title} className="rounded-2xl border border-border bg-surface p-4 shadow-card">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent [&>svg]:size-[18px]">{h.icon}</span>
                    <p className="mt-3 text-sm font-semibold">{h.title}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted">{h.text}</p>
                  </div>
                ))}
              </div>

              <details className="mt-8 rounded-xl border border-border bg-surface px-4 py-3 print:hidden lg:hidden">
                <summary className="cursor-pointer text-sm font-medium">Sommaire</summary>
                <ol className="mt-3 space-y-1.5 text-sm">
                  {sections.map((s, i) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`} className="text-muted hover:text-fg">
                        {i + 1}. {s.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </details>

              {sections.map((s, i) => (
                <section key={s.id} id={s.id} className="mt-10 scroll-mt-24 border-t border-border pt-8">
                  <h2 className="flex items-baseline gap-3 text-xl font-semibold tracking-tight">
                    <span className="text-sm font-medium tabular-nums text-accent">{String(i + 1).padStart(2, "0")}</span>
                    {s.title}
                  </h2>
                  <div className="legal-prose mt-1">{s.body}</div>
                </section>
              ))}

              <div className="mt-12 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card sm:flex-row sm:items-center print:hidden">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Mail className="size-5" />
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold">Une question sur ce document ?</p>
                  <p className="mt-0.5 text-muted [&_a]:text-accent">
                    Contactez <Contact />.
                  </p>
                </div>
                <Link href={LEGAL_PAGES[other].path} className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
                  {LEGAL_PAGES[other].title} <ArrowUpRight className="size-4" />
                </Link>
              </div>
            </article>
          </div>
        </main>

        <footer className="border-t border-border print:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>
              © {new Date().getFullYear()} <Service />. Service non affilié à TikTok, YouTube, Instagram, Twitch ni Discord.
            </p>
            <div className="flex gap-4">
              <Link href={LEGAL_PAGES.terms.path} className="hover:text-fg">
                Conditions d&apos;utilisation
              </Link>
              <Link href={LEGAL_PAGES.privacy.path} className="hover:text-fg">
                Confidentialité
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </LegalContext.Provider>
  );
}
