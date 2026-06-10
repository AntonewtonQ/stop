"use client";

import {
  ArrowRight,
  Flag,
  Scale,
  Trophy,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { AnswerChallengeCard } from "@/components/game/answer-challenge-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  castAnswerVote,
  finishGame,
  prepareNextRound,
} from "@/lib/game/storage";
import { getPlayerTotal } from "@/lib/game/scoring";
import type {
  AnswerScoreStatus,
  PlayerSession,
  Room,
} from "@/lib/game/types";
import styles from "./game.module.css";

const scoreLabels: Record<AnswerScoreStatus, string> = {
  invalid: "Inválida",
  doubtful: "Duvidosa",
  duplicate: "Repetida",
  correct: "Correcta",
  unique: "Única",
};

export function ResultsRoom({
  room,
  session,
}: {
  room: Room;
  session: PlayerSession;
}) {
  const round = room.round!;
  const result = round.result!;
  const isLastRound = round.number >= room.settings.roundsToPlay;
  const nextCommanderId = room.commanderOrder[round.number];
  const controllerId = isLastRound ? round.commanderId : nextCommanderId;
  const isController = controllerId === session.id;
  const nextCommander = room.players.find(
    (player) => player.id === nextCommanderId,
  );
  const challenges = Object.values(result.challenges);
  const onlinePlayers = room.players.filter((player) => player.isOnline).length;
  const pendingChallenges = challenges.filter(
    (challenge) => challenge.status === "pending",
  );
  const stoppedBy = room.players.find((player) => player.id === result.stoppedBy);
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
      toast.warning("A votação ainda não terminou.");
      return;
    }

    if (isLastRound) {
      try {
        await finishGame(room.code);
        toast.success("Fim de jogo!");
      } catch (error) {
        toast.error("Não conseguimos terminar a partida.", {
          description: error instanceof Error ? error.message : undefined,
        });
      }
      return;
    }

    try {
      await prepareNextRound(room.code);
      toast.success("O comando é teu. Escolhe a letra!");
    } catch (error) {
      toast.error("Não conseguimos preparar a próxima rodada.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function vote(challengeId: string, choice: "approve" | "reject") {
    try {
      await castAnswerVote(room.code, challengeId, choice);
      toast.success(
        choice === "approve"
          ? "Votaste para aceitar."
          : "Votaste para rejeitar.",
      );
    } catch (error) {
      toast.error("Não conseguimos registar o voto.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <main className={styles.resultsPage}>
      <header className={styles.resultsHeader}>
        <Logo />
        <div className={styles.roomIdentity}>
          <span>Sala</span>
          <strong>{room.code}</strong>
        </div>
        <div className={styles.resultsRoundLabel}>
          {onlinePlayers} online · Rodada {round.number} de{" "}
          {room.settings.roundsToPlay}
        </div>
      </header>

      <section className={styles.resultsHero}>
        <div>
          <span className={styles.eyebrow}>Fim da rodada</span>
          <h1>
            Palavras na mesa.
            <span>Pontos a contar.</span>
          </h1>
          <p>
            {stoppedBy
              ? `${stoppedBy.name} gritou STOP primeiro.`
              : "O relógio chegou ao fim."}
          </p>
        </div>

        <aside className={styles.roundWinner}>
          {result.votingComplete ? <Trophy /> : <Scale />}
          <span>
            {result.votingComplete ? "Melhor da rodada" : "Pontuação provisória"}
          </span>
          <strong>
            {result.votingComplete
              ? roundWinner?.name
              : `${pendingChallenges.length} por validar`}
          </strong>
          <b>
            {result.votingComplete
              ? `+${roundWinner?.roundScore ?? 0} pontos`
              : "A sala decide"}
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
                  <span>{category}</span>
                  <small>Letra {round.letter}</small>
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
                        <Avatar className={styles.resultAvatar}>
                          <AvatarFallback style={{ background: player.color }}>
                            {player.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <strong>{player.name}</strong>
                          <span>{score?.answer || "Sem resposta"}</span>
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
          <div className={styles.panelTitle}>
            <UsersRound />
            <div>
              <span>Classificação geral</span>
              <strong>Após {round.number} rodada{round.number === 1 ? "" : "s"}</strong>
            </div>
          </div>

          <div className={styles.rankingList}>
            {ranking.map((player, index) => (
              <div className={styles.rankingRow} key={player.id}>
                <span className={styles.rankingPosition}>{index + 1}</span>
                <div>
                  <strong>
                    {player.name}
                    {player.id === session.id ? " (tu)" : ""}
                  </strong>
                  <span>+{player.roundScore} nesta rodada</span>
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
                ? `${pendingChallenges.length} votação${
                    pendingChallenges.length === 1
                      ? " por concluir"
                      : "ões por concluir"
                  }`
                : isLastRound
                  ? "Ver classificação final"
                  : "Escolher letra da próxima rodada"}
            </Button>
          ) : (
            <div className={styles.waitingHost}>
              <span />
              {result.votingComplete
                ? isLastRound
                  ? "O comandante está a fechar a partida..."
                  : nextCommander
                    ? `${nextCommander.name} escolhe a próxima letra...`
                    : "O próximo comandante escolhe a letra..."
                : "A votação está a decorrer..."}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
