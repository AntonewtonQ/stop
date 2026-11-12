"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Headphones,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import type { Room as VoiceRoom } from "livekit-client";

import { Button } from "@/components/ui/button";
import { requestVoiceAccess } from "@/lib/game/storage";
import type { Player } from "@/lib/game/types";
import { useLanguage } from "@/lib/i18n/language-provider";
import styles from "./voice-chat.module.css";

type VoiceStatus = "idle" | "connecting" | "connected";

type VoiceParticipant = {
  id: string;
  isMuted: boolean;
};

export function VoiceChat({
  code,
  players,
}: {
  code: string;
  players: Player[];
}) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [micEnabled, setMicEnabled] = useState(false);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [speakingIds, setSpeakingIds] = useState<Set<string>>(new Set());
  const [audioBlocked, setAudioBlocked] = useState(false);
  const roomRef = useRef<VoiceRoom | null>(null);
  const audioContainerRef = useRef<HTMLDivElement>(null);

  const resetState = useCallback(() => {
    roomRef.current = null;
    setStatus("idle");
    setMicEnabled(false);
    setParticipants([]);
    setSpeakingIds(new Set());
    setAudioBlocked(false);
    audioContainerRef.current?.replaceChildren();
  }, []);

  const leave = useCallback(() => {
    const room = roomRef.current;
    resetState();
    void room?.disconnect();
  }, [resetState]);

  useEffect(() => () => void roomRef.current?.disconnect(), []);

  async function join() {
    if (status !== "idle") return;
    setStatus("connecting");

    try {
      const [{ Room, RoomEvent, Track }, access] = await Promise.all([
        import("livekit-client"),
        requestVoiceAccess(code),
      ]);
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      roomRef.current = room;

      const syncParticipants = () => {
        const all = [room.localParticipant, ...room.remoteParticipants.values()];
        setParticipants(
          all.map((participant) => ({
            id: participant.identity,
            isMuted: !participant.isMicrophoneEnabled,
          })),
        );
      };

      room
        .on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind !== Track.Kind.Audio) return;
          audioContainerRef.current?.append(track.attach());
        })
        .on(RoomEvent.TrackUnsubscribed, (track) => {
          for (const element of track.detach()) element.remove();
        })
        .on(RoomEvent.ParticipantConnected, syncParticipants)
        .on(RoomEvent.ParticipantDisconnected, syncParticipants)
        .on(RoomEvent.TrackMuted, syncParticipants)
        .on(RoomEvent.TrackUnmuted, syncParticipants)
        .on(RoomEvent.LocalTrackPublished, syncParticipants)
        .on(RoomEvent.LocalTrackUnpublished, syncParticipants)
        .on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          setSpeakingIds(new Set(speakers.map((speaker) => speaker.identity)));
        })
        .on(RoomEvent.AudioPlaybackStatusChanged, () => {
          setAudioBlocked(!room.canPlaybackAudio);
        })
        .on(RoomEvent.Disconnected, () => {
          if (roomRef.current === room) resetState();
        });

      await room.connect(access.url, access.token);
      if (roomRef.current !== room) return;

      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        setMicEnabled(true);
      } catch {
        toast.warning(t("voice.micBlocked"));
      }

      setAudioBlocked(!room.canPlaybackAudio);
      syncParticipants();
      setStatus("connected");
    } catch (error) {
      console.error(error);
      toast.error(t("voice.connectError"));
      leave();
    }
  }

  async function toggleMic() {
    const room = roomRef.current;
    if (!room) return;

    try {
      await room.localParticipant.setMicrophoneEnabled(!micEnabled);
      setMicEnabled(!micEnabled);
    } catch {
      toast.warning(t("voice.micBlocked"));
    }
  }

  async function unlockAudio() {
    await roomRef.current?.startAudio();
    setAudioBlocked(!(roomRef.current?.canPlaybackAudio ?? true));
  }

  const playersById = new Map(players.map((player) => [player.id, player]));

  return (
    <div className={styles.dock}>
      <div ref={audioContainerRef} hidden />

      {status !== "connected" ? (
        <Button
          aria-label={t("voice.join")}
          className={styles.joinButton}
          disabled={status === "connecting"}
          onClick={() => void join()}
          type="button"
          variant="outline"
        >
          {status === "connecting" ? (
            <Loader2 className={styles.spin} />
          ) : (
            <Headphones />
          )}
          <span>
            {t(status === "connecting" ? "voice.connecting" : "voice.join")}
          </span>
        </Button>
      ) : (
        <div className={styles.panel} role="group" aria-label={t("voice.title")}>
          <ul className={styles.people} aria-label={t("voice.inCall")}>
            {participants.map((participant) => {
              const player = playersById.get(participant.id);
              const speaking = speakingIds.has(participant.id);
              const name = player?.name ?? "?";

              return (
                <li
                  key={participant.id}
                  className={styles.person}
                  data-speaking={speaking || undefined}
                  data-muted={participant.isMuted || undefined}
                  style={{ background: player?.color }}
                  title={
                    participant.isMuted ? `${name} · ${t("voice.muted")}` : name
                  }
                >
                  {player?.initials ?? "?"}
                  {participant.isMuted ? (
                    <MicOff className={styles.mutedBadge} aria-hidden />
                  ) : null}
                </li>
              );
            })}
          </ul>

          {audioBlocked ? (
            <Button
              aria-label={t("voice.enableAudio")}
              className={styles.iconButton}
              onClick={() => void unlockAudio()}
              title={t("voice.enableAudio")}
              type="button"
              variant="outline"
            >
              <Volume2 />
            </Button>
          ) : null}

          <Button
            aria-label={t(micEnabled ? "voice.mute" : "voice.unmute")}
            aria-pressed={!micEnabled}
            className={styles.iconButton}
            data-off={!micEnabled || undefined}
            onClick={() => void toggleMic()}
            title={t(micEnabled ? "voice.mute" : "voice.unmute")}
            type="button"
            variant="outline"
          >
            {micEnabled ? <Mic /> : <MicOff />}
          </Button>

          <Button
            aria-label={t("voice.leave")}
            className={styles.leaveButton}
            onClick={leave}
            title={t("voice.leave")}
            type="button"
          >
            <PhoneOff />
          </Button>
        </div>
      )}
    </div>
  );
}
