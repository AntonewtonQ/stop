"use client";

import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/language-provider";
import styles from "./install-prompt.module.css";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallPrompt() {
  const { t } = useLanguage();
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    const initialState = window.setTimeout(() => {
      setIsStandalone(standalone);
      setIsIOS(ios);
      setDismissed(
        window.sessionStorage.getItem("jogastop:pwa-dismissed") === "1",
      );
    }, 0);

    function handleInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setIsStandalone(true);
      setInstallEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.clearTimeout(initialState);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  function dismiss() {
    window.sessionStorage.setItem("jogastop:pwa-dismissed", "1");
    setDismissed(true);
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setIsStandalone(true);
    setInstallEvent(null);
  }

  if (isStandalone || dismissed || (!installEvent && !isIOS)) return null;

  return (
    <aside className={styles.prompt} aria-live="polite">
      <div className={styles.icon}>
        {isIOS ? <Share2 /> : <Download />}
      </div>
      <div className={styles.copy}>
        <strong>{t("pwa.title")}</strong>
        <span>{t(isIOS ? "pwa.iosBody" : "pwa.body")}</span>
      </div>
      <div className={styles.actions}>
        {installEvent && (
          <Button
            className={styles.installButton}
            onClick={install}
            size="sm"
            type="button"
          >
            <Download />
            {t("pwa.install")}
          </Button>
        )}
        <Button
          aria-label={t("pwa.dismiss")}
          className={styles.dismissButton}
          onClick={dismiss}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <X />
        </Button>
      </div>
    </aside>
  );
}
