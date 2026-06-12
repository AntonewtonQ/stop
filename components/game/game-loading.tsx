import { Logo } from "@/components/brand/logo";
import styles from "./game.module.css";

export function GameLoading({
  message,
  detail,
}: {
  message: string;
  detail: string;
}) {
  return (
    <main className={styles.gamePage}>
      <section
        aria-live="polite"
        aria-label={message}
        className={styles.gameLoading}
        role="status"
      >
        <div className={styles.loadingGlow} />
        <div className={styles.loadingLogo}>
          <Logo />
        </div>
        <div className={styles.loadingProgress} aria-hidden="true">
          <span />
        </div>
        <div className={styles.loadingCopy}>
          <strong>{message}</strong>
          <span>{detail}</span>
        </div>
      </section>
    </main>
  );
}
