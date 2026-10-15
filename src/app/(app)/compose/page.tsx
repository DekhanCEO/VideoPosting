import type { Metadata } from "next";
import { Composer } from "@/components/composer/composer";

export const metadata: Metadata = { title: "Nouvelle publication" };

export default async function ComposePage({ searchParams }: { searchParams: Promise<{ id?: string; date?: string }> }) {
  const { id, date } = await searchParams;
  const presetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
  return <Composer key={id ?? `new-${presetDate ?? ""}`} postId={id} presetDate={presetDate} />;
}
