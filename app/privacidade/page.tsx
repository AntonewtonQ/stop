import type { Metadata } from "next";

import { PrivacyPolicy } from "@/components/privacy/privacy-policy";

export const metadata: Metadata = {
  title: "Privacidade e consentimento | stop.ao",
  description:
    "Saiba como o stop.ao utiliza dados de jogo, armazenamento local, cookies, publicidade e consentimento.",
};

export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
