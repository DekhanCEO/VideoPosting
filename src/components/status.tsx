"use client";

import { AlertTriangle, CalendarClock, CheckCircle2, CircleDashed, FileEdit, Loader2, Ban, XCircle } from "lucide-react";
import type { PostStatus, PublicationStatus } from "@/lib/types";
import { Badge } from "./ui";

export const POST_STATUS: Record<PostStatus, { label: string; tone: "neutral" | "accent" | "success" | "warning" | "danger" | "info"; icon: typeof CheckCircle2 }> = {
  draft: { label: "Brouillon", tone: "neutral", icon: FileEdit },
  scheduled: { label: "Programmée", tone: "info", icon: CalendarClock },
  publishing: { label: "En cours", tone: "accent", icon: Loader2 },
  published: { label: "Publiée", tone: "success", icon: CheckCircle2 },
  partial: { label: "Partielle", tone: "warning", icon: AlertTriangle },
  failed: { label: "Échec", tone: "danger", icon: XCircle },
};

export function PostStatusBadge({ status }: { status: PostStatus }) {
  const s = POST_STATUS[status];
  const Icon = s.icon;
  return (
    <Badge tone={s.tone}>
      <Icon className={`size-3.5 ${status === "publishing" ? "animate-spin" : ""}`} />
      {s.label}
    </Badge>
  );
}

export const PUB_STATUS: Record<PublicationStatus, { label: string; tone: "neutral" | "accent" | "success" | "warning" | "danger"; icon: typeof CheckCircle2 }> = {
  pending: { label: "En attente", tone: "neutral", icon: CircleDashed },
  uploading: { label: "Envoi", tone: "accent", icon: Loader2 },
  processing: { label: "Traitement", tone: "accent", icon: Loader2 },
  published: { label: "Publiée", tone: "success", icon: CheckCircle2 },
  failed: { label: "Échec", tone: "danger", icon: XCircle },
  canceled: { label: "Annulée", tone: "warning", icon: Ban },
};

export function PublicationStatusBadge({ status }: { status: PublicationStatus }) {
  const s = PUB_STATUS[status];
  const Icon = s.icon;
  return (
    <Badge tone={s.tone}>
      <Icon className={`size-3.5 ${status === "uploading" || status === "processing" ? "animate-spin" : ""}`} />
      {s.label}
    </Badge>
  );
}
