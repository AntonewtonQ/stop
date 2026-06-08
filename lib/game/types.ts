export type RoomStatus = "lobby" | "round";

export type Player = {
  id: string;
  name: string;
  initials: string;
  color: string;
  isHost: boolean;
  joinedAt: number;
};

export type RoomSettings = {
  categories: string[];
  roundDuration: number;
};

export type RoundState = {
  number: number;
  letter: string;
  startedAt: number;
  duration: number;
};

export type Room = {
  code: string;
  hostId: string;
  status: RoomStatus;
  players: Player[];
  settings: RoomSettings;
  round: RoundState | null;
  updatedAt: number;
};

export type PlayerSession = Pick<Player, "id" | "name" | "initials" | "color"> & {
  roomCode: string;
};

export type RoundAnswers = Record<string, string>;
