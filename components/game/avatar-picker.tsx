"use client";

import { PlayerAvatar } from "@/components/game/player-avatar";
import {
  AVATAR_IDS,
  type AvatarId,
} from "@/lib/game/avatars";
import type { ProfileColor } from "@/lib/game/profile-colors";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { useLanguage } from "@/lib/i18n/language-provider";
import styles from "./avatar-picker.module.css";

export function AvatarPicker({
  value,
  color,
  onChange,
}: {
  value: AvatarId;
  color: ProfileColor;
  onChange: (avatarId: AvatarId) => void;
}) {
  const { t } = useLanguage();

  return (
    <fieldset className={styles.picker}>
      <legend>{t("avatar.choose")}</legend>
      <div>
        {AVATAR_IDS.map((avatarId) => {
          const label = t(`avatar.${avatarId}` as TranslationKey);
          return (
            <button
              aria-label={label}
              aria-pressed={avatarId === value}
              className={styles.option}
              key={avatarId}
              onClick={() => onChange(avatarId)}
              title={label}
              type="button"
            >
              <PlayerAvatar
                avatarId={avatarId}
                color={color}
              />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
