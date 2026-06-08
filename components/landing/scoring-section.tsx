import { Badge } from "@/components/ui/badge";
import styles from "@/app/page.module.css";

const scoringRules = [
  {
    value: "+20",
    title: "Resposta única",
    description: "Só tu acertaste ou preencheste correctamente a categoria.",
    featured: true,
  },
  {
    value: "+10",
    title: "Resposta correcta",
    description:
      "A resposta é válida e outros jogadores também acertaram com palavras diferentes.",
  },
  {
    value: "+5",
    title: "Resposta repetida",
    description:
      "Dois ou mais jogadores escreveram a mesma resposta na categoria.",
  },
];

export function ScoringSection() {
  return (
    <section className={styles.section} id="pontuacao">
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.kicker}>Cada palavra conta</span>
          <h2>Quanto mais original, melhor.</h2>
        </div>
        <p>
          Respostas correctas dão pontos. As respostas únicas valem o dobro,
          por isso vale a pena pensar para além do óbvio.
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
