import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountsView } from "@/components/accounts-view";

export const metadata: Metadata = { title: "Comptes" };

export default function AccountsPage() {
  return (
    <Suspense>
      <AccountsView />
    </Suspense>
  );
}
