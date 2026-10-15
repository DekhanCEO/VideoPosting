import type { Metadata } from "next";
import { TermsOfService } from "@/components/legal/terms";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: "Conditions d'utilisation du service de publication de vidéos et de photos sur TikTok, YouTube et Instagram.",
};

export default function TermsPage() {
  return <TermsOfService />;
}
