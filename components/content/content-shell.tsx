import Link from "next/link";
import type { ReactNode } from "react";

import { AdSlot } from "@/components/ads/ad-slot";
import { ADSENSE_SLOTS } from "@/components/ads/adsense-config";
import { AdSenseScript } from "@/components/ads/adsense-script";
import { Logo } from "@/components/brand/logo";
import styles from "./content.module.css";

export const CONTENT_LINKS = [
  { href: "/regras", label: "Regras" },
  { href: "/dicas", label: "Dicas" },
  { href: "/palavras", label: "Palavras por letra" },
  { href: "/ranking", label: "Ranking" },
  { href: "/sobre", label: "Sobre" },
] as const;

type Crumb = { href: string; label: string };

/**
 * Server-rendered layout for the editorial pages (rules, tips, word lists,
 * about). Content is written in Portuguese, the game's primary language.
 */
export function ContentShell({
  eyebrow,
  title,
  lead,
  breadcrumbs = [],
  children,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  breadcrumbs?: Crumb[];
  children: ReactNode;
}) {
  return (
    <div className={styles.page} lang="pt">
      <AdSenseScript />
      <header className={styles.header}>
        <Link href="/" aria-label="jogastop, página inicial">
          <Logo />
        </Link>
        <nav className={styles.nav} aria-label="Guias do jogo">
          {CONTENT_LINKS.slice(0, 3).map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
          <Link className={styles.playLink} href="/#jogar">
            Jogar agora
          </Link>
        </nav>
      </header>

      <main className={styles.main}>
        {breadcrumbs.length > 0 ? (
          <nav className={styles.breadcrumbs} aria-label="Caminho">
            <Link href="/">Início</Link>
            {breadcrumbs.map((crumb) => (
              <span key={crumb.href}>
                <span aria-hidden="true">/</span>
                <Link href={crumb.href}>{crumb.label}</Link>
              </span>
            ))}
          </nav>
        ) : null}

        <div className={styles.hero}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{lead}</p>
        </div>

        <article className={styles.article}>{children}</article>

        <AdSlot slot={ADSENSE_SLOTS.content} />

        <section className={styles.cta}>
          <h2>Pronto para jogar?</h2>
          <p>
            Cria uma sala grátis, partilha o código no WhatsApp e joga Stop com
            os teus amigos em tempo real, no telemóvel ou no computador.
          </p>
          <Link className={styles.ctaButton} href="/#jogar">
            Criar uma sala
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <Logo compact />
        <nav aria-label="Mais páginas">
          {CONTENT_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
          <Link href="/privacidade">Privacidade</Link>
        </nav>
      </footer>
    </div>
  );
}
