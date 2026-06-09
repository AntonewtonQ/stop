import "server-only";

import type { Room } from "@/lib/game/types";

export function getRoomView(room: Room, viewerId?: string): Room {
  if (room.status !== "round" || !room.round) return room;

  return {
    ...room,
    round: {
      ...room.round,
      answers: viewerId && room.round.answers[viewerId]
        ? { [viewerId]: room.round.answers[viewerId] }
        : {},
    },
  };
}
