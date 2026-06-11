"use client";

import { useEffect, useRef } from "react";

import type { Room, RoomStatus } from "./types";
import { playGameSound, unlockGameAudio } from "./sounds";

export function useGameSounds(room: Room | null) {
  const previousStatus = useRef<RoomStatus | null>(null);
  const status = room?.status ?? null;
  const stoppedBy = room?.round?.stoppedBy ?? null;
  const roundNumber = room?.round?.number ?? null;
  const startedAt = room?.round?.startedAt ?? null;
  const duration = room?.round?.duration ?? null;

  useEffect(() => {
    function unlock() {
      void unlockGameAudio();
    }

    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (!status) return;

    const previous = previousStatus.current;
    if (previous === "letter-selection" && status === "round") {
      playGameSound("start");
    } else if (
      previous === "round" &&
      status === "results" &&
      stoppedBy
    ) {
      playGameSound("stop");
    }

    previousStatus.current = status;
  }, [status, stoppedBy]);

  useEffect(() => {
    if (status !== "round" || startedAt === null || duration === null) return;

    const deadline = startedAt + duration * 1000;
    let lastSecond: number | null = null;
    const playLastSeconds = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      if (remaining >= 1 && remaining <= 5 && remaining !== lastSecond) {
        playGameSound("tick");
      }
      lastSecond = remaining;
    };

    playLastSeconds();
    const interval = window.setInterval(playLastSeconds, 200);
    return () => window.clearInterval(interval);
  }, [duration, roundNumber, startedAt, status]);
}
