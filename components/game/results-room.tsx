"use client";

import { ArrowRight, Flag, Trophy, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { finishGame, startNextRound } from "@/lib/game/storage";
import { getPlayerTotal } from "@/lib/game/scoring";
import type {
  AnswerScoreStatus,
  PlayerSession,
  Room,
} from "@/lib/game/types";
import styles from "./game.module.css";

const scoreLabels: Record<AnswerScoreStatus, string> = {
  invalid: "Inválida",
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
  const isHost = room.hostId === session.id;
  const isLastRound = round.number >= room.settings.roundsToPlay;
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

  function continueGame() {
    if (!isHost) return;

    if (isLastRound) {
      finishGame(room.code);
      toast.success("Partida terminada!");
      return;
    }

    startNextRound(room.code);
    toast.success(`Rodada ${round.number + 1} iniciada!`);
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
          Rodada {round.number} de {room.settings.roundsToPlay}
        </div>
      </header>

      <section className={styles.resultsHero}>
        <div>
          <span className={styles.eyebrow}>Resultados da rodada</span>
          <h1>
            Hora de contar
            <span>os pontos.</span>
          </h1>
          <p>
            {stoppedBy
              ? `${stoppedBy.name} gritou STOP e encerrou a rodada.`
              : "O tempo terminou e encerrou a rodada."}
          </p>
        </div>

        <aside className={styles.roundWinner}>
          <Trophy />
          <span>Melhor da rodada</span>
          <strong>{roundWinner?.name}</strong>
          <b>+{roundWinner?.roundScore ?? 0} pontos</b>
        </aside>
      </section>

      <div className={styles.resultsLayout}>
        <section className={styles.categoryResults}>
          {room.settings.categories.map((category) => (
            <article className={styles.categoryResult} key={category}>
              <div className={styles.categoryResultHeader}>
                <span>{category}</span>
                <small>Letra {round.letter}</small>
              </div>
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
          ))}
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

          {isHost ? (
            <Button className={styles.startButton} onClick={continueGame}>
              {isLastRound ? <Flag /> : <ArrowRight />}
              {isLastRound ? "Ver classificação final" : "Iniciar próxima rodada"}
            </Button>
          ) : (
            <div className={styles.waitingHost}>
              <span />
              Aguardando o anfitrião...
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
