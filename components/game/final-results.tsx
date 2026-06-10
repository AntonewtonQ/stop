"use client";

import Link from "next/link";
import { Crown, Home, RotateCcw, Trophy } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getPlayerTotal } from "@/lib/game/scoring";
import { restartGame } from "@/lib/game/storage";
import type { PlayerSession, Room } from "@/lib/game/types";
import styles from "./game.module.css";

export function FinalResults({
  room,
  session,
}: {
  room: Room;
  session: PlayerSession;
}) {
  const isHost = room.hostId === session.id;
  const ranking = [...room.players]
    .map((player) => ({
      ...player,
      total: getPlayerTotal(room.history, player.id),
    }))
    .sort((a, b) => b.total - a.total);
  const winner = ranking[0];

  async function playAgain() {
    if (!isHost) return;
    try {
      await restartGame(room.code);
      toast.success("Nova partida pronta!");
    } catch (error) {
      toast.error("Não conseguimos preparar a nova partida.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <main className={styles.finalPage}>
      <header className={styles.finalHeader}>
        <Logo light />
        <span>Sala {room.code}</span>
      </header>

      <section className={styles.finalHero}>
        <div className={styles.finalTrophy}>
          <Crown />
          <Trophy />
        </div>
        <span className={styles.finalKicker}>Fim de jogo</span>
        <h1>
          {winner.name}
          <span>marcou grande.</span>
        </h1>
        <p>
          {room.settings.roundsToPlay} rodadas depois, esta é a classificação
          final.
        </p>
      </section>

      <section className={styles.finalRanking}>
        {ranking.map((player, index) => (
          <article
            className={`${styles.finalPlayer} ${
              index === 0 ? styles.finalPlayerWinner : ""
            }`}
            key={player.id}
          >
            <span className={styles.finalPosition}>{index + 1}</span>
            <Avatar className={styles.finalAvatar}>
              <AvatarFallback style={{ background: player.color }}>
                {player.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <strong>
                {player.name}
                {player.id === session.id ? " (tu)" : ""}
              </strong>
              <span>{index === 0 ? "Campeão da partida" : "Classificação final"}</span>
            </div>
            <b>{player.total}</b>
          </article>
        ))}
      </section>

      <div className={styles.finalActions}>
        {isHost ? (
          <Button className={styles.startButton} onClick={playAgain}>
            <RotateCcw />
            Jogar novamente
          </Button>
        ) : (
          <div className={styles.waitingHost}>
            <span />
            O anfitrião decide a próxima partida...
          </div>
        )}
        <Button asChild variant="outline">
          <Link href="/">
            <Home />
            Voltar ao início
          </Link>
        </Button>
      </div>
    </main>
  );
}
