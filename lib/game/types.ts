export type RoomStatus = "lobby" | "round" | "results" | "finished";

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
  roundsToPlay: number;
};

export type RoundAnswers = Record<string, string>;

export type AnswerScoreStatus =
  | "invalid"
  | "duplicate"
  | "correct"
  | "unique";

export type AnswerScore = {
  answer: string;
  points: 0 | 5 | 10 | 20;
  status: AnswerScoreStatus;
};

export type PlayerRoundScore = {
  playerId: string;
  answers: Record<string, AnswerScore>;
  total: number;
};

export type RoundResult = {
  endedAt: number;
  stoppedBy: string | null;
  players: Record<string, PlayerRoundScore>;
};

export type RoundState = {
  number: number;
  letter: string;
  startedAt: number;
  duration: number;
  stoppedAt: number | null;
  stoppedBy: string | null;
  answers: Record<string, RoundAnswers>;
  result: RoundResult | null;
};

export type Room = {
  code: string;
  hostId: string;
  status: RoomStatus;
  players: Player[];
  settings: RoomSettings;
  round: RoundState | null;
  history: RoundState[];
  updatedAt: number;
};

export type PlayerSession = Pick<Player, "id" | "name" | "initials" | "color"> & {
  roomCode: string;
};
