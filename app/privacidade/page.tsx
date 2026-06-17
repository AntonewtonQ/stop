import type { Metadata } from "next";

import { PrivacyPolicy } from "@/components/privacy/privacy-policy";

export const metadata: Metadata = {
  title: "Privacidade e consentimento | jogastop",
  description:
    "Saiba como o jogastop utiliza dados de jogo, armazenamento local, cookies, publicidade e consentimento.",
};

export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
