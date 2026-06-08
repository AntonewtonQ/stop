import styles from "@/app/page.module.css";
import { GridIcon, PeopleIcon, StopwatchIcon } from "./icons";

const features = [
  {
    title: "Pensa depressa",
    description: "O relógio não espera por ninguém.",
    icon: <StopwatchIcon />,
  },
  {
    title: "Categorias locais",
    description: "Do funge ao semba, cabe tudo.",
    icon: <GridIcon />,
  },
  {
    title: "Joga em grupo",
    description: "Cria uma sala e desafia os teus.",
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
