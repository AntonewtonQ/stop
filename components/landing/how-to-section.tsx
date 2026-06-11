"use client";

import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n/language-provider";
import styles from "@/app/page.module.css";

export function HowToSection() {
  const { t } = useLanguage();
  const steps = [
    {
      number: "01",
      title: t("landing.stepCreateTitle"),
      description: t("landing.stepCreateBody"),
    },
    {
      number: "02",
      title: t("landing.stepLetterTitle"),
      description: t("landing.stepLetterBody"),
    },
    {
      number: "03",
      title: t("landing.stepStopTitle"),
      description: t("landing.stepStopBody"),
    },
  ];

  return (
    <section className={styles.howTo} id="como-jogar">
      <div className={styles.howToHeader}>
        <div>
          <span className={styles.kicker}>{t("landing.howKicker")}</span>
          <h2>{t("landing.howTitle")}</h2>
        </div>
        <p>{t("landing.howBody")}</p>
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
