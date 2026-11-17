"use client";

import {
  ArrowRight,
  CheckCircle2,
  Flag,
  Scale,
  Trophy,
  UsersRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { AnswerChallengeCard } from "@/components/game/answer-challenge-card";
import { BestAnswers } from "@/components/game/best-answers";
import { ReactionBar } from "@/components/game/reaction-bar";
import { PlayerAvatar } from "@/components/game/player-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  castAnswerVote,
  finishGame,
  prepareNextRound,
} from "@/lib/game/storage";
import { AUTO_ADVANCE_SECONDS } from "@/lib/game/constants";
import { getCommanderForRound } from "@/lib/game/engine";
import { getPlayerTotal } from "@/lib/game/scoring";
import type {
  AnswerScoreStatus,
  PlayerSession,
  Room,
} from "@/lib/game/types";
import { useLanguage } from "@/lib/i18n/language-provider";
import styles from "./game.module.css";

export function ResultsRoom({
  room,
  session,
}: {
  room: Room;
  session: PlayerSession;
}) {
  const { category: categoryLabel, errorMessage, t } = useLanguage();
  const scoreLabels: Record<AnswerScoreStatus, string> = {
    invalid: t("results.invalid"),
    doubtful: t("results.doubtful"),
    duplicate: t("results.duplicate"),
    correct: t("results.correct"),
    unique: t("results.unique"),
  };
  const round = room.round!;
  const result = round.result!;
  const isLastRound = round.number >= room.settings.roundsToPlay;
  const nextCommanderId = getCommanderForRound(room, round.number + 1);
  const isController = isLastRound || nextCommanderId === session.id;
  const nextCommander = room.players.find(
    (player) => player.id === nextCommanderId,
  );
  const challenges = Object.values(result.challenges);
  const onlinePlayers = room.players.filter((player) => player.isOnline).length;
  const pendingChallenges = challenges.filter(
    (challenge) => challenge.status === "pending",
  );
  const stoppedBy = room.players.find((player) => player.id === result.stoppedBy);
  const completedPlayers = room.players.filter((player) =>
    room.settings.categories.every((category) =>
      round.answers[player.id]?.[category]?.trim(),
    ),
  );
  const ranking = [...room.players]
    .map((player) => ({
      ...player,
      roundScore: result.players[player.id]?.total ?? 0,
      total: getPlayerTotal(room.history, player.id),
    }))
    .sort((a, b) => b.total - a.total || b.roundScore - a.roundScore);
  const roundWinner = [...ranking].sort(
    (a, b) => b.roundScore - a.roundScore || b.total - a.total,
  )[0];

  async function continueGame() {
    if (!isController) return;
    if (!result.votingComplete) {
      toast.warning(t("results.votingPending"));
      return;
    }

    if (isLastRound) {
      try {
        await finishGame(room.code);
        toast.success(t("results.gameOver"));
      } catch (error) {
        toast.error(t("results.finishFailed"), {
          description: errorMessage(error),
        });
      }
      return;
    }

    try {
      await prepareNextRound(room.code);
      toast.success(t("results.yourCommand"));
    } catch (error) {
      toast.error(t("results.nextFailed"), {
        description: errorMessage(error),
      });
    }
  }

  const autoAdvanceIn = useAutoAdvance(result.votingComplete, () => {
    if (isController) void continueGame();
  });
  const autoAdvanceLabel = result.votingComplete
    ? t(isLastRound ? "results.autoFinal" : "results.autoNext", {
        count: autoAdvanceIn,
      })
    : null;

  async function vote(challengeId: string, choice: "approve" | "reject") {
    try {
      await castAnswerVote(room.code, challengeId, choice);
      toast.success(
        choice === "approve"
          ? t("results.votedAccept")
          : t("results.votedReject"),
      );
    } catch (error) {
      toast.error(t("results.voteFailed"), {
        description: errorMessage(error),
      });
    }
  }

  return (
    <main className={styles.resultsPage}>
      <ReactionBar players={room.players} roomCode={room.code} session={session} />
      <header className={styles.resultsHeader}>
        <Logo />
        <div className={styles.roomIdentity}>
          <span>{t("common.room")}</span>
          <strong>{room.code}</strong>
        </div>
        <div className={styles.resultsRoundLabel}>
          {t("results.header", {
            online: onlinePlayers,
            round: round.number,
            total: room.settings.roundsToPlay,
          })}
        </div>
      </header>

      <section className={styles.resultsHero}>
        <div>
          <span className={styles.eyebrow}>{t("results.eyebrow")}</span>
          <h1>
            {t("results.title")}
            <span>{t("results.titleAccent")}</span>
          </h1>
          <p>
            {stoppedBy
              ? t("results.stoppedBy", { name: stoppedBy.name })
              : t("results.timedOut")}
          </p>
        </div>

        <aside className={styles.roundWinner}>
          {result.votingComplete ? <Trophy /> : <Scale />}
          <span>
            {result.votingComplete
              ? t("results.roundBest")
              : t("results.provisional")}
          </span>
          <strong>
            {result.votingComplete
              ? roundWinner?.name
              : t("results.toValidate", { count: pendingChallenges.length })}
          </strong>
          <b>
            {result.votingComplete
              ? t("results.points", { count: roundWinner?.roundScore ?? 0 })
              : t("results.roomDecides")}
          </b>
        </aside>
      </section>

      <div className={styles.resultsLayout}>
        <section className={styles.categoryResults}>
          {room.settings.categories.map((category) => {
            const categoryChallenges = challenges.filter(
              (challenge) => challenge.category === category,
            );

            return (
              <article className={styles.categoryResult} key={category}>
                <div className={styles.categoryResultHeader}>
                  <span>{categoryLabel(category)}</span>
                  <small>
                    {t("common.letter")} {round.letter}
                  </small>
                </div>

                {categoryChallenges.length > 0 && (
                  <div className={styles.challengeList}>
                    {categoryChallenges.map((challenge) => {
                      return (
                        <AnswerChallengeCard
                          challenge={challenge}
                          key={challenge.id}
                          onVote={vote}
                          players={room.players}
                          sessionId={session.id}
                        />
                      );
                    })}
                  </div>
                )}

                <div className={styles.categoryAnswers}>
                  {room.players.map((player) => {
                    const score = result.players[player.id]?.answers[category];
                    return (
                      <div className={styles.resultAnswerRow} key={player.id}>
                        <PlayerAvatar
                          avatarId={player.avatarId}
                          className={styles.resultAvatar}
                          color={player.color}
                        />
                        <div>
                          <strong>{player.name}</strong>
                          <span>{score?.answer || t("common.noAnswer")}</span>
                        </div>
                        <Badge
                          className={`${styles.answerStatus} ${
                            styles[`answerStatus${capitalize(score?.status ?? "invalid")}`]
                          }`}
                        >
                          {scoreLabels[score?.status ?? "invalid"]}
                        </Badge>
                        <b className={styles.answerPoints}>+{score?.points ?? 0}</b>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </section>

        <aside className={styles.rankingPanel}>
          <section className={styles.roundRecapPanel}>
            <span>{t("results.roundSnapshot")}</span>
            <div className={styles.roundRecapGrid}>
              <article className={styles.roundRecapCard}>
                <Flag />
                <div>
                  <small>{t("results.whoStopped")}</small>
                  <strong>
                    {stoppedBy?.name ?? t("results.timerStopped")}
                  </strong>
                </div>
              </article>
              <article className={styles.roundRecapCard}>
                <CheckCircle2 />
                <div>
                  <small>{t("results.whoCompleted")}</small>
                  {completedPlayers.length > 0 ? (
                    <div className={styles.roundRecapPlayers}>
                      {completedPlayers.map((player) => (
                        <span className={styles.roundRecapPlayer} key={player.id}>
                          <PlayerAvatar
                            avatarId={player.avatarId}
                            className={styles.roundRecapAvatar}
                            color={player.color}
                          />
                          {player.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <strong>{t("results.noCompletedPlayers")}</strong>
                  )}
                </div>
              </article>
            </div>
          </section>

          <div className={styles.panelTitle}>
            <UsersRound />
            <div>
              <span>{t("results.generalRanking")}</span>
              <strong>
                {t("results.afterRounds", { count: round.number })}
              </strong>
            </div>
          </div>

          <div className={styles.rankingList}>
            {ranking.map((player, index) => (
              <div className={styles.rankingRow} key={player.id}>
                <span className={styles.rankingPosition}>{index + 1}</span>
                <PlayerAvatar
                  avatarId={player.avatarId}
                  className={styles.rankingAvatar}
                  color={player.color}
                />
                <div>
                  <strong>
                    {player.name}
                    {player.id === session.id ? ` (${t("common.you")})` : ""}
                  </strong>
                  <span>
                    {t("results.thisRound", { count: player.roundScore })}
                  </span>
                </div>
                <b>{player.total}</b>
              </div>
            ))}
          </div>

          {isController ? (
            <Button
              className={styles.startButton}
              disabled={!result.votingComplete}
              onClick={continueGame}
            >
              {isLastRound ? <Flag /> : <ArrowRight />}
              {!result.votingComplete
                ? t("results.votesRemaining", {
                    count: pendingChallenges.length,
                  })
                : isLastRound
                  ? t("results.finalRanking")
                  : t("results.nextLetter")}
              {autoAdvanceLabel ? (
                <small className={styles.autoAdvance}>· {autoAdvanceIn}s</small>
              ) : null}
            </Button>
          ) : (
            <div className={styles.waitingHost}>
              <span />
              {result.votingComplete
                ? nextCommander
                  ? t("results.nextCommander", { name: nextCommander.name })
                  : t("results.nextCommanderFallback")
                : t("results.voting")}
              {autoAdvanceLabel ? (
                <small className={styles.autoAdvance}>{autoAdvanceLabel}</small>
              ) : null}
            </div>
          )}

          <BestAnswers
            answers={round.answers}
            categories={room.settings.categories}
            letter={round.letter}
          />
        </aside>
      </div>
    </main>
  );
}

/**
 * Counts down once voting is complete and then calls `onDone` a single time.
 * Each client keeps its own clock; only the controller acts on it.
 */
function useAutoAdvance(active: boolean, onDone: () => void) {
  const [secondsLeft, setSecondsLeft] = useState(AUTO_ADVANCE_SECONDS);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!active) return;
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      const left = Math.max(
        0,
        AUTO_ADVANCE_SECONDS - Math.floor((Date.now() - startedAt) / 1000),
      );
      setSecondsLeft(left);
      if (left === 0) {
        window.clearInterval(id);
        onDoneRef.current();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [active]);

  return secondsLeft;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
