import type { Metadata } from "next";
import Link from "next/link";

import { ContentShell } from "@/components/content/content-shell";
import styles from "@/components/content/content.module.css";
import { LETTER_GUIDES, WORD_LIST_CATEGORIES } from "@/lib/content/word-lists";

export const metadata: Metadata = {
  title: "Palavras para o jogo Stop, letra a letra",
  description:
    "Listas de palavras para jogar Stop com cada letra: nomes, países, comidas, profissões, animais e cidades, com sugestões angolanas e dicas para as letras difíceis.",
  alternates: { canonical: "/palavras" },
};

export default function WordsIndexPage() {
  const hardest = LETTER_GUIDES.filter((guide) => guide.difficulty === "difícil");

  return (
    <ContentShell
      eyebrow="Listas de palavras"
      title="Palavras para o Stop, letra a letra"
      lead="Escolhe uma letra e encontra respostas para as categorias mais comuns do Stop. As listas misturam palavras de todo o mundo com respostas bem angolanas, que raramente se repetem."
      breadcrumbs={[{ href: "/palavras", label: "Palavras por letra" }]}
    >
      <ul className={styles.letterGrid} aria-label="Letras">
        {LETTER_GUIDES.map((guide) => (
          <li key={guide.letter}>
            <Link
              href={`/palavras/${guide.letter.toLowerCase()}`}
              aria-label={`Palavras com a letra ${guide.letter}`}
            >
              {guide.letter}
            </Link>
          </li>
        ))}
      </ul>

      <h2>Como usar estas listas</h2>
      <p>
        Cada página reúne exemplos para as seis categorias clássicas:{" "}
        {WORD_LIST_CATEGORIES.join(", ")}. A ideia não é decorar tudo, mas
        sim ter duas ou três respostas seguras por categoria nas letras em
        que costumas bloquear. Lê a lista antes de uma partida e repara nas
        respostas menos óbvias: são essas que te dão 10 ou 20 pontos.
      </p>
      <p>
        Estas listas servem para estudar e não substituem a validação do
        jogo. Dentro de uma partida, as respostas que o jogastop não
        reconhece vão a votos entre os jogadores.
      </p>

      <h2>As letras mais difíceis</h2>
      <p>
        As letras {hardest.map((guide) => guide.letter).join(", ")} são as que
        mais deixam categorias em branco. Em compensação, uma resposta válida
        nestas letras tem boas hipóteses de ser a única e valer 20 pontos.
      </p>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Letra</th>
            <th>Dificuldade</th>
            <th>Países na lista</th>
          </tr>
        </thead>
        <tbody>
          {LETTER_GUIDES.map((guide) => (
            <tr key={guide.letter}>
              <td>
                <Link href={`/palavras/${guide.letter.toLowerCase()}`}>
                  {guide.letter}
                </Link>
              </td>
              <td>{guide.difficulty}</td>
              <td>{guide.words.País.length}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Porque não há K, Q, U, W, X, Y e Z?</h2>
      <p>
        Estas letras quase não têm palavras em português para todas as
        categorias, por isso o jogastop não as sorteia. Com Q, por exemplo,
        há poucas comidas e nenhum país em português. Para mais detalhes, vê
        as <Link href="/regras">regras do jogo</Link>.
      </p>
    </ContentShell>
  );
}
