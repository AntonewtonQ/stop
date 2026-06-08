import styles from "@/app/page.module.css";
import { GamePreview } from "./game-preview";
import { RoomActions } from "./room-actions";

export function HeroSection() {
  return (
    <section className={styles.hero} id="jogar">
      <div className={styles.heroCopy}>
        <div className={styles.eyebrow}>O clássico agora online</div>
        <h1>
          Pensa rápido.
          <span>Marca grande.</span>
        </h1>
        <p className={styles.lead}>
          Escolhe uma letra, desafia os teus amigos e encontra as melhores
          respostas antes que alguém grite STOP.
        </p>
        <RoomActions />
      </div>

      <GamePreview />
    </section>
  );
}
