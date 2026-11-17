"use client";

import { useEffect, useRef, useState } from "react";

import {
  readRoomReactions,
  sendRoomReaction,
  type RoomReaction,
} from "@/lib/game/storage";
import type { Player, PlayerSession } from "@/lib/game/types";
import { useLanguage } from "@/lib/i18n/language-provider";
import styles from "./reaction-bar.module.css";

const EMOJIS = ["🔥", "😂", "👏", "😮", "💀", "🤯"] as const;
const POLL_MS = 2_000;
const BUBBLE_MS = 3_200;

type Bubble = RoomReaction & { left: number };

/** Emoji reactions that float up for everyone in the room. */
export function ReactionBar({
  roomCode,
  players,
  session,
}: {
  roomCode: string;
  players: Player[];
  session: PlayerSession;
}) {
  const { t } = useLanguage();
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const sinceRef = useRef(0);
  const seenRef = useRef(new Set<string>());
  const names = new Map(players.map((player) => [player.id, player.name]));

  function show(reaction: RoomReaction) {
    if (seenRef.current.has(reaction.id)) return;
    seenRef.current.add(reaction.id);
    const bubble = { ...reaction, left: 10 + Math.random() * 75 };
    setBubbles((current) => [...current.slice(-12), bubble]);
    window.setTimeout(
      () => setBubbles((current) => current.filter((item) => item.id !== bubble.id)),
      BUBBLE_MS,
    );
  }

  const showRef = useRef(show);
  useEffect(() => {
    showRef.current = show;
  });

  useEffect(() => {
    let cancelled = false;
    let timeout: number | undefined;

    async function poll() {
      try {
        const data = await readRoomReactions(roomCode, sinceRef.current);
        if (cancelled) return;
        // Skip the backlog on first load; show only new reactions.
        if (sinceRef.current > 0) {
          for (const reaction of data.reactions) {
            if (reaction.playerId !== session.id) showRef.current(reaction);
          }
        }
        sinceRef.current = data.reactions.at(-1)?.createdAt ?? data.serverNow;
      } catch {
        // Reactions are decorative; ignore network hiccups.
      }
      if (!cancelled) timeout = window.setTimeout(poll, POLL_MS);
    }

    void poll();
    return () => {
      cancelled = true;
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [roomCode, session.id]);

  async function react(emoji: string) {
    showRef.current({
      id: `local-${crypto.randomUUID()}`,
      playerId: session.id,
      emoji,
      createdAt: 0, // local echo; the server keeps the real timestamp
    });
    try {
      await sendRoomReaction(roomCode, emoji);
    } catch {
      // Already shown locally; nothing else to do.
    }
  }

  return (
    <>
      <div className={styles.stage} aria-hidden>
        {bubbles.map((bubble) => (
          <span className={styles.bubble} key={bubble.id} style={{ left: `${bubble.left}%` }}>
            <b>{bubble.emoji}</b>
            <small>{names.get(bubble.playerId) ?? ""}</small>
          </span>
        ))}
      </div>
      <div className={styles.bar} role="group" aria-label={t("reactions.label")}>
        {EMOJIS.map((emoji) => (
          <button
            aria-label={`${t("reactions.label")} ${emoji}`}
            key={emoji}
            onClick={() => void react(emoji)}
            type="button"
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
}
