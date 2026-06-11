"use client";

import { Crown, Play, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { PlayerAvatar } from "@/components/game/player-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLAYABLE_LETTERS } from "@/lib/game/constants";
import { chooseRoundLetter } from "@/lib/game/storage";
import type { PlayerSession, Room } from "@/lib/game/types";
import { useLanguage } from "@/lib/i18n/language-provider";
import styles from "./game.module.css";

export function LetterSelectionRoom({
  room,
  session,
}: {
  room: Room;
  session: PlayerSession;
}) {
  const { errorMessage, t } = useLanguage();
  const round = room.round!;
  const commander = room.players.find(
    (player) => player.id === round.commanderId,
  )!;
  const isCommander = commander.id === session.id;
  const usedLetters = new Set(room.history.map((item) => item.letter));
  const onlinePlayers = room.players.filter((player) => player.isOnline).length;

  async function selectLetter(letter: string) {
    if (!isCommander || usedLetters.has(letter)) return;
    try {
      await chooseRoundLetter(room.code, letter);
      toast.success(t("letter.chosen", { letter }));
    } catch (error) {
      toast.error(t("letter.chooseFailed"), {
        description: errorMessage(error),
      });
    }
  }

  return (
    <main className={styles.commanderPage}>
      <header className={styles.roundHeader}>
        <Logo light />
        <div className={styles.roundRoomCode}>
          <span>{t("common.room")}</span>
          <strong>{room.code}</strong>
        </div>
        <div className={styles.roundPlayers}>
          <UsersRound />
          {t("letter.onlineRound", {
            online: onlinePlayers,
            round: round.number,
            total: room.settings.roundsToPlay,
          })}
        </div>
      </header>

      <section className={styles.commanderHero}>
        <Badge className={styles.roundBadge}>{t("letter.chooseBadge")}</Badge>
        <span className={styles.commanderKicker}>{t("letter.commander")}</span>
        <PlayerAvatar
          avatarId={commander.avatarId}
          className={styles.commanderAvatar}
          color={commander.color}
        />
        <h1>
          {isCommander
            ? t("letter.yourCommand")
            : t("letter.otherCommand", { name: commander.name })}
        </h1>
        <p>
          {isCommander
            ? t("letter.yourBody")
            : t("letter.otherBody", { name: commander.name })}
        </p>
      </section>

      <section className={styles.letterPicker}>
        <div className={styles.letterPickerHeader}>
          <div>
            <span className={styles.eyebrow}>{t("letter.available")}</span>
            <strong>
              {t("letter.remaining", {
                count: PLAYABLE_LETTERS.length - usedLetters.size,
              })}
            </strong>
          </div>
          <div className={styles.commanderRule}>
            <Crown />
            {t("letter.eachCommands")}
          </div>
        </div>

        <div className={styles.letterGrid}>
          {PLAYABLE_LETTERS.map((letter) => {
            const used = usedLetters.has(letter);

            return (
              <Button
                className={`${styles.letterChoice} ${
                  used ? styles.letterChoiceUsed : ""
                }`}
                disabled={!isCommander || used}
                onClick={() => selectLetter(letter)}
                type="button"
                variant="outline"
                key={letter}
              >
                {letter}
                <small>
                  {used
                    ? t("letter.used")
                    : isCommander
                      ? t("letter.choose")
                      : t("letter.free")}
                </small>
              </Button>
            );
          })}
        </div>

        <div className={styles.commanderNotice}>
          <Play />
          {isCommander
            ? t("letter.yourNotice")
            : t("letter.otherNotice")}
        </div>
      </section>
    </main>
  );
}
