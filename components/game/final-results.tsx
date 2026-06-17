"use client";

import Link from "next/link";
import { Crown, Home, RotateCcw, Trophy } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { PlayerAvatar } from "@/components/game/player-avatar";
import { Button } from "@/components/ui/button";
import { getPlayerTotal } from "@/lib/game/scoring";
import { startRematch } from "@/lib/game/storage";
import type { PlayerSession, Room } from "@/lib/game/types";
import { useLanguage } from "@/lib/i18n/language-provider";
import { FinalShareCard } from "./final-share-card";
import styles from "./game.module.css";

export function FinalResults({
  room,
  session,
}: {
  room: Room;
  session: PlayerSession;
}) {
  const { errorMessage, t } = useLanguage();
  const isHost = room.hostId === session.id;
  const ranking = [...room.players]
    .map((player) => ({
      ...player,
      total: getPlayerTotal(room.history, player.id),
    }))
    .sort((a, b) => b.total - a.total);
  const winner = ranking[0];

  async function playRematch() {
    if (!isHost) return;
    try {
      await startRematch(room.code);
      toast.success(t("final.rematchReady"));
    } catch (error) {
      toast.error(t("final.rematchFailed"), {
        description: errorMessage(error),
      });
    }
  }

  return (
    <main className={styles.finalPage}>
      <header className={styles.finalHeader}>
        <Logo light />
        <span>
          {t("common.room")} {room.code}
        </span>
      </header>

      <section className={styles.finalHero}>
        <div className={styles.finalTrophy}>
          <Crown />
          <Trophy />
        </div>
        <span className={styles.finalKicker}>{t("final.gameOver")}</span>
        <h1>
          {winner.name}
          <span>{t("final.winner")}</span>
        </h1>
        <p>{t("final.body", { count: room.settings.roundsToPlay })}</p>
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
            <PlayerAvatar
              avatarId={player.avatarId}
              className={styles.finalAvatar}
              color={player.color}
            />
            <div>
              <strong>
                {player.name}
                {player.id === session.id ? ` (${t("common.you")})` : ""}
              </strong>
              <span>
                {index === 0 ? t("final.champion") : t("final.ranking")}
              </span>
            </div>
            <b>{player.total}</b>
          </article>
        ))}
      </section>

      <FinalShareCard
        ranking={ranking}
        roomCode={room.code}
        winner={winner}
      />

      <div className={styles.finalActions}>
        {isHost ? (
          <Button className={styles.startButton} onClick={playRematch}>
            <RotateCcw />
            {t("final.rematch")}
          </Button>
        ) : (
          <div className={styles.waitingHost}>
            <span />
            {t("final.hostDecides")}
          </div>
        )}
        <Button asChild variant="outline">
          <Link href="/">
            <Home />
            {t("common.home")}
          </Link>
        </Button>
      </div>
    </main>
  );
}
