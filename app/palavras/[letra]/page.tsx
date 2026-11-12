import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentShell } from "@/components/content/content-shell";
import styles from "@/components/content/content.module.css";
import {
  getLetterGuide,
  LETTER_GUIDES,
  WORD_LIST_CATEGORIES,
} from "@/lib/content/word-lists";

export const dynamicParams = false;

export function generateStaticParams() {
  return LETTER_GUIDES.map((guide) => ({ letra: guide.letter.toLowerCase() }));
}

type PageProps = { params: Promise<{ letra: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { letra } = await params;
  const guide = getLetterGuide(letra);
  if (!guide) return {};

  const examples = WORD_LIST_CATEGORIES.slice(0, 4)
    .map((category) => guide.words[category][0])
    .join(", ");

  return {
    title: `Palavras com ${guide.letter} para o jogo Stop`,
    description: `Respostas com a letra ${guide.letter} para jogar Stop: nomes, países, comidas, profissões, animais e cidades (${examples}…) e uma dica para ganhar.`,
    alternates: { canonical: `/palavras/${guide.letter.toLowerCase()}` },
  };
}

export default async function LetterPage({ params }: PageProps) {
  const { letra } = await params;
  const guide = getLetterGuide(letra);
  if (!guide) notFound();

  const index = LETTER_GUIDES.indexOf(guide);
  const previous = LETTER_GUIDES[index - 1];
  const next = LETTER_GUIDES[index + 1];
  const total = WORD_LIST_CATEGORIES.reduce(
    (sum, category) => sum + guide.words[category].length,
    0,
  );

  return (
    <ContentShell
      eyebrow={`Letra ${guide.letter}`}
      title={`Palavras com ${guide.letter} para o Stop`}
      lead={`${total} respostas com a letra ${guide.letter} para as categorias mais jogadas do Stop, com uma dica para tirar mais pontos com esta letra.`}
      breadcrumbs={[
        { href: "/palavras", label: "Palavras por letra" },
        { href: `/palavras/${guide.letter.toLowerCase()}`, label: guide.letter },
      ]}
    >
      <p>
        Dificuldade da letra {guide.letter}:{" "}
        <span className={styles.difficulty}>{guide.difficulty}</span>
      </p>

      <div className={styles.callout}>
        <p>
          <strong>Dica para a letra {guide.letter}:</strong> {guide.tip}
        </p>
      </div>

      <div className={styles.categoryGrid}>
        {WORD_LIST_CATEGORIES.map((category) => (
          <section key={category} className={styles.categoryCard}>
            <h2>
              {category} com {guide.letter}
            </h2>
            <ul>
              {guide.words[category].map((word) => (
                <li key={word}>{word}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <h2>Como tirar mais pontos com a letra {guide.letter}</h2>
      <p>
        Lembra-te de que uma resposta repetida vale apenas 5 pontos. Por isso,
        quando tiveres tempo, evita a primeira palavra de cada lista, que é
        normalmente a mais óbvia, e escolhe uma das seguintes. Se ninguém
        mais acertar na categoria, a tua resposta vale 20 pontos.
      </p>
      <p>
        Esta lista não inclui todas as palavras possíveis. No jogo, as
        respostas que o jogastop não reconhece vão a votos entre os
        jogadores. Lê as <Link href="/regras">regras</Link> e as{" "}
        <Link href="/dicas">dicas de estratégia</Link> para saberes mais.
      </p>

      <h2>Outras letras</h2>
      <ul className={styles.letterGrid} aria-label="Outras letras">
        {LETTER_GUIDES.map((other) => (
          <li key={other.letter}>
            <Link
              href={`/palavras/${other.letter.toLowerCase()}`}
              aria-current={other.letter === guide.letter ? "page" : undefined}
              aria-label={`Palavras com a letra ${other.letter}`}
            >
              {other.letter}
            </Link>
          </li>
        ))}
      </ul>
      <p>
        {previous ? (
          <Link href={`/palavras/${previous.letter.toLowerCase()}`}>
            ← Letra {previous.letter}
          </Link>
        ) : null}
        {previous && next ? " · " : null}
        {next ? (
          <Link href={`/palavras/${next.letter.toLowerCase()}`}>
            Letra {next.letter} →
          </Link>
        ) : null}
      </p>
    </ContentShell>
  );
}
