import { GameRoom } from "@/components/game/game-room";
import { isVoiceConfigured } from "@/lib/server/voice";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <GameRoom code={code.toUpperCase()} voiceEnabled={isVoiceConfigured()} />
  );
}
