import { Badge } from "@/components/ui/badge";
import styles from "@/app/page.module.css";

const scoringRules = [
  {
    value: "+20",
    title: "Resposta única",
    description: "Só tu deste uma resposta correcta nessa categoria.",
    featured: true,
  },
  {
    value: "+10",
    title: "Resposta correcta",
    description: "Acertaste, mas outros jogadores também deram respostas válidas.",
  },
  {
    value: "+5",
    title: "Resposta repetida",
    description: "Dois ou mais jogadores escreveram a mesma resposta.",
  },
];

export function ScoringSection() {
  return (
    <section className={styles.section} id="pontuacao">
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.kicker}>Cada resposta conta</span>
          <h2>Ser original vale mais.</h2>
        </div>
        <p>
          Uma resposta correcta vale 10. Se for repetida, vale 5. Se só tu
          acertares, levas 20.
        </p>
      </div>

      <div className={styles.scoreGrid}>
        {scoringRules.map((rule) => (
          <article
            className={`${styles.scoreRule} ${
              rule.featured ? styles.scoreRuleFeatured : ""
            }`}
            key={rule.value}
          >
            <Badge className={styles.scoreValue}>{rule.value}</Badge>
            <h3>{rule.title}</h3>
            <p>{rule.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
