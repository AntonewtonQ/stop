"use client";

import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { normalizeRoomCode } from "@/lib/game/storage";
import { useGameSounds } from "@/lib/game/use-game-sounds";
import { useRoom } from "@/lib/game/use-room";
import { useLanguage } from "@/lib/i18n/language-provider";
import { ConnectionNotice } from "./connection-notice";
import { GameLoading } from "./game-loading";
import { JoinRoomGate } from "./join-room-gate";
import { FinalResults } from "./final-results";
import { LetterSelectionRoom } from "./letter-selection-room";
import { LobbyRoom } from "./lobby-room";
import { ResultsRoom } from "./results-room";
import { RoundRoom } from "./round-room";
import { SoundToggle } from "./sound-toggle";
import styles from "./game.module.css";

export function GameRoom({ code }: { code: string }) {
  const { t } = useLanguage();
  const normalizedCode = normalizeRoomCode(code);
  const {
    room,
    session,
    isLoading,
    connectionStatus,
    reconnect,
    refresh,
  } = useRoom(normalizedCode);
  useGameSounds(room);

  function renderRoom() {
    if (isLoading) {
      return (
        <GameLoading
          detail={`${t("landing.heroTitle")} ${t("landing.heroTitleAccent")}`}
          message={t("common.loadingRoom")}
        />
      );
    }

    if (!room && connectionStatus !== "connected") {
      return (
        <GameLoading
          detail={`${t("landing.heroTitle")} ${t("landing.heroTitleAccent")}`}
          message={t("connection.reconnectingTitle")}
        />
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
            <span className={styles.eyebrow}>
              {t("common.room")} {normalizedCode}
            </span>
            <h1>{t("game.roomNotFoundTitle")}</h1>
            <p>{t("game.roomNotFoundBody")}</p>
            <Button asChild className={styles.primaryButton}>
              <Link href="/">
                <ArrowLeft />
                {t("common.home")}
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

  return (
    <>
      <ConnectionNotice status={connectionStatus} onRetry={reconnect} />
      <SoundToggle />
      {renderRoom()}
    </>
  );
}
