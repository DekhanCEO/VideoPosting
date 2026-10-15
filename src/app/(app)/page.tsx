import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard-view";

export const metadata: Metadata = { title: "Tableau de bord" };

export default function HomePage() {
  return <DashboardView />;
}
