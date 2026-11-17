"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  Copy,
  Flame,
  Loader2,
  MessageCircle,
  RotateCcw,
  Send,
  Star,
  Timer,
  Trophy,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { trackGameEvent } from "@/lib/analytics/game-events";
import { PLAYABLE_LETTERS } from "@/lib/game/constants";
import {
  dailyEmojiGrid,
  msUntilNextChallenge,
  type DailyAnswerStatus,
  type DailyResult,
} from "@/lib/game/daily";
import { readLastPlayerSession } from "@/lib/game/storage";
import { startsWithLetter } from "@/lib/game/word-validation";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { useLanguage } from "@/lib/i18n/language-provider";
import styles from "./daily-challenge.module.css";

type PublicChallenge = {
  day: string;
  number: number;
  categories: string[];
  featured: string;
  duration: number;
};

type Week = {
  start: string;
  end: string;
  featured: string;
  leaderboard: { name: string; total: number; days: number }[];
  players: number;
  me: { total: number; days: number; rank: number } | null;
};

type Profile = {
  daysPlayed: number;
  bestScore: number;
  letters: Record<string, number>;
  expertScore: number;
};

type Me =
  | { status: "playing"; attemptId: string; letter: string; startedAt: number; endsAt: number }
  | {
      status: "finished";
      attemptId: string;
      letter: string;
      result: DailyResult;
      rank: number;
      streak: number;
    };

type Overview = {
  challenge: PublicChallenge;
  leaderboard: { name: string; score: number; elapsedMs: number }[];
  players: number;
  me: Me | null;
  streak: number | null;
  week: Week;
  profile: Profile | null;
  serverNow: number;
};

const KEY_STORAGE = "jogastop:daily:key";
const NAME_STORAGE = "jogastop:daily:name";
const answersStorage = (day: string) => `jogastop:daily:answers:${day}`;

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getPlayerKey() {
  const store = storage();
  let key = store?.getItem(KEY_STORAGE) ?? null;
  if (!key) {
    key = crypto.randomUUID();
    store?.setItem(KEY_STORAGE, key);
  }
  return key;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
  return data;
}

function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => value.toString().padStart(2, "0");
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

