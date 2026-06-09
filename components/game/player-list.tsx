import { Crown, UserRound } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Player } from "@/lib/game/types";
import styles from "./game.module.css";

export function PlayerList({
  players,
  currentPlayerId,
}: {
  players: Player[];
  currentPlayerId: string;
}) {
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
              {player.id === currentPlayerId ? " (tu)" : ""}
            </strong>
            <span>
              {player.isHost
                ? "Criador e primeiro comandante"
                : "Comandará uma rodada"}
            </span>
          </div>
          {player.isHost ? (
            <Badge className={styles.hostBadge}>
              <Crown />
              Anfitrião
            </Badge>
          ) : (
            <span className={styles.onlineDot} aria-label="Online" />
          )}
        </article>
      ))}
    </div>
  );
}
