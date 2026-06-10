"use client";

import { Check, CircleHelp, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  AnswerChallenge,
  AnswerVote,
  Player,
} from "@/lib/game/types";
import styles from "./game.module.css";

export function AnswerChallengeCard({
  challenge,
  players,
  sessionId,
  onVote,
}: {
  challenge: AnswerChallenge;
  players: Player[];
  sessionId: string;
  onVote: (challengeId: string, vote: AnswerVote) => void | Promise<void>;
}) {
  const authors = players
    .filter((player) => challenge.playerIds.includes(player.id))
    .map((player) => player.name)
    .join(", ");
  const eligibleVoters = players.filter(
    (player) =>
      player.isOnline && !challenge.playerIds.includes(player.id),
  );
  const canVote =
    challenge.status === "pending" &&
    eligibleVoters.some((player) => player.id === sessionId);
  const currentVote = challenge.votes[sessionId];

  return (
    <div
      className={`${styles.challengeCard} ${
        styles[`challenge${capitalize(challenge.status)}`]
      }`}
    >
      <CircleHelp />
      <div className={styles.challengeCopy}>
        <span>
          {challenge.status === "pending"
            ? "Resposta em votação"
            : challenge.status === "approved"
              ? "Aprovada pela sala"
              : "Rejeitada pela sala"}
        </span>
        <strong>{challenge.answer}</strong>
        <small>
          De {authors} · {Object.keys(challenge.votes).length} de{" "}
          {eligibleVoters.length} votos
        </small>
      </div>

      {canVote ? (
        <div className={styles.voteActions}>
          <Button
            type="button"
            variant={currentVote === "approve" ? "default" : "outline"}
            onClick={() => onVote(challenge.id, "approve")}
          >
            <Check />
            Aceitar
          </Button>
          <Button
            type="button"
            variant={currentVote === "reject" ? "destructive" : "outline"}
            onClick={() => onVote(challenge.id, "reject")}
          >
            <X />
            Rejeitar
          </Button>
        </div>
      ) : (
        <Badge className={styles.challengeDecision}>
          {challenge.status === "pending"
            ? challenge.playerIds.includes(sessionId)
              ? "A tua resposta está em votação"
              : "Voto registado"
            : challenge.status === "approved"
              ? "Aceite"
              : "Recusada"}
        </Badge>
      )}
    </div>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
