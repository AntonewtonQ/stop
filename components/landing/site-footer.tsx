"use client";

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
      <p>{t("landing.footer")}</p>
    </footer>
  );
}
