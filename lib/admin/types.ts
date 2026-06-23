import type { RoomStatus } from "@/lib/game/types";

export type WeeklyRankingEntry = {
  name: string;
  points: number;
  wins: number;
  gamesCompleted: number;
  roundsPlayed: number;
  lastPlayedAt: number;
};

export type WeeklyRankingSnapshot = {
  generatedAt: number;
  since: number;
  ranking: WeeklyRankingEntry[];
};

export type AdminRoomSummary = {
  code: string;
  status: RoomStatus;
  players: number;
  onlinePlayers: number;
  currentRound: number | null;
  roundsToPlay: number;
  hostName: string | null;
  updatedAt: number;
};

export type AdminUsageSummary = {
  totalRooms: number;
  activeRooms: number;
  finishedRooms: number;
  onlinePlayers: number;
  totalPlayers: number;
  uniquePlayerNames: number;
  roundsPlayed: number;
  answersSubmitted: number;
  doubtfulAnswers: number;
  pendingVotes: number;
  votesCast: number;
  weeklyFinishedRooms: number;
};

export type ServerErrorEvent = {
  id: string;
  scope: string;
  name: string;
  message: string;
  occurredAt: number;
};

export type AdminDashboardStats = {
  generatedAt: number;
  since: number;
  database: "postgresql" | "sqlite";
  usage: AdminUsageSummary;
  activeRooms: AdminRoomSummary[];
  recentFinishedRooms: AdminRoomSummary[];
  weeklyRanking: WeeklyRankingEntry[];
  recentErrors: ServerErrorEvent[];
};
