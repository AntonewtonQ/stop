import "server-only";

import { AccessToken } from "livekit-server-sdk";

/**
 * Voice chat is powered by LiveKit (https://livekit.io). The game server only
 * mints short-lived access tokens for authenticated players; audio flows
 * between browsers and the LiveKit SFU, never through this app.
 */

const TOKEN_TTL = "2h";

type VoiceConfig = { url: string; apiKey: string; apiSecret: string };

function readVoiceConfig(): VoiceConfig | null {
  const url = process.env.LIVEKIT_URL?.trim();
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();

  if (!url || !apiKey || !apiSecret) return null;
  return { url, apiKey, apiSecret };
}

export function isVoiceConfigured() {
  return readVoiceConfig() !== null;
}

export function getVoiceRoomName(roomCode: string) {
  return `jogastop-${roomCode}`;
}

export async function createVoiceAccess({
  roomCode,
  playerId,
  playerName,
}: {
  roomCode: string;
  playerId: string;
  playerName: string;
}) {
  const config = readVoiceConfig();
  if (!config) return null;

  const token = new AccessToken(config.apiKey, config.apiSecret, {
    identity: playerId,
    name: playerName,
    ttl: TOKEN_TTL,
  });

  token.addGrant({
    room: getVoiceRoomName(roomCode),
    roomJoin: true,
    canPublish: true,
    canPublishData: false,
    canSubscribe: true,
  });

  return { url: config.url, token: await token.toJwt() };
}