function useCountUp(target: number) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const startedAt = performance.now();
    const step = (now: number) => {
      const progress = reduced ? 1 : Math.min(1, (now - startedAt) / 900);
      setValue(Math.round(target * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return value;
}

const STATUS_KEYS: Record<DailyAnswerStatus, TranslationKey> = {
  confirmed: "daily.status.confirmed",
  unconfirmed: "daily.status.unconfirmed",
  invalid: "daily.status.invalid",
  empty: "daily.status.empty",
};

export function DailyChallenge() {
  const { t } = useLanguage();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  /** Server clock (ms), refreshed by an interval while a timer is on screen. */
  const [clock, setClock] = useState(0);
  const offsetRef = useRef(0);
  const playerKeyRef = useRef("");
  const submittedRef = useRef(false);
  const submitRef = useRef<() => void>(() => undefined);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const data = await api<Overview>("/api/desafio", {
        headers: { "x-jogastop-daily-key": playerKeyRef.current },
      });
      offsetRef.current = data.serverNow - Date.now();
      setClock(data.serverNow);
      if (data.me?.status === "playing") {
        // Restore answers typed before a reload.
        try {
          const saved = storage()?.getItem(answersStorage(data.challenge.day));
          if (saved) setAnswers(JSON.parse(saved) as Record<string, string>);
        } catch {
          // ignore corrupted local data
        }
      }
      setOverview(data);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    playerKeyRef.current = getPlayerKey();
    const timeout = window.setTimeout(() => {
      setName(storage()?.getItem(NAME_STORAGE) ?? readLastPlayerSession()?.name ?? "");
      void load();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const challenge = overview?.challenge;
  const me = overview?.me ?? null;
  const playing = me?.status === "playing" ? me : null;
  const finished = me?.status === "finished" ? me : null;

  useEffect(() => {
    if (!challenge || !playing) return;
    storage()?.setItem(answersStorage(challenge.day), JSON.stringify(answers));
  }, [answers, challenge, playing]);

  // Tick the clock; when a round runs out, send whatever was typed.
  useEffect(() => {
    if (!playing && !finished) return;
    const id = window.setInterval(
      () => {
        const now = Date.now() + offsetRef.current;
        setClock(now);
        if (playing && now >= playing.endsAt) submitRef.current();
      },
      playing ? 200 : 1000,
    );
    return () => window.clearInterval(id);
  }, [finished, playing]);

  const countingDown = playing ? clock < playing.startedAt : false;
  const remainingMs = playing ? playing.endsAt - clock : 0;

  const submit = useCallback(async () => {
    if (!playing || submittedRef.current) return;
    submittedRef.current = true;
    setBusy(true);
    try {
      const data = await api<{ me: Me }>("/api/desafio/finish", {
        method: "POST",
        body: JSON.stringify({
          playerKey: playerKeyRef.current,
          attemptId: playing.attemptId,
          answers,
        }),
      });
      if (data.me.status === "finished") {
        trackGameEvent("daily_finished", {
          score: data.me.result.total,
          rank: data.me.rank,
          streak: data.me.streak,
        });
      }
      await load();
    } catch {
      submittedRef.current = false;
      toast.error(t("daily.finishError"));
    } finally {
      setBusy(false);
    }
  }, [answers, load, playing, t]);

  useEffect(() => {
    submitRef.current = () => void submit();
  }, [submit]);

  useEffect(() => {
    if (playing && !countingDown) firstInputRef.current?.focus();
  }, [countingDown, playing]);

  async function start() {
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    setBusy(true);
    try {
      storage()?.setItem(NAME_STORAGE, trimmed);
      const data = await api<{ me: Me; serverNow: number }>("/api/desafio/start", {
        method: "POST",
        body: JSON.stringify({ playerKey: playerKeyRef.current, name: trimmed }),
      });
      offsetRef.current = data.serverNow - Date.now();
      submittedRef.current = false;
      setClock(data.serverNow);
      trackGameEvent("daily_started", { number: challenge?.number ?? 0 });
      setOverview((current) => (current ? { ...current, me: data.me } : current));
    } catch {
      toast.error(t("daily.startError"));
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <Shell>
        <div className={styles.card}>
          <p>{t("daily.error")}</p>
          <button className={styles.primary} onClick={() => void load()} type="button">
            <RotateCcw /> {t("daily.retry")}
          </button>
        </div>
      </Shell>
    );
  }

  if (!overview || !challenge) {
    return (
      <Shell>
        <div className={styles.loading}>
          <Loader2 className={styles.spin} /> {t("daily.loading")}
        </div>
      </Shell>
    );
  }

  const streak = finished?.streak ?? overview.streak ?? 0;

  return (
    <Shell
      badge={t("daily.number", { number: challenge.number })}
      streak={streak > 0 ? streak : null}
    >
      {playing ? (
        <PlayScreen
          answers={answers}
          busy={busy}
          categories={challenge.categories}
          featured={challenge.featured}
          countdownMs={playing.startedAt - clock}
          countingDown={countingDown}
          duration={challenge.duration}
          firstInputRef={firstInputRef}
          letter={playing.letter}
          onChange={(category, value) =>
            setAnswers((current) => ({ ...current, [category]: value }))
          }
          onStop={() => void submit()}
          remainingMs={remainingMs}
        />
      ) : finished ? (
        <ResultScreen
          me={finished}
          nextInMs={msUntilNextChallenge(clock)}
          number={challenge.number}
          players={overview.players}
        />
      ) : (
        <IntroScreen
          busy={busy}
          categories={challenge.categories}
          featured={challenge.featured}
          name={name}
          onName={setName}
          onStart={() => void start()}
          players={overview.players}
        />
      )}

      {!playing ? (
        <>
          <Leaderboard
            entries={overview.leaderboard}
            highlightName={finished ? name.trim() : null}
          />
          <WeekBoard week={overview.week} />
          {overview.profile ? <LetterProfile profile={overview.profile} /> : null}
        </>
      ) : null}
    </Shell>
  );
}

function Shell({
  badge,
  streak,
  children,
}: {
  badge?: string;
  streak?: number | null;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label="jogastop">
          <Logo light />
        </Link>
        <div className={styles.headerChips}>
          {streak ? (
            <span className={styles.streakChip} title={t("daily.streak", { count: streak })}>
              <Flame aria-hidden /> {streak}
              <span className="sr-only">{t("daily.streak", { count: streak })}</span>
            </span>
          ) : null}
          {badge ? <span className={styles.badge}>{badge}</span> : null}
        </div>
      </header>
      <div className={styles.content}>{children}</div>
    </main>
  );
}

function IntroScreen({
  categories,
  featured,
  name,
  onName,
  onStart,
  busy,
  players,
}: {
  categories: string[];
  featured: string;
  name: string;
  onName: (value: string) => void;
  onStart: () => void;
  busy: boolean;
  players: number;
}) {
  const { t } = useLanguage();
  const valid = name.trim().length >= 2;

  return (
    <section className={styles.hero}>
      <span className={styles.eyebrow}>{t("daily.eyebrow")}</span>
      <h1 className={styles.title}>{t("daily.title")}</h1>
      <p className={styles.lead}>{t("daily.lead")}</p>

      <ul className={styles.mysteryRow} aria-label={t("daily.letter")}>
        <li className={styles.mysteryLetter} aria-hidden>
          ?
        </li>
        {categories.map((category) => (
          <li
            key={category}
            className={styles.categoryChip}
            data-featured={category === featured || undefined}
          >
            {t(`category.${category}` as TranslationKey)}
            {category === featured ? <b className={styles.double}>×2</b> : null}
          </li>
        ))}
      </ul>

      <ul className={styles.rules}>
        <li>
          <Check aria-hidden /> {t("daily.ruleConfirmed")}
        </li>
        <li>
          <Check aria-hidden /> {t("daily.ruleUnconfirmed")}
        </li>
        <li>
          <Timer aria-hidden /> {t("daily.ruleSpeed")}
        </li>
      </ul>

      <form
        className={styles.startForm}
        onSubmit={(event) => {
          event.preventDefault();
          onStart();
        }}
      >
        <label className={styles.field}>
          <span>{t("daily.nameLabel")}</span>
          <input
            autoComplete="nickname"
            maxLength={24}
            onChange={(event) => onName(event.target.value)}
            placeholder={t("daily.namePlaceholder")}
            value={name}
          />
        </label>
        <button className={styles.primary} disabled={!valid || busy} type="submit">
          {busy ? <Loader2 className={styles.spin} /> : <ArrowRight />}
          {busy ? t("daily.starting") : t("daily.start")}
        </button>
      </form>

      <p className={styles.players}>
        <Users aria-hidden /> {t("daily.players", { count: players })}
      </p>
    </section>
  );
}

function PlayScreen({
  letter,
  categories,
  featured,
  answers,
  onChange,
  onStop,
  busy,
  countingDown,
  countdownMs,
  remainingMs,
  duration,
  firstInputRef,
}: {
  letter: string;
  categories: string[];
  featured: string;
  answers: Record<string, string>;
  onChange: (category: string, value: string) => void;
  onStop: () => void;
  busy: boolean;
  countingDown: boolean;
  countdownMs: number;
  remainingMs: number;
  duration: number;
  firstInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { t } = useLanguage();

  if (countingDown) {
    const count = Math.max(1, Math.ceil(countdownMs / 1000));
    return (
      <section className={styles.countdown} aria-live="assertive">
        <span className={styles.eyebrow}>{t("daily.getReady")}</span>
        <strong key={count} className={styles.countdownNumber}>
          {count}
        </strong>
      </section>
    );
  }

  const filled = categories.filter((category) => answers[category]?.trim()).length;
  const complete = filled === categories.length;
  const progress = Math.max(0, Math.min(1, remainingMs / (duration * 1000)));
  const danger = remainingMs <= 10_000;

  return (
    <section className={styles.arena}>
      <div className={styles.arenaTop}>
        <div className={styles.letterBlock}>
          <span>{t("daily.letter")}</span>
          <strong className={styles.bigLetter}>{letter}</strong>
        </div>
        <div className={styles.clock} data-danger={danger || undefined}>
          <Timer aria-hidden />
          <span className="sr-only">{t("daily.timeLeft")}</span>
          <strong>{formatClock(remainingMs)}</strong>
        </div>
      </div>
      <div className={styles.timeBar} data-danger={danger || undefined}>
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>

      <form
        className={styles.answers}
        onSubmit={(event) => {
          event.preventDefault();
          if (complete) onStop();
        }}
      >
        {categories.map((category, index) => {
          const value = answers[category] ?? "";
          const ok = value.trim() !== "" && startsWithLetter(value.trim(), letter);
          return (
            <label
              key={category}
              className={styles.answer}
              data-state={value.trim() ? (ok ? "ok" : "bad") : undefined}
            >
              <span className={styles.answerLabel}>
                <b>{(index + 1).toString().padStart(2, "0")}</b>
                {t(`category.${category}` as TranslationKey)}
                {category === featured ? <i className={styles.double}>×2</i> : null}
              </span>
              <input
                ref={index === 0 ? firstInputRef : undefined}
                autoCapitalize="words"
                autoComplete="off"
                disabled={busy}
                enterKeyHint={index === categories.length - 1 ? "done" : "next"}
                maxLength={60}
                onChange={(event) => onChange(category, event.target.value)}
                placeholder={t("daily.mustStart", { letter })}
                spellCheck={false}
                value={value}
              />
              {ok ? <Check className={styles.answerTick} aria-hidden /> : null}
            </label>
          );
        })}

        <button
          className={styles.stopButton}
          disabled={!complete || busy}
          type="submit"
        >
          {busy ? <Loader2 className={styles.spin} /> : <Send />}
          {busy
            ? t("daily.sending")
            : complete
              ? t("daily.stop")
              : t("daily.completeToStop")}
        </button>
      </form>
    </section>
  );
}

function ResultScreen({
  me,
  number,
  players,
  nextInMs,
}: {
  me: Extract<Me, { status: "finished" }>;
  number: number;
  players: number;
  nextInMs: number;
}) {
  const { t } = useLanguage();
  const score = useCountUp(me.result.total);
  const grid = dailyEmojiGrid(me.result);
  const shareText = useMemo(
    () =>
      t("daily.shareText", {
        number,
        grid,
        score: me.result.total,
        streak: me.streak,
        url: `${window.location.origin}/desafio`,
      }),
    [grid, me.result.total, me.streak, number, t],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success(t("daily.copied"));
    } catch {
      toast.error(shareText);
    }
  }

  return (
    <section className={styles.result}>
      <span className={styles.eyebrow}>{t("daily.resultEyebrow", { number })}</span>
      <div className={styles.scoreBlock}>
        <strong className={styles.score}>{score}</strong>
        <span>{t("daily.points")}</span>
      </div>
      <p className={styles.grid} aria-hidden>
        {grid}
      </p>

      <div className={styles.stats}>
        <div>
          <Trophy aria-hidden />
          <span>{t("daily.rankLabel")}</span>
          <strong>{t("daily.rank", { rank: me.rank, total: Math.max(players, me.rank) })}</strong>
        </div>
        <div>
          <Flame aria-hidden />
          <span>{t("daily.streak", { count: me.streak })}</span>
          <strong>🔥 {me.streak}</strong>
        </div>
      </div>

      <ol className={styles.breakdown}>
        {me.result.answers.map((answer) => (
          <li key={answer.category} data-status={answer.status}>
            <span className={styles.breakdownCategory}>
              {t(`category.${answer.category}` as TranslationKey)}
              {answer.featured ? <i className={styles.double}>×2</i> : null}
            </span>
            <span className={styles.breakdownAnswer}>{answer.answer || "—"}</span>
            <span className={styles.pill}>{t(STATUS_KEYS[answer.status])}</span>
            <strong>+{answer.points}</strong>
          </li>
        ))}
        <li data-status="bonus">
          <span className={styles.breakdownCategory}>{t("daily.speedBonus")}</span>
          <span className={styles.breakdownAnswer} />
          <span className={styles.pill}>
            <Timer aria-hidden />
          </span>
          <strong>+{me.result.speedBonus}</strong>
        </li>
      </ol>

      <div className={styles.actions}>
        <a
          className={styles.primary}
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          rel="noreferrer"
          target="_blank"
        >
          <MessageCircle /> {t("daily.share")}
        </a>
        <button className={styles.secondary} onClick={() => void copy()} type="button">
          <Copy /> {t("daily.copy")}
        </button>
      </div>

      <p className={styles.next}>
        <Timer aria-hidden /> {t("daily.nextIn", { time: formatClock(nextInMs) })}
      </p>

      <div className={styles.links}>
        <Link href={`/palavras/${me.letter.toLowerCase()}`}>
          <BookOpen aria-hidden /> {t("daily.wordsLink", { letter: me.letter })}
        </Link>
        <Link href="/#jogar">
          <Users aria-hidden /> {t("daily.playFriends")}
        </Link>
      </div>
    </section>
  );
}

function Leaderboard({
  entries,
  highlightName,
}: {
  entries: Overview["leaderboard"];
  highlightName: string | null;
}) {
  const { t } = useLanguage();

  return (
    <section className={styles.leaderboard}>
      <h2>
        <Trophy aria-hidden /> {t("daily.leaderboard")}
      </h2>
      {entries.length === 0 ? (
        <p className={styles.empty}>{t("daily.leaderboardEmpty")}</p>
      ) : (
        <ol>
          {entries.map((entry, index) => (
            <li
              key={`${entry.name}-${index}`}
              data-me={highlightName === entry.name || undefined}
              data-podium={index < 3 ? index + 1 : undefined}
            >
              <span className={styles.position}>{index + 1}</span>
              <span className={styles.playerName}>
                {entry.name}
                {highlightName === entry.name ? ` (${t("daily.you")})` : ""}
              </span>
              <span className={styles.playerTime}>
                {(entry.elapsedMs / 1000).toFixed(1)}s
              </span>
              <strong>{entry.score}</strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function rewardFor(position: number): TranslationKey | null {
  if (position <= 3) return "daily.weekReward.podium";
  if (position <= 10) return "daily.weekReward.top10";
  if (position <= 50) return "daily.weekReward.top50";
  return null;
}

function WeekBoard({ week }: { week: Week }) {
  const { t } = useLanguage();
  const category = t(`category.${week.featured}` as TranslationKey);
  const myReward = week.me ? rewardFor(week.me.rank) : null;

  return (
    <section className={styles.leaderboard}>
      <div className={styles.weekTheme}>
        <span className={styles.double}>×2</span>
        <div>
          <h2>{t(`daily.weekTitle.${week.featured}` as TranslationKey)}</h2>
          <p>{t("daily.weekBody", { category })}</p>
        </div>
      </div>

      {week.me ? (
        <p className={styles.weekMe}>
          <Award aria-hidden />
          {t("daily.weekMe", {
            total: week.me.total,
            rank: week.me.rank,
            players: Math.max(week.players, week.me.rank),
          })}
          {myReward ? <b className={styles.reward}>{t(myReward)}</b> : null}
        </p>
      ) : null}

      <h3 className={styles.subTitle}>
        <Trophy aria-hidden /> {t("daily.weekLeaderboard")}
      </h3>
      {week.leaderboard.length === 0 ? (
        <p className={styles.empty}>{t("daily.weekEmpty")}</p>
      ) : (
        <ol>
          {week.leaderboard.map((entry, index) => (
            <li key={`${entry.name}-${index}`} data-podium={index < 3 ? index + 1 : undefined}>
              <span className={styles.position}>{index + 1}</span>
              <span className={styles.playerName}>{entry.name}</span>
              <span className={styles.playerTime}>
                {t("daily.weekDays", { count: entry.days })}
              </span>
              <strong>{entry.total}</strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function LetterProfile({ profile }: { profile: Profile }) {
  const { t } = useLanguage();

  return (
    <section className={styles.leaderboard}>
      <h2>
        <Star aria-hidden /> {t("daily.profileTitle")}
      </h2>
      <p className={styles.empty}>
        {t("daily.profileBody", { score: profile.expertScore })}
      </p>
      <p className={styles.profileStats}>
        <span>{t("daily.profileDays", { count: profile.daysPlayed })}</span>
        <span>{t("daily.profileBest", { score: profile.bestScore })}</span>
      </p>
      <ul className={styles.letterProfile}>
        {PLAYABLE_LETTERS.map((letter) => {
          const best = profile.letters[letter];
          const expert = best !== undefined && best >= profile.expertScore;
          return (
            <li
              key={letter}
              data-played={best !== undefined || undefined}
              data-expert={expert || undefined}
              title={
                best === undefined
                  ? t("daily.notPlayed")
                  : expert
                    ? `${t("daily.expert")} · ${best}`
                    : String(best)
              }
            >
              <b>{letter}</b>
              <small>{best ?? "–"}</small>
              {expert ? <Star className={styles.expertStar} aria-label={t("daily.expert")} /> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
