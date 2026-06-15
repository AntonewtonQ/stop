import { getDatabase } from "@/lib/server/database-sqlite";
import {
  createRoom,
  joinRoom,
} from "@/lib/game/engine";
import type { PlayerSession, Room } from "@/lib/game/types";

let sequence = 0;

export function makeSession(name: string, roomCode: string): PlayerSession {
  const id = `${name.toLocaleLowerCase("pt-AO")}-${roomCode}`;

  return {
    id,
    name,
    initials: name.slice(0, 2).toUpperCase(),
    color: "#0F2D3D",
    avatarId: "spark",
    roomCode,
    token: `${id}-token`,
  };
}

export function makeRoomWithPlayers(names = ["Ana", "Beto", "Carla"]) {
  sequence += 1;
  const code = `T${sequence.toString().padStart(4, "0")}`;
  const sessions = names.map((name) => makeSession(name, code));
  let room = createRoom(code, sessions[0]);

  for (const session of sessions.slice(1)) {
    room = joinRoom(room, session);
  }

  return { code, room, sessions };
}

export function clearTestDatabase() {
  const database = getDatabase();
  database.exec("DELETE FROM rooms");
}

export function setPlayerOnline(room: Room, playerId: string, isOnline: boolean) {
  return {
    ...room,
    players: room.players.map((player) =>
      player.id === playerId ? { ...player, isOnline } : player,
    ),
  };
}
