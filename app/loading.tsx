"use client";

import { GameLoading } from "@/components/game/game-loading";
import { useLanguage } from "@/lib/i18n/language-provider";

export default function Loading() {
  const { t } = useLanguage();

  return (
    <GameLoading
      detail={`${t("landing.heroTitle")} ${t("landing.heroTitleAccent")}`}
      message={t("common.loadingRoom")}
    />
  );
}
