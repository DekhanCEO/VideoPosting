"use client";

import { useMemo, useState } from "react";
import { Clapperboard, Plus, Search } from "lucide-react";
import { usePosts } from "@/lib/hooks";
import type { PostStatus } from "@/lib/types";
import { PageContainer, PageHeader } from "../app-shell";
import { ButtonLink, EmptyState, Input, Skeleton } from "../ui";
import { PostRow, postTitle } from "./post-bits";
import { cn } from "@/lib/utils";

const FILTERS: { value: "all" | PostStatus | "issues"; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "draft", label: "Brouillons" },
  { value: "scheduled", label: "Programmées" },
  { value: "publishing", label: "En cours" },
  { value: "published", label: "Publiées" },
  { value: "issues", label: "Échecs" },
];

export function PostsList() {
  const { data: posts, isLoading, mutate } = usePosts();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: posts?.length ?? 0 };
    for (const p of posts ?? []) {
      const key = p.status === "failed" || p.status === "partial" ? "issues" : p.status;
      c[key] = (c[key] ?? 0) + 1;
    }
    return c;
  }, [posts]);

  const visible = (posts ?? []).filter((p) => {
    if (filter === "issues" && p.status !== "failed" && p.status !== "partial") return false;
    if (filter !== "all" && filter !== "issues" && p.status !== filter) return false;
    if (query && !postTitle(p).toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <PageContainer>
      <PageHeader
        title="Publications"
        description="Brouillons, publications programmées et historique de vos envois."
        actions={
          <ButtonLink href="/compose" variant="primary">
            <Plus className="size-4" /> Nouvelle publication
          </ButtonLink>
        }
      />
      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface-2 p-1 scrollbar-thin">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f.value ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg",
              )}
            >
              {f.label}
              {(counts[f.value] ?? 0) > 0 && (
                <span className={cn("rounded-md px-1.5 text-xs tabular-nums", filter === f.value ? "bg-accent-soft text-accent" : "bg-surface-3")}>{counts[f.value]}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative md:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher par titre…" className="pl-9" />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        {!isLoading && visible.map((p) => <PostRow key={p.id} post={p} onChange={() => mutate()} />)}
        {!isLoading && visible.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface">
            <EmptyState
              icon={<Clapperboard className="size-6" />}
              title={posts?.length ? "Aucune publication ici" : "Aucune publication pour l'instant"}
              description={posts?.length ? "Essayez un autre filtre ou une autre recherche." : "Ajoutez une vidéo et publiez-la sur TikTok, YouTube et Instagram en une seule fois."}
              action={
                !posts?.length && (
                  <ButtonLink href="/compose" variant="primary">
                    <Plus className="size-4" /> Créer ma première publication
                  </ButtonLink>
                )
              }
            />
          </div>
        )}
      </div>
    </PageContainer>
  );
}
