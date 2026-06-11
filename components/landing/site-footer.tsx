"use client";

import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/lib/i18n/language-provider";
import styles from "@/app/page.module.css";

export function SiteFooter() {
  const { t } = useLanguage();

  return (
    <footer className={styles.footer}>
      <Separator className={styles.footerSeparator} />
      <Logo compact />
      <div className={styles.footerCopy}>
        <p>{t("landing.footer")}</p>
        <Link href="/privacidade">{t("landing.privacy")}</Link>
      </div>
    </footer>
  );
}
