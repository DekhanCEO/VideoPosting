import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsView } from "@/components/settings-view";

export const metadata: Metadata = { title: "Paramètres" };

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsView />
    </Suspense>
  );
}
