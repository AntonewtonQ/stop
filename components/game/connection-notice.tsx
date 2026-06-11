"use client";

import { RefreshCw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { RoomConnectionStatus } from "@/lib/game/use-room";
import { useLanguage } from "@/lib/i18n/language-provider";
import styles from "./connection-notice.module.css";

export function ConnectionNotice({
  status,
  onRetry,
}: {
  status: RoomConnectionStatus;
  onRetry: () => void | Promise<unknown>;
}) {
  const { t } = useLanguage();
  if (status === "connected") return null;
  const reconnecting = status === "reconnecting";

  return (
    <aside className={styles.notice} role="status" aria-live="polite">
      {reconnecting ? <RefreshCw className={styles.spinning} /> : <WifiOff />}
      <div>
        <strong>
          {t(reconnecting ? "connection.reconnectingTitle" : "connection.offlineTitle")}
        </strong>
        <span>
          {t(reconnecting ? "connection.reconnectingBody" : "connection.offlineBody")}
        </span>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={() => onRetry()}>
        <RefreshCw />
        {t("connection.retry")}
      </Button>
    </aside>
  );
}
