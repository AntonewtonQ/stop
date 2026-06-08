import styles from "@/components/game/game.module.css";

export default function LoadingRoom() {
  return (
    <main className={styles.gamePage}>
      <div className={styles.loadingCard}>
        <span />
        <p>A preparar a sala...</p>
      </div>
    </main>
  );
}
