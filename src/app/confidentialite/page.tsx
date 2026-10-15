import type { Metadata } from "next";
import { PrivacyPolicy } from "@/components/legal/privacy";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Données utilisées par le service, partage avec TikTok, YouTube, Instagram, Twitch et Discord, droits et suppression des données.",
};

export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
