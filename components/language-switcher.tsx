"use client";

import { Languages } from "lucide-react";
import { usePathname } from "next/navigation";

import { useLanguage } from "@/lib/i18n/language-provider";
import type { Locale } from "@/lib/i18n/dictionaries";
import styles from "./language-switcher.module.css";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();
  const pathname = usePathname();
  // Inside a room the bottom edge holds the STOP bar, so the switcher becomes
  // a compact round button stacked above the sound toggle.
  const inRoom = pathname.startsWith("/sala/");
  const variant =
    pathname === "/" ? styles.landingSwitcher : inRoom ? styles.roomSwitcher : "";

  return (
    <label className={`${styles.switcher} ${variant}`}>
      <Languages aria-hidden="true" />
      <span className="sr-only">{t("language.label")}</span>
      <select
        aria-label={t("language.label")}
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
      >
        {(["pt", "en", "fr"] as const).map((code) => (
          <option key={code} value={code}>
            {inRoom ? code.toUpperCase() : t(`language.${code}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
