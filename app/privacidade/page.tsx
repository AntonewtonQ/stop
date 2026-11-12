import type { Metadata } from "next";

import { PrivacyPolicy } from "@/components/privacy/privacy-policy";

export const metadata: Metadata = {
  title: "Política de Privacidade | jogastop",
  description:
    "Privacidade do jogastop no site, PWA e app Android/iOS: dados de jogo, ranking, retenção, contacto dos responsáveis e publicidade apenas no web.",
  alternates: { canonical: "/privacidade" },
};

export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
