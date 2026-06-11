"use client";

import { Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { useLanguage } from "@/lib/i18n/language-provider";
import { DEFAULT_THEME_ID, THEME_IDS } from "@/lib/themes";
import styles from "./theme-picker.module.css";

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const currentTheme = mounted ? (theme ?? DEFAULT_THEME_ID) : DEFAULT_THEME_ID;

  return (
    <fieldset className={styles.picker}>
      <legend>
        <Palette aria-hidden="true" />
        {t("theme.choose")}
      </legend>
      <div>
        {THEME_IDS.map((themeId) => (
          <button
            aria-label={t(`theme.${themeId}` as TranslationKey)}
            aria-pressed={currentTheme === themeId}
            data-theme-preview={themeId}
            key={themeId}
            onClick={() => setTheme(themeId)}
            type="button"
          >
            <span aria-hidden>
              <i />
              <i />
            </span>
            {t(`theme.${themeId}` as TranslationKey)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
