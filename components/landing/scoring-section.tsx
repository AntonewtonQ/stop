"use client";

import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n/language-provider";
import styles from "@/app/page.module.css";

export function ScoringSection() {
  const { t } = useLanguage();
  const scoringRules = [
    {
      value: "+20",
      title: t("landing.uniqueTitle"),
      description: t("landing.uniqueBody"),
      featured: true,
    },
    {
      value: "+10",
      title: t("landing.correctTitle"),
      description: t("landing.correctBody"),
    },
    {
      value: "+5",
      title: t("landing.duplicateTitle"),
      description: t("landing.duplicateBody"),
    },
  ];

  return (
    <section className={styles.section} id="pontuacao">
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.kicker}>{t("landing.scoreKicker")}</span>
          <h2>{t("landing.scoreTitle")}</h2>
        </div>
        <p>{t("landing.scoreBody")}</p>
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
