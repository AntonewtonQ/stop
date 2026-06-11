"use client";

import {
  PROFILE_COLORS,
  type ProfileColor,
} from "@/lib/game/profile-colors";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { useLanguage } from "@/lib/i18n/language-provider";
import styles from "./profile-color-picker.module.css";

export function ProfileColorPicker({
  value,
  onChange,
}: {
  value: ProfileColor;
  onChange: (color: ProfileColor) => void;
}) {
  const { t } = useLanguage();

  return (
    <fieldset className={styles.picker}>
      <legend>{t("profileColor.choose")}</legend>
      <div>
        {PROFILE_COLORS.map((color) => {
          const label = t(`profileColor.${color.id}` as TranslationKey);
          return (
            <button
              aria-label={label}
              aria-pressed={color.value === value}
              key={color.id}
              onClick={() => onChange(color.value)}
              style={{ background: color.value }}
              title={label}
              type="button"
            />
          );
        })}
      </div>
    </fieldset>
  );
}
