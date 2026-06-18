import "server-only";

import type { Room } from "@/lib/game/types";

export function getRoomView(room: Room, viewerId?: string): Room {
  if (room.status !== "round" || !room.round) return room;

  const total = room.settings.categories.length;
  const answerProgress = Object.fromEntries(
    room.players.map((player) => {
      const answered = room.settings.categories.filter((category) =>
        room.round?.answers[player.id]?.[category]?.trim(),
      ).length;

      return [
        player.id,
        {
          playerId: player.id,
          answered,
          total,
          completed: answered === total,
        },
      ];
    }),
  );

  return {
    ...room,
    round: {
      ...room.round,
      answerProgress,
      answers: viewerId && room.round.answers[viewerId]
        ? { [viewerId]: room.round.answers[viewerId] }
        : {},
    },
  };
}
