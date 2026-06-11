"use client";

import {
  Cookie,
  Database,
  ExternalLink,
  Gamepad2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/lib/i18n/language-provider";
import { privacyPolicies } from "@/lib/i18n/privacy";
import styles from "./privacy-policy.module.css";

const overviewIcons = [Gamepad2, Database, Cookie];

export function PrivacyPolicy() {
  const { locale } = useLanguage();
  const copy = privacyPolicies[locale];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label={copy.backHome}>
          <Logo />
        </Link>
        <Button asChild variant="outline" className={styles.backButton}>
          <Link href="/">{copy.backHome}</Link>
        </Button>
      </header>

      <section className={styles.hero}>
        <Badge variant="outline" className={styles.badge}>
          <ShieldCheck aria-hidden="true" />
          {copy.badge}
        </Badge>
        <h1>{copy.title}</h1>
        <p>{copy.intro}</p>
        <span>{copy.updated}</span>
      </section>

      <section
        className={styles.overview}
        aria-label={copy.overviewLabel}
      >
        {copy.overview.map((item, index) => {
          const Icon = overviewIcons[index];
          return (
            <article key={item.title}>
              <div>
                <Icon aria-hidden="true" />
              </div>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
            </article>
          );
        })}
      </section>

      <div className={styles.policyLayout}>
        <aside className={styles.contents}>
          <strong>{copy.contents}</strong>
          <nav>
            {copy.sections.map((section) => (
              <a href={`#${section.id}`} key={section.id}>
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <article className={styles.policy}>
          <div className={styles.note}>
            <Sparkles aria-hidden="true" />
            <div>
              <strong>{copy.noteTitle}</strong>
              <p>{copy.noteBody}</p>
            </div>
          </div>

          {copy.sections.map((section) => (
            <section id={section.id} key={section.id}>
              <h2>{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.items && (
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {section.id === "publicidade" ||
              section.id === "advertising" ||
              section.id === "publicite" ? (
                <a
                  className={styles.externalLink}
                  href="https://policies.google.com/privacy"
                  rel="noreferrer"
                  target="_blank"
                >
                  {copy.googlePrivacy}
                  <ExternalLink aria-hidden="true" />
                </a>
              ) : null}
            </section>
          ))}
        </article>
      </div>

      <footer className={styles.footer}>
        <Separator />
        <Logo compact />
        <p>{copy.footer}</p>
      </footer>
    </main>
  );
}
