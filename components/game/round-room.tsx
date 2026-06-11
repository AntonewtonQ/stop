"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Send, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { finishRound, saveRoundAnswers } from "@/lib/game/storage";
import type { PlayerSession, Room, RoundAnswers } from "@/lib/game/types";
import { useLanguage } from "@/lib/i18n/language-provider";
import styles from "./game.module.css";

export function RoundRoom({
  room,
  session,
}: {
  room: Room;
  session: PlayerSession;
}) {
  const { category: categoryLabel, errorMessage, t } = useLanguage();
  const round = room.round!;
  const commander = room.players.find(
    (player) => player.id === round.commanderId,
  )!;
  const onlinePlayers = room.players.filter((player) => player.isOnline).length;
  const [answers, setAnswers] = useState<RoundAnswers>(
    round.answers[session.id] ?? {},
  );
  const [now, setNow] = useState(round.startedAt);
  const [isStopping, setIsStopping] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);

  const remaining = Math.max(
    0,
    round.duration - Math.floor((now - round.startedAt) / 1000),
  );
  const progress = (remaining / round.duration) * 100;
  const answeredCount = useMemo(
    () => Object.values(answers).filter((answer) => answer.trim()).length,
    [answers],
  );
  const canStop = room.settings.categories.every((category) =>
    answers[category]?.trim(),
  );

  useEffect(() => {
    if (remaining === 0) {
      void finishRound(room.code, true).catch(() => {
        // Another client may have already ended the round.
      });
    }
  }, [remaining, room.code]);

  function updateAnswer(category: string, answer: string) {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [category]: answer,
    }));
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void saveRoundAnswers(room.code, answers).catch(() => {
        // The final answers are sent atomically when the player presses STOP.
      });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [answers, room.code]);

  async function submitAnswers() {
    if (!canStop || isStopping) return;
    setIsStopping(true);

    try {
      await finishRound(room.code, false, answers);
      toast.success("STOP!", {
        description: t("round.stopDescription", {
          answered: answeredCount,
          total: room.settings.categories.length,
        }),
      });
    } catch (error) {
      setIsStopping(false);
      toast.error(t("round.finishFailed"), {
        description: errorMessage(error),
      });
    }
  }

  return (
    <main className={styles.roundPage}>
      <header className={styles.roundHeader}>
        <Logo light />
        <div className={styles.roundRoomCode}>
          <span>{t("common.room")}</span>
          <strong>{room.code}</strong>
        </div>
        <div className={styles.roundPlayers}>
          <UsersRound />
          {t("round.onlinePlayers", {
            online: onlinePlayers,
            total: room.players.length,
          })}
        </div>
      </header>

      <section className={styles.roundHero}>
        <div>
          <Badge className={styles.roundBadge}>
            {t("common.round")} {round.number}
          </Badge>
          <span className={styles.roundKicker}>
            {t("round.chosenBy", { name: commander.name })}
          </span>
          <strong className={styles.roundLetter}>{round.letter}</strong>
        </div>
        <div className={`${styles.roundTimer} ${remaining <= 10 ? styles.timerDanger : ""}`}>
          <Clock3 />
          <span>{t("round.timeLeft")}</span>
          <strong>00:{remaining.toString().padStart(2, "0")}</strong>
        </div>
      </section>

      <Progress value={progress} className={styles.roundProgress} />

      <section className={styles.answerBoard}>
        <div className={styles.answerBoardHeader}>
          <div>
            <span className={styles.eyebrow}>
              {t("round.yourTurn", { name: session.name })}
            </span>
            <h1>{t("round.title")}</h1>
          </div>
          <div className={styles.answerCounter}>
            <strong>{answeredCount}</strong>
            <span>
              {t("round.answerCount", {
                total: room.settings.categories.length,
              })}
            </span>
          </div>
        </div>

        <div className={styles.roundAnswers}>
          {room.settings.categories.map((category, index) => {
            const answer = answers[category] ?? "";
            const startsCorrectly =
              answer.trim().length > 0 &&
              answer.trim().charAt(0).toUpperCase() === round.letter;

            return (
              <label className={styles.roundAnswer} key={category}>
                <span className={styles.answerNumber}>
                  {(index + 1).toString().padStart(2, "0")}
                </span>
                <div>
                  <strong>{categoryLabel(category)}</strong>
                  <small>
                    {answer && !startsCorrectly
                      ? t("round.mustStart", { letter: round.letter })
                      : t("round.answerWith", { letter: round.letter })}
                  </small>
                </div>
                <Input
                  value={answer}
                  onChange={(event) => updateAnswer(category, event.target.value)}
                  placeholder={`${round.letter}...`}
                  autoFocus={index === 0}
                />
                {startsCorrectly && <CheckCircle2 className={styles.validAnswer} />}
              </label>
            );
          })}
        </div>

        <Button
          className={styles.stopRoundButton}
          disabled={!canStop || isStopping}
          onClick={submitAnswers}
        >
          <Send />
          {isStopping
            ? t("round.stopping")
            : canStop
              ? t("round.stop")
              : t("round.completeToStop")}
        </Button>
        <div className={styles.commanderClockNotice}>
          <Clock3 />
          {t("round.firstStops")}
        </div>
      </section>
    </main>
  );
}
