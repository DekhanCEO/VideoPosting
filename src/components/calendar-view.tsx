"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { isoDay } from "@/lib/dates";
import { formatTime } from "@/lib/format";
import { usePosts } from "@/lib/hooks";
import type { PostWithMedia } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PageContainer, PageHeader } from "./app-shell";
import { PlatformBadge } from "./icons";
import { POST_STATUS } from "./status";
import { Button, ButtonLink, Card, Skeleton } from "./ui";
import { postHref, postTitle, Thumb } from "./posts/post-bits";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function eventTime(p: PostWithMedia): number | null {
  if (p.status === "scheduled") return p.scheduledAt ?? null;
  if (p.publishedAt) return p.publishedAt;
  if (p.status === "draft") return p.scheduledAt ?? null;
  return p.updatedAt;
}

const DOT: Record<string, string> = {
  draft: "bg-subtle",
  scheduled: "bg-sky-500",
  publishing: "bg-accent",
  published: "bg-success",
  partial: "bg-warning",
  failed: "bg-danger",
};

export function CalendarView() {
  const { data: posts, isLoading } = usePosts();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const today = isoDay();

  const byDay = useMemo(() => {
    const map = new Map<string, PostWithMedia[]>();
    for (const p of posts ?? []) {
      const t = eventTime(p);
      if (!t) continue;
      const key = isoDay(t);
      map.set(key, [...(map.get(key) ?? []), p].sort((a, b) => (eventTime(a) ?? 0) - (eventTime(b) ?? 0)));
    }
    return map;
  }, [posts]);

  const cells = useMemo(() => {
    const first = new Date(cursor);
    const offset = (first.getDay() + 6) % 7; // lundi en premier
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const upcoming = (posts ?? [])
    .filter((p) => p.status === "scheduled" && (p.scheduledAt ?? 0) >= Date.now() - 60_000)
    .sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0))
    .slice(0, 8);

  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(cursor);
  const move = (n: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));

  return (
    <PageContainer wide>
      <PageHeader
        title="Calendrier"
        description="Vue d'ensemble de vos publications programmées et passées."
        actions={
          <ButtonLink href="/compose" variant="primary">
            <Plus className="size-4" /> Programmer une vidéo
          </ButtonLink>
        }
      />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="text-lg font-semibold capitalize">{monthLabel}</h2>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
                Aujourd&apos;hui
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={() => move(-1)} aria-label="Mois précédent">
                <ChevronLeft className="size-4" />
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={() => move(1)} aria-label="Mois suivant">
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-7 border-b border-border bg-surface-2/50">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted">
                {d}
              </div>
            ))}
          </div>
          {isLoading ? (
            <Skeleton className="m-4 h-[480px]" />
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((d, i) => {
                const key = isoDay(d);
                const inMonth = d.getMonth() === cursor.getMonth();
                const items = byDay.get(key) ?? [];
                const isToday = key === today;
                const future = key >= today;
                return (
                  <div
                    key={key}
                    className={cn(
                      "group relative min-h-24 border-border p-1.5 sm:min-h-32",
                      i % 7 !== 6 && "border-r",
                      i < 35 && "border-b",
                      !inMonth && "bg-surface-2/40",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                          isToday ? "gradient-brand text-white" : inMonth ? "text-fg" : "text-subtle",
                        )}
                      >
                        {d.getDate()}
                      </span>
                      {future && (
                        <Link
                          href={`/compose?date=${key}`}
                          className="hidden size-6 items-center justify-center rounded-md text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface-2 hover:text-accent sm:flex"
                          aria-label="Programmer ce jour-là"
                        >
                          <Plus className="size-3.5" />
                        </Link>
                      )}
                    </div>
                    <div className="mt-1 space-y-1">
                      {items.slice(0, 3).map((p) => (
                        <Link
                          key={p.id}
                          href={postHref(p)}
                          className="flex items-center gap-1.5 rounded-md bg-surface-2 px-1.5 py-1 text-[11px] transition-colors hover:bg-accent-soft"
                          title={postTitle(p)}
                        >
                          <span className={cn("size-1.5 shrink-0 rounded-full", DOT[p.status])} />
                          <span className="hidden shrink-0 text-muted tabular-nums sm:inline">{formatTime(eventTime(p)!)}</span>
                          <span className="min-w-0 truncate font-medium">{postTitle(p)}</span>
                        </Link>
                      ))}
                      {items.length > 3 && <p className="px-1.5 text-[11px] text-muted">+{items.length - 3} autres</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold">À venir</h3>
            <div className="mt-4 space-y-3">
              {upcoming.length === 0 && <p className="text-sm text-muted">Aucune publication programmée.</p>}
              {upcoming.map((p) => (
                <Link key={p.id} href={postHref(p)} className="flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-surface-2">
                  <Thumb post={p} className="h-14 w-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{postTitle(p)}</p>
                    <p className="text-xs text-muted">
                      {new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(p.scheduledAt!)}
                    </p>
                    <div className="mt-1 flex gap-1">
                      {p.platforms.map((pl) => (
                        <PlatformBadge key={pl} platform={pl} size={16} />
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold">Légende</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {Object.entries(POST_STATUS).map(([k, v]) => (
                <span key={k} className="flex items-center gap-2 text-xs text-muted">
                  <span className={cn("size-2 rounded-full", DOT[k])} /> {v.label}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
