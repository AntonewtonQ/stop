import styles from "@/app/page.module.css";
import { GamePreview } from "./game-preview";
import { RoomActions } from "./room-actions";

export function HeroSection() {
  return (
    <section className={styles.hero} id="jogar">
      <div className={styles.heroCopy}>
        <div className={styles.eyebrow}>O STOP feito para jogar online</div>
        <h1>
          Pensa rápido.
          <span>Marca grande.</span>
        </h1>
        <p className={styles.lead}>
          Escolhe a letra, preenche as categorias e grita STOP antes dos
          outros.
        </p>
        <RoomActions />
      </div>

      <GamePreview />
    </section>
  );
}
