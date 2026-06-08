import { Badge } from "@/components/ui/badge";
import styles from "@/app/page.module.css";

const steps = [
  {
    number: "01",
    title: "Cria a sala",
    description: "Partilha o código com os amigos e escolhe as categorias.",
  },
  {
    number: "02",
    title: "Define a letra",
    description: "O comandante da rodada escolhe a letra e inicia o relógio.",
  },
  {
    number: "03",
    title: "Grita STOP",
    description: "Preenche tudo primeiro, pára o tempo e vê quem marcou grande.",
  },
];

export function HowToSection() {
  return (
    <section className={styles.howTo} id="como-jogar">
      <div className={styles.howToHeader}>
        <div>
          <span className={styles.kicker}>Três passos. Muita pressão.</span>
          <h2>É simples começar a jogar.</h2>
        </div>
        <p>
          O jogador que define a letra também controla o relógio da rodada.
          Quando terminar, as respostas são comparadas e os pontos calculados.
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
