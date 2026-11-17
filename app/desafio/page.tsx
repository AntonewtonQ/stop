import type { Metadata } from "next";

import { DailyChallenge } from "@/components/daily/daily-challenge";

export const metadata: Metadata = {
  title: "Desafio do dia: a mesma letra para todos",
  description:
    "Joga o desafio diário do jogastop: uma letra, cinco categorias e 60 segundos. Toda a gente joga o mesmo, só tens uma tentativa e há ranking do dia.",
  alternates: { canonical: "/desafio" },
};

export default function DailyChallengePage() {
  return <DailyChallenge />;
}
