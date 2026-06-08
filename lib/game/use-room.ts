"use client";

import { useCallback, useEffect, useState } from "react";

import {
  isRoomStorageKey,
  readPlayerSession,
  readRoom,
} from "./storage";
import type { PlayerSession, Room } from "./types";

export function useRoom(code: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    setRoom(readRoom(code));
    setSession(readPlayerSession(code));
    setIsLoading(false);
  }, [code]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(refresh, 0);

    function handleStorage(event: StorageEvent) {
      if (isRoomStorageKey(event.key, code)) refresh();
    }

    function handleLocalUpdate(event: Event) {
      const roomEvent = event as CustomEvent<Room>;
      if (roomEvent.detail.code === code) setRoom(roomEvent.detail);
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("stop-room-update", handleLocalUpdate);

    return () => {
      window.clearTimeout(initialRefresh);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("stop-room-update", handleLocalUpdate);
    };
  }, [code, refresh]);

  return { room, session, isLoading, refresh };
}
