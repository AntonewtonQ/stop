"use client";

import { useEffect, useRef } from "react";

import { useLanguage } from "@/lib/i18n/language-provider";
import { ADSENSE_CLIENT_ID } from "./adsense-config";
import styles from "./ad-slot.module.css";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Responsive AdSense display unit. Requires <AdSenseScript /> on the page.
 * Space is reserved up front to avoid layout shift and the block collapses
 * when AdSense reports it could not fill the slot.
 */
export function AdSlot({ slot }: { slot?: string }) {
  const { t } = useLanguage();
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!slot || pushedRef.current) return;
    pushedRef.current = true;

    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      // Blocked by an ad blocker or not ready: leave the slot empty.
    }
  }, [slot]);

  if (!slot) return null;

  return (
    <aside className={styles.slot} aria-label={t("ads.label")}>
      <span className={styles.label}>{t("ads.label")}</span>
      <ins
        className={`adsbygoogle ${styles.unit}`}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-format="auto"
        data-ad-slot={slot}
        data-adtest={process.env.NODE_ENV === "production" ? undefined : "on"}
        data-full-width-responsive="true"
      />
    </aside>
  );
}
