import type { LucideIcon } from "lucide-react";
import {
  Bolt,
  Crown,
  Flame,
  Gamepad2,
  Gem,
  Globe2,
  Music2,
  Rocket,
  Sun,
  Trophy,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DEFAULT_AVATAR_ID,
  type AvatarId,
} from "@/lib/game/avatars";
import styles from "./player-avatar.module.css";

const avatarIcons: Record<AvatarId, LucideIcon> = {
  spark: Gem,
  rocket: Rocket,
  crown: Crown,
  bolt: Bolt,
  flame: Flame,
  music: Music2,
  football: Trophy,
  gamepad: Gamepad2,
  sun: Sun,
  globe: Globe2,
};

export function PlayerAvatar({
  avatarId,
  color,
  className = "",
}: {
  avatarId?: AvatarId;
  color: string;
  className?: string;
}) {
  const normalizedAvatarId = avatarId ?? DEFAULT_AVATAR_ID;
  const Icon = avatarIcons[normalizedAvatarId];

  return (
    <Avatar
      className={`${styles.avatar} ${className}`}
      data-avatar-id={normalizedAvatarId}
    >
      <AvatarFallback
        className={styles.fallback}
        style={{
          background: color,
          color: color === "#F0B24A" ? "#0F2D3D" : "white",
        }}
      >
        <Icon aria-hidden="true" />
      </AvatarFallback>
    </Avatar>
  );
}
