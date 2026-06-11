"use client";

import styles from "@/components/game/game.module.css";
import { useLanguage } from "@/lib/i18n/language-provider";

export default function LoadingRoom() {
  const { t } = useLanguage();

  return (
    <main className={styles.gamePage}>
      <div className={styles.loadingCard}>
        <span />
        <p>{t("common.loadingRoom")}</p>
      </div>
    </main>
  );
}
