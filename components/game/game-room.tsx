"use client";

import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { normalizeRoomCode } from "@/lib/game/storage";
import { useRoom } from "@/lib/game/use-room";
import { JoinRoomGate } from "./join-room-gate";
import { FinalResults } from "./final-results";
import { LetterSelectionRoom } from "./letter-selection-room";
import { LobbyRoom } from "./lobby-room";
import { ResultsRoom } from "./results-room";
import { RoundRoom } from "./round-room";
import styles from "./game.module.css";

export function GameRoom({ code }: { code: string }) {
  const normalizedCode = normalizeRoomCode(code);
  const { room, session, isLoading, refresh } = useRoom(normalizedCode);

  if (isLoading) {
    return (
      <main className={styles.gamePage}>
        <div className={styles.loadingCard}>
          <span />
          <p>A preparar a sala...</p>
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className={styles.gamePage}>
        <div className={styles.centeredCard}>
          <Logo />
          <div className={styles.emptyIcon}>
            <RotateCcw />
          </div>
          <span className={styles.eyebrow}>Sala {normalizedCode}</span>
          <h1>Não encontramos esta sala.</h1>
          <p>Confirma o código ou cria uma nova para continuar.</p>
          <Button asChild className={styles.primaryButton}>
            <Link href="/">
              <ArrowLeft />
              Voltar ao início
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  const belongsToRoom = session
    ? room.players.some((player) => player.id === session.id)
    : false;

  if (!session || !belongsToRoom) {
    return <JoinRoomGate room={room} onJoined={refresh} />;
  }

  if (room.status === "round" && room.round) {
    return <RoundRoom key={room.round.number} room={room} session={session} />;
  }

  if (room.status === "letter-selection" && room.round) {
    return <LetterSelectionRoom room={room} session={session} />;
  }

  if (room.status === "results" && room.round?.result) {
    return <ResultsRoom room={room} session={session} />;
  }

  if (room.status === "finished") {
    return <FinalResults room={room} session={session} />;
  }

  return <LobbyRoom room={room} session={session} />;
}
