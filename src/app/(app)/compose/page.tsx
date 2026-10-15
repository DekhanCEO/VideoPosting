"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Composer } from "@/components/composer/composer";

function ComposeFromParams() {
  const params = useSearchParams();
  const id = params.get("id") ?? undefined;
  const date = params.get("date");
  const presetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
  return <Composer key={id ?? `new-${presetDate ?? ""}`} postId={id} presetDate={presetDate} />;
}

export default function ComposePage() {
  return (
    <Suspense>
      <ComposeFromParams />
    </Suspense>
  );
}
