import { Badge } from "@/components/ui/badge";
import styles from "@/app/page.module.css";

const steps = [
  {
    number: "01",
    title: "Cria a sala",
    description: "Escolhe as regras e partilha o código com os teus.",
  },
  {
    number: "02",
    title: "Escolhe a letra",
    description: "O comandante escolhe a letra e inicia o relógio.",
  },
  {
    number: "03",
    title: "Grita STOP",
    description: "Preenche tudo, pára o relógio e conta os pontos.",
  },
];

export function HowToSection() {
  return (
    <section className={styles.howTo} id="como-jogar">
      <div className={styles.howToHeader}>
        <div>
          <span className={styles.kicker}>Três passos. Um vencedor.</span>
          <h2>Entrar é fácil. Ganhar já é outra conversa.</h2>
        </div>
        <p>
          Cada jogador comanda uma rodada. Escolhe a letra, controla o STOP e
          passa o comando ao próximo.
        </p>
      </div>

      <div className={styles.steps}>
        {steps.map((step) => (
          <article className={styles.step} key={step.number}>
            <Badge className={styles.stepNumber}>{step.number}</Badge>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
