import { Crown, UserRound } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Player } from "@/lib/game/types";
import { useLanguage } from "@/lib/i18n/language-provider";
import styles from "./game.module.css";

export function PlayerList({
  players,
  currentPlayerId,
}: {
  players: Player[];
  currentPlayerId: string;
}) {
  const { t } = useLanguage();

  return (
    <div className={styles.playerList}>
      {players.map((player) => (
        <article className={styles.playerCard} key={player.id}>
          <Avatar className={styles.playerAvatar}>
            <AvatarFallback
              className={styles.playerAvatarFallback}
              style={{ background: player.color }}
            >
              {player.initials || <UserRound />}
            </AvatarFallback>
          </Avatar>
          <div>
            <strong>
              {player.name}
              {player.id === currentPlayerId ? ` (${t("common.you")})` : ""}
            </strong>
            <span>
              {player.isHost
                ? t("player.hostCurrent")
                : t("player.willCommand")}
            </span>
          </div>
          <div className={styles.playerPresence}>
            {player.isHost && (
              <Badge className={styles.hostBadge}>
                <Crown />
                {t("player.host")}
              </Badge>
            )}
            <span
              className={`${styles.presenceStatus} ${
                player.isOnline
                  ? styles.presenceStatusOnline
                  : styles.presenceStatusOffline
              }`}
            >
              <i aria-hidden />
              {player.isOnline ? t("common.online") : t("common.offline")}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
