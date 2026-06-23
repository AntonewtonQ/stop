import type { Metadata } from "next";
import Link from "next/link";
import { Medal, Trophy, Users } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import type { WeeklyRankingSnapshot } from "@/lib/admin/types";
import { recordServerError } from "@/lib/server/admin-events";
import { getWeeklyRanking } from "@/lib/server/room-repository";
import styles from "./ranking.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ranking semanal | jogastop",
  description:
    "Ranking semanal do jogastop com top jogadores por pontos, vitórias e partidas concluídas.",
  alternates: {
    canonical: "/ranking",
  },
};

async function loadRanking() {
  try {
    return await getWeeklyRanking();
  } catch (error) {
    recordServerError("ranking.page", error);
    console.error(error);
    return null;
  }
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("pt-AO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function RankingList({ snapshot }: { snapshot: WeeklyRankingSnapshot }) {
  if (snapshot.ranking.length === 0) {
    return (
      <div className={styles.empty}>
        <Trophy aria-hidden="true" />
        <h2>Ainda não há campeões esta semana.</h2>
        <p>Conclui uma partida e volta aqui para ver o teu nome subir.</p>
      </div>
    );
  }

  return (
    <ol className={styles.ranking}>
      {snapshot.ranking.map((player, index) => (
        <li className={index === 0 ? styles.champion : ""} key={player.name}>
          <span className={styles.position}>{index + 1}</span>
          <div className={styles.player}>
            <strong>{player.name}</strong>
            <small>
              {player.wins} vitória(s) · {player.gamesCompleted} partida(s) ·{" "}
              {player.roundsPlayed} rodada(s)
            </small>
          </div>
          <b>{player.points}</b>
        </li>
      ))}
    </ol>
  );
}

export default async function RankingPage() {
  const snapshot = await loadRanking();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label="Voltar ao jogastop">
          <Logo />
        </Link>
        <Button asChild className={styles.playButton}>
          <Link href="/#jogar">Criar sala</Link>
        </Button>
      </header>

      <section className={styles.hero}>
        <span className={styles.eyebrow}>
          <Medal aria-hidden="true" />
          Ranking semanal
        </span>
        <h1>Quem marcou grande esta semana?</h1>
        <p>
          Top jogadores por pontos, vitórias e partidas concluídas nos últimos
          7 dias. Sem login por enquanto: nomes iguais entram juntos no ranking.
        </p>
      </section>

      {snapshot ? (
        <>
          <section className={styles.meta}>
            <article>
              <Trophy aria-hidden="true" />
              <span>Período</span>
              <strong>
                {formatDate(snapshot.since)} até {formatDate(snapshot.generatedAt)}
              </strong>
            </article>
            <article>
              <Users aria-hidden="true" />
              <span>Jogadores no top</span>
              <strong>{snapshot.ranking.length}</strong>
            </article>
          </section>

          <RankingList snapshot={snapshot} />
        </>
      ) : (
        <div className={styles.empty}>
          <Trophy aria-hidden="true" />
          <h2>Ranking temporariamente indisponível.</h2>
          <p>Estamos a sincronizar os dados. Tenta novamente daqui a pouco.</p>
        </div>
      )}
    </main>
  );
}
