"use client";

import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/language-provider";
import styles from "@/app/page.module.css";

export function SiteHeader() {
  const { t } = useLanguage();

  return (
    <header className={styles.header}>
      <a href="#" aria-label={t("landing.homeAria")}>
        <Logo />
      </a>

      <nav className={styles.nav} aria-label={t("landing.navAria")}>
        <a href="#pontuacao">{t("landing.scoreNav")}</a>
        <a href="#como-jogar">{t("landing.howNav")}</a>
        <Link href="/ranking">{t("landing.rankingNav")}</Link>
      </nav>

      <Button asChild variant="outline" className={styles.headerCta}>
        <a href="#jogar">{t("landing.playNow")}</a>
      </Button>
    </header>
  );
}
