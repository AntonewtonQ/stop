"use client";

import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { useSyncExternalStore } from "react";

import { getChallengeDay, getChallengeNumber } from "@/lib/game/daily";
import { useLanguage } from "@/lib/i18n/language-provider";
import styles from "./daily-banner.module.css";

const subscribe = () => () => undefined;

/** Home-page call to action for today's daily challenge. */
export function DailyBanner() {
  const { t } = useLanguage();
  // The number depends on the current date: compute it on the client only.
  const number = useSyncExternalStore(
    subscribe,
    () => getChallengeNumber(getChallengeDay()),
    () => null,
  );

  return (
    <section className={styles.banner} aria-labelledby="daily-banner-title">
      <span className={styles.icon} aria-hidden>
        <Flame />
      </span>
      <div className={styles.copy}>
        <h2 id="daily-banner-title">
          {number ? t("daily.bannerTitle", { number }) : t("daily.navLabel")}
        </h2>
        <p>{t("daily.bannerBody")}</p>
      </div>
      <Link className={styles.cta} href="/desafio">
        {t("daily.bannerCta")}
        <ArrowRight aria-hidden />
      </Link>
    </section>
  );
}
