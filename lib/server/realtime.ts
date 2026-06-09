import "server-only";

export type RoomRealtimeEvent = {
  id: string;
  type: "room-updated";
  code: string;
  updatedAt: number;
};

type Listener = (event: RoomRealtimeEvent) => void;

const globalRealtime = globalThis as typeof globalThis & {
  stopRoomListeners?: Map<string, Set<Listener>>;
};

function getListeners() {
  globalRealtime.stopRoomListeners ??= new Map<string, Set<Listener>>();
  return globalRealtime.stopRoomListeners;
}

export function publishRoomUpdate(code: string, updatedAt = Date.now()) {
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

export function subscribeToRoom(code: string, listener: Listener) {
  const listeners = getListeners();
  const roomListeners = listeners.get(code) ?? new Set<Listener>();
  roomListeners.add(listener);
  listeners.set(code, roomListeners);

  return () => {
    roomListeners.delete(listener);
    if (roomListeners.size === 0) listeners.delete(code);
  };
}
