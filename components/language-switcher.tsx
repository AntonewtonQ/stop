"use client";

import { Languages } from "lucide-react";
import { usePathname } from "next/navigation";

import { useLanguage } from "@/lib/i18n/language-provider";
import type { Locale } from "@/lib/i18n/dictionaries";
import styles from "./language-switcher.module.css";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();
  const pathname = usePathname();

  return (
    <label
      className={`${styles.switcher} ${
        pathname === "/" ? styles.landingSwitcher : ""
      }`}
    >
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
