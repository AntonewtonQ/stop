"use client";

import styles from "@/app/page.module.css";
import { useLanguage } from "@/lib/i18n/language-provider";
import { GamePreview } from "./game-preview";
import { RoomActions } from "./room-actions";

export function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className={styles.hero} id="jogar">
      <div className={styles.heroCopy}>
        <div className={styles.eyebrow}>{t("landing.heroEyebrow")}</div>
        <h1>
          {t("landing.heroTitle")}
          <span>{t("landing.heroTitleAccent")}</span>
        </h1>
        <p className={styles.lead}>{t("landing.heroLead")}</p>
        <RoomActions />
      </div>

      <GamePreview />
    </section>
  );
}
