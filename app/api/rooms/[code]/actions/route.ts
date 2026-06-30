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
import type {
  AnswerVote,
  Room,
  RoomSettings,
  RoundAnswers,
} from "@/lib/game/types";
import {
  mutateStoredRoom,
  RoomRepositoryError,
  saveStoredRoundAnswers,
} from "@/lib/server/room-repository";
import { recordServerError } from "@/lib/server/admin-events";
import { getRoomView } from "@/lib/server/room-view";
import { publishRoomUpdate } from "@/lib/server/realtime";

export const runtime = "nodejs";

type ActionBody = {
  actor?: { id?: unknown; token?: unknown };
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
    const body = (await request.json()) as ActionBody;
    const actor = parseActor(body.actor);
    if (body.type === "save-answers") {
      const room = await saveStoredRoundAnswers(
        code,
        actor.id,
        actor.token,
        parseAnswers(body.payload?.answers),
      );

      return Response.json(
        { room: getRoomView(room, actor.id) },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const action = parseAction(body);
    const room = await mutateStoredRoom(code, actor.id, actor.token, action);
    publishRoomUpdate(room.code, room.updatedAt);

    return Response.json(
      { room: getRoomView(room, actor.id) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof RoomRepositoryError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    recordServerError("api.rooms.actions", error);
    console.error(error);
    return Response.json(
      { error: "Algo correu mal. Tenta novamente." },
      { status: 500 },
    );
  }
}

function parseActor(actor: ActionBody["actor"]) {
  if (
    !actor ||
    typeof actor.id !== "string" ||
    typeof actor.token !== "string"
  ) {
    throw new RoomRepositoryError(
      "A tua sessão expirou. Volta a entrar na sala.",
      401,
    );
  }

  return { id: actor.id, token: actor.token };
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

function parseAnswers(value: unknown): RoundAnswers {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RoomRepositoryError("Não conseguimos guardar as respostas.", 400);
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

function parseVote(value: unknown): AnswerVote {
  if (value !== "approve" && value !== "reject") {
    throw new RoomRepositoryError("Este voto não é válido.", 400);
  }

  return value;
}
