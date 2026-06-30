"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { trackGameEvent } from "@/lib/analytics/game-events";
import {
  PRESENCE_HEARTBEAT_INTERVAL,
  ROOM_REALTIME_STALE_AFTER,
  ROOM_SYNC_ACTIVE_CONNECTED_POLL_INTERVAL,
  ROOM_SYNC_ACTIVE_POLL_INTERVAL,
  ROOM_SYNC_FALLBACK_POLL_INTERVAL,
  ROOM_SYNC_LOBBY_CONNECTED_POLL_INTERVAL,
  ROOM_SYNC_HIDDEN_POLL_INTERVAL,
  ROOM_SYNC_LOBBY_POLL_INTERVAL,
  ROOM_SYNC_RESULTS_CONNECTED_POLL_INTERVAL,
  ROOM_SYNC_POLL_INTERVAL,
  ROOM_SYNC_RESULTS_POLL_INTERVAL,
} from "./constants";
import {
  readPlayerSession,
  readRoom,
  signalPlayerDisconnect,
  syncPlayerPresence,
} from "./storage";
import type { PlayerSession, Room } from "./types";

export type RoomConnectionStatus = "connected" | "reconnecting" | "offline";

type RoomRealtimePayload = {
  code: string;
  updatedAt?: number;
};

export function useRoom(code: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] =
    useState<RoomConnectionStatus>("connected");
  const roomRef = useRef<Room | null>(null);
  const lastRealtimeAtRef = useRef(0);
  const trackedRealtimeErrorRef = useRef(false);
  const trackedRoomStateRef = useRef("");

  const applyRoomUpdate = useCallback((nextRoom: Room | null) => {
    setRoom((currentRoom) => {
      const resolvedRoom =
        currentRoom && nextRoom && currentRoom.updatedAt > nextRoom.updatedAt
          ? currentRoom
          : nextRoom;

      roomRef.current = resolvedRoom;
      return resolvedRoom;
    });
  }, []);

  const markConnectionFailure = useCallback(() => {
    setConnectionStatus(navigator.onLine ? "reconnecting" : "offline");
  }, []);

  const refresh = useCallback(async () => {
    try {
      const nextRoom = await readRoom(code);
      applyRoomUpdate(nextRoom);
      setSession(readPlayerSession(code));
      setConnectionStatus("connected");
      return true;
    } catch {
      markConnectionFailure();
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [applyRoomUpdate, code, markConnectionFailure]);

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
        applyRoomUpdate(roomEvent.detail);
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
  }, [applyRoomUpdate, code, reconnect, refresh]);

  useEffect(() => {
    if (!room?.code) return;

    const events = new EventSource(`/api/rooms/${room.code}/events`);
    const markRealtimeHealthy = () => {
      lastRealtimeAtRef.current = Date.now();
      setConnectionStatus("connected");
    };
    const handleConnected = () => {
      markRealtimeHealthy();
    };
    const handleHeartbeat = () => {
      markRealtimeHealthy();
    };
    const handleRealtimeUpdate = (event: Event) => {
      markRealtimeHealthy();
      const payload = readRealtimePayload(event);
      const currentUpdatedAt = roomRef.current?.updatedAt ?? 0;

      if (payload?.updatedAt && payload.updatedAt <= currentUpdatedAt) {
        return;
      }

      void refresh();
    };
    const handleError = () => {
      if (!trackedRealtimeErrorRef.current) {
        trackedRealtimeErrorRef.current = true;
        trackGameEvent("room_realtime_error", {
          online: navigator.onLine,
        });
      }
      markConnectionFailure();
    };

    events.addEventListener("connected", handleConnected);
    events.addEventListener("heartbeat", handleHeartbeat);
    events.addEventListener("room-updated", handleRealtimeUpdate);
    events.addEventListener("error", handleError);

    return () => {
      events.close();
      events.removeEventListener("connected", handleConnected);
      events.removeEventListener("heartbeat", handleHeartbeat);
      events.removeEventListener("room-updated", handleRealtimeUpdate);
      events.removeEventListener("error", handleError);
    };
  }, [markConnectionFailure, refresh, room?.code]);

  useEffect(() => {
    if (!room) return;

    const stateKey = `${room.status}:${room.round?.number ?? 0}`;
    if (trackedRoomStateRef.current === stateKey) return;
    trackedRoomStateRef.current = stateKey;

    trackGameEvent("room_status_seen", {
      categories: room.settings.categories.length,
      online_players: room.players.filter((player) => player.isOnline).length,
      players: room.players.length,
      round: room.round?.number ?? 0,
      status: room.status,
    });
  }, [room]);

  useEffect(() => {
    if (!room?.code) return;

    let cancelled = false;
    let poll: number | undefined;

    function getNextPollDelay() {
      if (document.visibilityState === "hidden") {
        return ROOM_SYNC_HIDDEN_POLL_INTERVAL;
      }

      const currentRoom = roomRef.current;
      const realtimeIsFresh =
        connectionStatus === "connected" &&
        Date.now() - lastRealtimeAtRef.current < ROOM_REALTIME_STALE_AFTER;

      if (currentRoom?.status === "round") {
        return realtimeIsFresh
          ? ROOM_SYNC_ACTIVE_CONNECTED_POLL_INTERVAL
          : ROOM_SYNC_ACTIVE_POLL_INTERVAL;
      }

      if (currentRoom?.status === "letter-selection") {
        return realtimeIsFresh
          ? ROOM_SYNC_ACTIVE_CONNECTED_POLL_INTERVAL
          : ROOM_SYNC_ACTIVE_POLL_INTERVAL;
      }

      if (currentRoom?.status === "lobby") {
        return realtimeIsFresh
          ? ROOM_SYNC_LOBBY_CONNECTED_POLL_INTERVAL
          : ROOM_SYNC_LOBBY_POLL_INTERVAL;
      }

      if (currentRoom?.status === "results") {
        return realtimeIsFresh
          ? ROOM_SYNC_RESULTS_CONNECTED_POLL_INTERVAL
          : ROOM_SYNC_RESULTS_POLL_INTERVAL;
      }

      return realtimeIsFresh
        ? ROOM_SYNC_POLL_INTERVAL
        : ROOM_SYNC_FALLBACK_POLL_INTERVAL;
    }

    async function refreshAfterDelay() {
      if (navigator.onLine) {
        await refresh();
      }

      if (!cancelled) {
        poll = window.setTimeout(refreshAfterDelay, getNextPollDelay());
      }
    }

    poll = window.setTimeout(refreshAfterDelay, getNextPollDelay());

    return () => {
      cancelled = true;
      if (poll !== undefined) window.clearTimeout(poll);
    };
  }, [
    connectionStatus,
    refresh,
    room?.code,
    room?.round?.number,
    room?.round?.result?.votingComplete,
    room?.status,
  ]);

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

function readRealtimePayload(event: Event): RoomRealtimePayload | null {
  const data = (event as MessageEvent<string>).data;
  if (!data) return null;

  try {
    const payload = JSON.parse(data) as RoomRealtimePayload;
    return typeof payload.code === "string" ? payload : null;
  } catch {
    return null;
  }
}
