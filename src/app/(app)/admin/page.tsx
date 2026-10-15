import type { Metadata } from "next";
import { AdminView } from "@/components/admin-view";

export const metadata: Metadata = { title: "Espaces & accès" };

export default function AdminPage() {
  return <AdminView />;
}
