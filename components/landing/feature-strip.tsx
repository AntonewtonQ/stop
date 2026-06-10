import styles from "@/app/page.module.css";
import { GridIcon, PeopleIcon, StopwatchIcon } from "./icons";

const features = [
  {
    title: "Pensa rápido",
    description: "O relógio corre. Tu também.",
    icon: <StopwatchIcon />,
  },
  {
    title: "Categorias locais",
    description: "Do funge ao semba, cabe tudo.",
    icon: <GridIcon />,
  },
  {
    title: "Joga com os teus",
    description: "Partilha o código e começa a disputa.",
    icon: <PeopleIcon />,
  },
];

export function FeatureStrip() {
  return (
    <section className={styles.featureStrip} aria-label="Destaques do jogo">
      {features.map((feature) => (
        <article className={styles.feature} key={feature.title}>
          <span className={styles.featureIcon}>{feature.icon}</span>
          <div>
            <strong>{feature.title}</strong>
            <p>{feature.description}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
