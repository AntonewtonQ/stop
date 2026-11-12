import {
  castAnswerVote,
  chooseRoundLetter,
  finishGame,
  finishRound,
  normalizeRoomCode,
  prepareNextRound,
  saveRoundAnswers,
  startRematch,
  startFirstRound,
  updateRoomSettings,
} from "@/lib/game/engine";
import type { AnswerVote, Room, RoomSettings } from "@/lib/game/types";
import {
  enforceRateLimit,
  handleRouteError,
  jsonNoStore,
  parseActor,
  parseAnswers,
  readJsonBody,
} from "@/lib/server/http";
import { RATE_LIMITS } from "@/lib/server/rate-limit";
import { publishRoomUpdate } from "@/lib/server/realtime";
import {
  mutateStoredRoom,
  RoomRepositoryError,
  saveStoredRoundAnswers,
} from "@/lib/server/room-repository";
import { getRoomView } from "@/lib/server/room-view";

export const runtime = "nodejs";

type ActionBody = {
  actor?: unknown;
  type?: unknown;
  payload?: Record<string, unknown>;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code: rawCode } = await params;
    const code = normalizeRoomCode(rawCode);
    const body = await readJsonBody<ActionBody>(request);
    const actor = parseActor(body.actor);
    enforceRateLimit(request, RATE_LIMITS.roomAction, actor.id);

    if (body.type === "save-answers") {
      // Answers stay private while the clock runs: no realtime broadcast.
      const room = await saveStoredRoundAnswers(
        code,
        actor.id,
        actor.token,
        parseAnswers(body.payload?.answers),
      );

      return jsonNoStore({ room: getRoomView(room, actor.id) });
    }

    const action = parseAction(body);
    const room = await mutateStoredRoom(code, actor.id, actor.token, action);
    publishRoomUpdate(room.code, room.updatedAt);

    return jsonNoStore({ room: getRoomView(room, actor.id) });
  } catch (error) {
    return handleRouteError("api.rooms.actions", error);
  }
}

function parseAction(body: ActionBody) {
  const payload = body.payload ?? {};

  switch (body.type) {
    case "update-settings": {
      const settings: Partial<
        Pick<RoomSettings, "categories" | "roundDuration" | "roundsToPlay">
      > = {};

      if (Array.isArray(payload.categories)) {
        settings.categories = payload.categories.filter(
          (category): category is string => typeof category === "string",
        );
      }
      if (typeof payload.roundDuration === "number") {
        settings.roundDuration = payload.roundDuration;
      }
      if (typeof payload.roundsToPlay === "number") {
        settings.roundsToPlay = payload.roundsToPlay;
      }

      return (room: Room, actorId: string) =>
        updateRoomSettings(room, actorId, settings);
    }
    case "start-game":
      return startFirstRound;
    case "choose-letter":
      return (room: Room, actorId: string) =>
        chooseRoundLetter(room, actorId, String(payload.letter ?? ""));
    case "save-answers":
      return (room: Room, actorId: string) =>
        saveRoundAnswers(room, actorId, parseAnswers(payload.answers));
    case "finish-round":
      return (room: Room, actorId: string) => {
        const roomWithFinalAnswers =
          payload.answers === undefined
            ? room
            : saveRoundAnswers(room, actorId, parseAnswers(payload.answers));

        return finishRound(
          roomWithFinalAnswers,
          payload.timedOut === true ? null : actorId,
        );
      };
    case "vote":
      return (room: Room, actorId: string) =>
        castAnswerVote(
          room,
          actorId,
          String(payload.challengeId ?? ""),
          parseVote(payload.vote),
        );
    case "prepare-next-round":
      return prepareNextRound;
    case "finish-game":
      return finishGame;
    case "rematch":
    case "restart-game":
      return startRematch;
    default:
      throw new RoomRepositoryError("Esta acção não é válida.", 400);
  }
}

function parseVote(value: unknown): AnswerVote {
  if (value !== "approve" && value !== "reject") {
    throw new RoomRepositoryError("Este voto não é válido.", 400);
  }

  return value;
}
