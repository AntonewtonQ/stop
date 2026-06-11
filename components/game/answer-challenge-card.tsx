"use client";

import { Check, CircleHelp, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  AnswerChallenge,
  AnswerVote,
  Player,
} from "@/lib/game/types";
import { useLanguage } from "@/lib/i18n/language-provider";
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
  const { t } = useLanguage();
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
            ? t("challenge.pending")
            : challenge.status === "approved"
              ? t("challenge.approved")
              : t("challenge.rejected")}
        </span>
        <strong>{challenge.answer}</strong>
        <small>
          {t("challenge.votes", {
            authors,
            current: Object.keys(challenge.votes).length,
            total: eligibleVoters.length,
          })}
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
            {t("challenge.accept")}
          </Button>
          <Button
            type="button"
            variant={currentVote === "reject" ? "destructive" : "outline"}
            onClick={() => onVote(challenge.id, "reject")}
          >
            <X />
            {t("challenge.reject")}
          </Button>
        </div>
      ) : (
        <Badge className={styles.challengeDecision}>
          {challenge.status === "pending"
            ? challenge.playerIds.includes(sessionId)
              ? t("challenge.yoursPending")
              : t("challenge.voteRecorded")
            : challenge.status === "approved"
              ? t("challenge.accepted")
              : t("challenge.refused")}
        </Badge>
      )}
    </div>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
