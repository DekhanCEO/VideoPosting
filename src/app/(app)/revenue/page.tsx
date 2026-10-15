import type { Metadata } from "next";
import { RevenueView } from "@/components/revenue-view";

export const metadata: Metadata = { title: "Revenus" };

export default function RevenuePage() {
  return <RevenueView />;
}
