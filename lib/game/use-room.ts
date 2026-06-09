"use client";

import { useCallback, useEffect, useState } from "react";

import {
  readPlayerSession,
  readRoom,
} from "./storage";
import type { PlayerSession, Room } from "./types";

export function useRoom(code: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const nextRoom = await readRoom(code);
      setRoom((currentRoom) =>
        currentRoom &&
        nextRoom &&
        currentRoom.updatedAt > nextRoom.updatedAt
          ? currentRoom
          : nextRoom,
      );
      setSession(readPlayerSession(code));
    } catch {
      // Keep the latest room state during a temporary network failure.
    } finally {
      setIsLoading(false);
    }
  }, [code]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);

    function handleLocalUpdate(event: Event) {
      const roomEvent = event as CustomEvent<Room>;
      if (roomEvent.detail.code === code) {
        setRoom((currentRoom) =>
          currentRoom && currentRoom.updatedAt > roomEvent.detail.updatedAt
            ? currentRoom
            : roomEvent.detail,
        );
      }
    }

    function handleRealtimeUpdate() {
      void refresh();
    }

    window.addEventListener("stop-room-update", handleLocalUpdate);
    window.addEventListener("focus", handleRealtimeUpdate);
    window.addEventListener("online", handleRealtimeUpdate);

    return () => {
      window.clearTimeout(initialRefresh);
      window.removeEventListener("stop-room-update", handleLocalUpdate);
      window.removeEventListener("focus", handleRealtimeUpdate);
      window.removeEventListener("online", handleRealtimeUpdate);
    };
  }, [code, refresh]);

  useEffect(() => {
    if (!room?.code) return;

    const events = new EventSource(`/api/rooms/${room.code}/events`);
    const handleRealtimeUpdate = () => void refresh();

    events.addEventListener("connected", handleRealtimeUpdate);
    events.addEventListener("room-updated", handleRealtimeUpdate);

    return () => {
      events.close();
      events.removeEventListener("connected", handleRealtimeUpdate);
      events.removeEventListener("room-updated", handleRealtimeUpdate);
    };
  }, [refresh, room?.code]);

  return { room, session, isLoading, refresh };
}
