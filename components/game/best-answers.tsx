"use client";

import Link from "next/link";
import { BookOpen, Lightbulb } from "lucide-react";

import {
  getLetterGuide,
  WORD_LIST_CATEGORIES,
  type WordListCategory,
} from "@/lib/content/word-lists";
import { knownWordsFor, normalizeAnswer } from "@/lib/game/word-validation";
import type { RoundAnswers } from "@/lib/game/types";
import { useLanguage } from "@/lib/i18n/language-provider";
import styles from "./best-answers.module.css";

const MAX_PER_CATEGORY = 3;

function suggestionsFor(category: string, letter: string, taken: Set<string>) {
  const listed = WORD_LIST_CATEGORIES.includes(category as WordListCategory)
    ? (getLetterGuide(letter)?.words[category as WordListCategory] ?? [])
    : [];
  const seen = new Set<string>();

  return [...listed, ...knownWordsFor(category, letter)]
    .filter((word) => {
      const key = normalizeAnswer(word);
      if (seen.has(key) || taken.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_PER_CATEGORY);
}

/** "Melhores respostas possíveis": answers nobody gave, per category. */
export function BestAnswers({
  letter,
  categories,
  answers,
}: {
  letter: string;
  categories: string[];
  answers: Record<string, RoundAnswers>;
}) {
  const { category: categoryLabel, t } = useLanguage();
  const taken = new Set(
    Object.values(answers).flatMap((playerAnswers) =>
      Object.values(playerAnswers).map((answer) => normalizeAnswer(answer)),
    ),
  );
  const rows = categories
    .map((category) => ({ category, words: suggestionsFor(category, letter, taken) }))
    .filter((row) => row.words.length > 0);

  if (rows.length === 0) return null;

  return (
    <section className={styles.panel}>
      <header>
        <Lightbulb aria-hidden />
        <div>
          <strong>{t("results.bestAnswers", { letter })}</strong>
          <span>{t("results.bestAnswersBody")}</span>
        </div>
      </header>
      <dl>
        {rows.map(({ category, words }) => (
          <div key={category}>
            <dt>{categoryLabel(category)}</dt>
            <dd>
              {words.map((word) => (
                <span key={word}>{word}</span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <Link className={styles.more} href={`/palavras/${letter.toLowerCase()}`}>
        <BookOpen aria-hidden />
        {t("results.moreWords", { letter })}
      </Link>
    </section>
  );
}
