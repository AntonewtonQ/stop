"use client";

import { Languages } from "lucide-react";

import { useLanguage } from "@/lib/i18n/language-provider";
import type { Locale } from "@/lib/i18n/dictionaries";
import styles from "./language-switcher.module.css";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <label className={styles.switcher}>
      <Languages aria-hidden="true" />
      <span className="sr-only">{t("language.label")}</span>
      <select
        aria-label={t("language.label")}
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
      >
        <option value="pt">{t("language.pt")}</option>
        <option value="en">{t("language.en")}</option>
        <option value="fr">{t("language.fr")}</option>
      </select>
    </label>
  );
}
