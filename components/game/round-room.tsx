"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Send, Trophy, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { PlayerSession, Room, RoundAnswers } from "@/lib/game/types";
import styles from "./game.module.css";

export function RoundRoom({
  room,
  session,
}: {
  room: Room;
  session: PlayerSession;
}) {
  const round = room.round!;
  const [answers, setAnswers] = useState<RoundAnswers>({});
  const [submitted, setSubmitted] = useState(false);
  const [now, setNow] = useState(round.startedAt);

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
  const isFinished = submitted || remaining === 0;

  function updateAnswer(category: string, answer: string) {
    if (isFinished) return;
    setAnswers((current) => ({ ...current, [category]: answer }));
  }

  function submitAnswers() {
    setSubmitted(true);
    toast.success("STOP!", {
      description: `${answeredCount} de ${room.settings.categories.length} categorias preenchidas.`,
    });
  }

  return (
    <main className={styles.roundPage}>
      <header className={styles.roundHeader}>
        <Logo light />
        <div className={styles.roundRoomCode}>
          <span>Sala</span>
          <strong>{room.code}</strong>
        </div>
        <div className={styles.roundPlayers}>
          <UsersRound />
          {room.players.length} {room.players.length === 1 ? "jogador" : "jogadores"}
        </div>
      </header>

      <section className={styles.roundHero}>
        <div>
          <Badge className={styles.roundBadge}>Rodada {round.number}</Badge>
          <span className={styles.roundKicker}>Tudo começa com</span>
          <strong className={styles.roundLetter}>{round.letter}</strong>
        </div>
        <div className={`${styles.roundTimer} ${remaining <= 10 ? styles.timerDanger : ""}`}>
          <Clock3 />
          <span>Tempo restante</span>
          <strong>00:{remaining.toString().padStart(2, "0")}</strong>
        </div>
      </section>

      <Progress value={progress} className={styles.roundProgress} />

      <section className={styles.answerBoard}>
        <div className={styles.answerBoardHeader}>
          <div>
            <span className={styles.eyebrow}>{session.name}, é a tua vez</span>
            <h1>{isFinished ? "Respostas guardadas." : "Escreve antes do tempo acabar."}</h1>
          </div>
          <div className={styles.answerCounter}>
            <strong>{answeredCount}</strong>
            <span>de {room.settings.categories.length}</span>
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
                  <strong>{category}</strong>
                  <small>
                    {answer && !startsCorrectly
                      ? `Deve começar com ${round.letter}`
                      : `Resposta com a letra ${round.letter}`}
                  </small>
                </div>
                <Input
                  value={answer}
                  onChange={(event) => updateAnswer(category, event.target.value)}
                  placeholder={`${round.letter}...`}
                  disabled={isFinished}
                  autoFocus={index === 0}
                />
                {startsCorrectly && <CheckCircle2 className={styles.validAnswer} />}
              </label>
            );
          })}
        </div>

        {isFinished ? (
          <div className={styles.submittedPanel}>
            <Trophy />
            <div>
              <strong>{submitted ? "Tu gritaste STOP!" : "O tempo terminou."}</strong>
              <p>
                A primeira rodada está completa. A comparação e pontuação das
                respostas será o próximo passo.
              </p>
            </div>
          </div>
        ) : (
          <Button className={styles.stopRoundButton} onClick={submitAnswers}>
            <Send />
            STOP! Guardar respostas
          </Button>
        )}
      </section>
    </main>
  );
}
