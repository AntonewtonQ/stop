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
  const votedPlayers = Object.entries(challenge.votes)
    .map(([playerId, vote]) => ({
      player: players.find((candidate) => candidate.id === playerId),
      vote,
    }))
    .filter(
      (entry): entry is { player: Player; vote: AnswerVote } =>
        entry.player !== undefined,
    );
  const missingVoters = eligibleVoters.filter(
    (player) => challenge.votes[player.id] === undefined,
  );
  const recentVotes = votedPlayers.slice(-3).reverse();
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
        <div className={styles.challengeVoteTrail}>
          {challenge.status === "pending" && (
            <div>
              <span>{t("challenge.missingVotes")}</span>
              <strong>
                {formatPlayerNames(
                  missingVoters,
                  sessionId,
                  t("challenge.noMissingVotes"),
                  t("common.you"),
                )}
              </strong>
            </div>
          )}
          <div>
            <span>{t("challenge.recentVotes")}</span>
            <strong>
              {recentVotes.length > 0
                ? recentVotes
                    .map(({ player, vote }) =>
                      t("challenge.recentVote", {
                        name: player.id === sessionId
                          ? `${player.name} (${t("common.you")})`
                          : player.name,
                        vote: vote === "approve"
                          ? t("challenge.voteAcceptShort")
                          : t("challenge.voteRejectShort"),
                      }),
                    )
                    .join(", ")
                : t("challenge.noVotesYet")}
            </strong>
          </div>
        </div>
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

function formatPlayerNames(
  players: Player[],
  sessionId: string,
  fallback: string,
  youLabel: string,
) {
  if (players.length === 0) return fallback;

  return players
    .map((player) =>
      player.id === sessionId ? `${player.name} (${youLabel})` : player.name,
    )
    .join(", ");
}
