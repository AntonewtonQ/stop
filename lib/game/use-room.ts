"use client";

import { useCallback, useEffect, useState } from "react";

import { PRESENCE_HEARTBEAT_INTERVAL } from "./constants";
import {
  readPlayerSession,
  readRoom,
  signalPlayerDisconnect,
  syncPlayerPresence,
} from "./storage";
import type { PlayerSession, Room } from "./types";

export type RoomConnectionStatus = "connected" | "reconnecting" | "offline";

export function useRoom(code: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] =
    useState<RoomConnectionStatus>("connected");

  const markConnectionFailure = useCallback(() => {
    setConnectionStatus(navigator.onLine ? "reconnecting" : "offline");
  }, []);

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
      setConnectionStatus("connected");
      return true;
    } catch {
      markConnectionFailure();
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [code, markConnectionFailure]);

  const reconnect = useCallback(async () => {
    setConnectionStatus(navigator.onLine ? "reconnecting" : "offline");
    if (!navigator.onLine) return false;

    try {
      if (readPlayerSession(code)) await syncPlayerPresence(code);
    } catch {
      markConnectionFailure();
    }

    return refresh();
  }, [code, markConnectionFailure, refresh]);

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

    function handleOnline() {
      void reconnect();
    }

    function handleOffline() {
      setConnectionStatus("offline");
    }

    window.addEventListener("stop-room-update", handleLocalUpdate);
    window.addEventListener("focus", handleOnline);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.clearTimeout(initialRefresh);
      window.removeEventListener("stop-room-update", handleLocalUpdate);
      window.removeEventListener("focus", handleOnline);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [code, reconnect, refresh]);

  useEffect(() => {
    if (!room?.code) return;

    const events = new EventSource(`/api/rooms/${room.code}/events`);
    const handleConnected = () => {
      setConnectionStatus("connected");
      void refresh();
    };
    const handleRealtimeUpdate = () => void refresh();
    const handleError = () => markConnectionFailure();

    events.addEventListener("connected", handleConnected);
    events.addEventListener("room-updated", handleRealtimeUpdate);
    events.addEventListener("error", handleError);

    return () => {
      events.close();
      events.removeEventListener("connected", handleConnected);
      events.removeEventListener("room-updated", handleRealtimeUpdate);
      events.removeEventListener("error", handleError);
    };
  }, [markConnectionFailure, refresh, room?.code]);

  useEffect(() => {
    if (!room?.code || !session) return;

    const roomCode = room.code;

    function markOnline() {
      void syncPlayerPresence(roomCode)
        .then(() => setConnectionStatus("connected"))
        .catch(markConnectionFailure);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") markOnline();
    }

    markOnline();
    const heartbeat = window.setInterval(
      markOnline,
      PRESENCE_HEARTBEAT_INTERVAL,
    );
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const handlePageHide = () => signalPlayerDisconnect(roomCode);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [markConnectionFailure, room?.code, session]);

  return {
    room,
    session,
    isLoading,
    connectionStatus,
    reconnect,
    refresh,
  };
}
