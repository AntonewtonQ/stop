import "server-only";

import type { RoomSignature } from "./repository-shared";
import { getRoomSignature } from "./room-repository";

/**
 * Room change notifications for Server-Sent Events.
 *
 * Two sources feed the same listeners:
 *
 * 1. `publishRoomUpdate` — instant, but only reaches SSE connections held by
 *    the same server instance that handled the mutation.
 * 2. A per-room watcher that polls a tiny signature query (status, round,
 *    updated_at). This catches mutations handled by *other* instances, which
 *    is the normal case on serverless hosts such as Vercel. One watcher runs
 *    per room per instance, no matter how many clients are connected.
 *
 * Answer autosaves bump `updated_at` while a round is running, but answers are
 * private until STOP, so the watcher ignores plain `updated_at` changes during
 * a round and only reacts to status/round transitions there.
 */

export type RoomRealtimeEvent = {
  id: string;
  type: "room-updated";
  code: string;
  updatedAt: number;
};

type Listener = (event: RoomRealtimeEvent) => void;

type RoomWatcher = {
  timer: ReturnType<typeof setTimeout> | null;
  last: RoomSignature | null;
  stopped: boolean;
};

const DEFAULT_WATCH_INTERVAL_MS = 1_500;

const globalRealtime = globalThis as typeof globalThis & {
  stopRoomListeners?: Map<string, Set<Listener>>;
  stopRoomWatchers?: Map<string, RoomWatcher>;
};

function getListeners() {
  globalRealtime.stopRoomListeners ??= new Map<string, Set<Listener>>();
  return globalRealtime.stopRoomListeners;
}

function getWatchers() {
  globalRealtime.stopRoomWatchers ??= new Map<string, RoomWatcher>();
  return globalRealtime.stopRoomWatchers;
}

function getWatchInterval() {
  const value = Number(process.env.ROOM_REALTIME_WATCH_INTERVAL_MS);
  return Number.isFinite(value) && value >= 250
    ? value
    : DEFAULT_WATCH_INTERVAL_MS;
}

function emit(code: string, updatedAt: number) {
  const event: RoomRealtimeEvent = {
    id: `${updatedAt}-${crypto.randomUUID()}`,
    type: "room-updated",
    code,
    updatedAt,
  };

  for (const listener of getListeners().get(code) ?? []) {
    listener(event);
  }
}

export function hasMeaningfulChange(
  previous: RoomSignature | null,
  next: RoomSignature,
) {
  if (!previous) return false;
  if (previous.status !== next.status) return true;
  if (previous.roundNumber !== next.roundNumber) return true;
  if (next.updatedAt <= previous.updatedAt) return false;

  return next.status !== "round";
}

function startWatcher(code: string) {
  const watchers = getWatchers();
  if (watchers.has(code)) return;

  const watcher: RoomWatcher = { timer: null, last: null, stopped: false };
  watchers.set(code, watcher);

  async function tick() {
    if (watcher.stopped) return;

    try {
      const signature = await getRoomSignature(code);
      if (signature) {
        if (hasMeaningfulChange(watcher.last, signature)) {
          emit(code, signature.updatedAt);
        }
        watcher.last = signature;
      }
    } catch (error) {
      console.error(`Realtime watcher failed for room ${code}.`, error);
    }

    if (!watcher.stopped) schedule();
  }

  function schedule() {
    watcher.timer = setTimeout(() => void tick(), getWatchInterval());
    watcher.timer.unref?.();
  }

  void tick();
}

function stopWatcher(code: string) {
  const watchers = getWatchers();
  const watcher = watchers.get(code);
  if (!watcher) return;

  watcher.stopped = true;
  if (watcher.timer) clearTimeout(watcher.timer);
  watchers.delete(code);
}

export function publishRoomUpdate(code: string, updatedAt = Date.now()) {
  emit(code, updatedAt);
}

export function subscribeToRoom(code: string, listener: Listener) {
  const listeners = getListeners();
  const roomListeners = listeners.get(code) ?? new Set<Listener>();
  roomListeners.add(listener);
  listeners.set(code, roomListeners);
  startWatcher(code);

  return () => {
    roomListeners.delete(listener);
    if (roomListeners.size === 0) {
      listeners.delete(code);
      stopWatcher(code);
    }
  };
}
