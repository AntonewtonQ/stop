"use client";

import styles from "@/app/page.module.css";
import { useLanguage } from "@/lib/i18n/language-provider";
import { GridIcon, PeopleIcon, StopwatchIcon } from "./icons";

export function FeatureStrip() {
  const { t } = useLanguage();
  const features = [
    {
      title: t("landing.featureFastTitle"),
      description: t("landing.featureFastBody"),
      icon: <StopwatchIcon />,
    },
    {
      title: t("landing.featureLocalTitle"),
      description: t("landing.featureLocalBody"),
      icon: <GridIcon />,
    },
    {
      title: t("landing.featureGroupTitle"),
      description: t("landing.featureGroupBody"),
      icon: <PeopleIcon />,
    },
  ];

  return (
    <section className={styles.featureStrip} aria-label={t("landing.featureAria")}>
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
