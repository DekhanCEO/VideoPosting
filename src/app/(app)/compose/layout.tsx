import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nouvelle publication" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
