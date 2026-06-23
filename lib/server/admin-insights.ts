import "server-only";

import type {
  AdminDashboardStats,
  AdminRoomSummary,
  ServerErrorEvent,
  WeeklyRankingEntry,
  WeeklyRankingSnapshot,
} from "@/lib/admin/types";
import { getPlayerTotal } from "@/lib/game/scoring";
import type { Room, RoundState } from "@/lib/game/types";

const WEEK = 7 * 24 * 60 * 60 * 1000;

function normalizedPlayerName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-AO");
}

function displayPlayerName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function uniqueRounds(room: Room) {
  const rounds = new Map<number, RoundState>();

  for (const round of room.history) rounds.set(round.number, round);
  if (room.round) rounds.set(room.round.number, room.round);

  return [...rounds.values()];
}

function roomSummary(room: Room): AdminRoomSummary {
  return {
    code: room.code,
    status: room.status,
    players: room.players.length,
    onlinePlayers: room.players.filter((player) => player.isOnline).length,
    currentRound: room.round?.number ?? null,
    roundsToPlay: room.settings.roundsToPlay,
    hostName:
      room.players.find((player) => player.id === room.hostId)?.name ?? null,
    updatedAt: room.updatedAt,
  };
}

function activeRooms(rooms: Room[]) {
  return rooms.filter((room) => room.status !== "finished");
}

export function weeklyWindowStart(now = Date.now()) {
  return now - WEEK;
}

export function buildWeeklyRankingSnapshot(
  rooms: Room[],
  now = Date.now(),
): WeeklyRankingSnapshot {
  const since = weeklyWindowStart(now);
  const entries = new Map<string, WeeklyRankingEntry>();

  for (const room of rooms) {
    if (room.status !== "finished" || room.updatedAt < since) continue;

    const totals = room.players.map((player) => ({
      player,
      points: getPlayerTotal(room.history, player.id),
      roundsPlayed: room.history.filter(
        (round) => round.result?.players[player.id],
      ).length,
    }));
    const winningScore = Math.max(...totals.map((total) => total.points), 0);

    for (const total of totals) {
      const key = normalizedPlayerName(total.player.name);
      if (!key) continue;

      const entry = entries.get(key) ?? {
        name: displayPlayerName(total.player.name),
        points: 0,
        wins: 0,
        gamesCompleted: 0,
        roundsPlayed: 0,
        lastPlayedAt: 0,
      };

      entry.points += total.points;
      entry.wins += winningScore > 0 && total.points === winningScore ? 1 : 0;
      entry.gamesCompleted += 1;
      entry.roundsPlayed += total.roundsPlayed;
      entry.lastPlayedAt = Math.max(entry.lastPlayedAt, room.updatedAt);
      entries.set(key, entry);
    }
  }

  return {
    generatedAt: now,
    since,
    ranking: [...entries.values()]
      .sort(
        (left, right) =>
          right.points - left.points ||
          right.wins - left.wins ||
          right.gamesCompleted - left.gamesCompleted ||
          left.name.localeCompare(right.name, "pt-AO"),
      )
      .slice(0, 20),
  };
}

export function buildAdminDashboardStats({
  rooms,
  database,
  recentErrors,
  now = Date.now(),
}: {
  rooms: Room[];
  database: AdminDashboardStats["database"];
  recentErrors: ServerErrorEvent[];
  now?: number;
}): AdminDashboardStats {
  const since = weeklyWindowStart(now);
  const weeklyRanking = buildWeeklyRankingSnapshot(rooms, now);
  const playerNames = new Set<string>();

  let roundsPlayed = 0;
  let answersSubmitted = 0;
  let doubtfulAnswers = 0;
  let pendingVotes = 0;
  let votesCast = 0;

  for (const room of rooms) {
    for (const player of room.players) {
      const key = normalizedPlayerName(player.name);
      if (key) playerNames.add(key);
    }

    for (const round of uniqueRounds(room)) {
      if (round.result) roundsPlayed += 1;
      for (const answers of Object.values(round.answers)) {
        answersSubmitted += Object.values(answers).filter((answer) =>
          answer.trim(),
        ).length;
      }
      for (const challenge of Object.values(round.result?.challenges ?? {})) {
        if (challenge.status === "pending") pendingVotes += 1;
        votesCast += Object.keys(challenge.votes).length;
      }
      for (const playerResult of Object.values(round.result?.players ?? {})) {
        doubtfulAnswers += Object.values(playerResult.answers).filter(
          (answer) => answer.validation === "doubtful",
        ).length;
      }
    }
  }

  const active = activeRooms(rooms);
  const finished = rooms.filter((room) => room.status === "finished");

  return {
    generatedAt: now,
    since,
    database,
    usage: {
      totalRooms: rooms.length,
      activeRooms: active.length,
      finishedRooms: finished.length,
      onlinePlayers: rooms.reduce(
        (total, room) =>
          total + room.players.filter((player) => player.isOnline).length,
        0,
      ),
      totalPlayers: rooms.reduce(
        (total, room) => total + room.players.length,
        0,
      ),
      uniquePlayerNames: playerNames.size,
      roundsPlayed,
      answersSubmitted,
      doubtfulAnswers,
      pendingVotes,
      votesCast,
      weeklyFinishedRooms: finished.filter((room) => room.updatedAt >= since)
        .length,
    },
    activeRooms: active.slice(0, 12).map(roomSummary),
    recentFinishedRooms: finished.slice(0, 8).map(roomSummary),
    weeklyRanking: weeklyRanking.ranking,
    recentErrors,
  };
}
