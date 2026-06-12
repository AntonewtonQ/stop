"use client";

import { FormEvent, useEffect, useState } from "react";
import { History, Plus, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AvatarPicker } from "@/components/game/avatar-picker";
import { GameLoading } from "@/components/game/game-loading";
import { ProfileColorPicker } from "@/components/game/profile-color-picker";
import { ThemePicker } from "@/components/game/theme-picker";
import { DEFAULT_AVATAR_ID, type AvatarId } from "@/lib/game/avatars";
import {
  DEFAULT_PROFILE_COLOR,
  type ProfileColor,
} from "@/lib/game/profile-colors";
import {
  createPlayerSession,
  createRoom,
  joinRoom,
  makeRoomCode,
  normalizeRoomCode,
  readLastPlayerSession,
  readRoom,
  savePlayerSession,
} from "@/lib/game/storage";
import type { PlayerSession } from "@/lib/game/types";
import { useLanguage } from "@/lib/i18n/language-provider";
import styles from "./room-actions.module.css";

export function RoomActions() {
  const { errorMessage, t } = useLanguage();
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [avatarId, setAvatarId] = useState<AvatarId>(DEFAULT_AVATAR_ID);
  const [profileColor, setProfileColor] =
    useState<ProfileColor>(DEFAULT_PROFILE_COLOR);
  const [roomCode, setRoomCode] = useState("");
  const [message, setMessage] = useState("");
  const [recentSession, setRecentSession] = useState<PlayerSession | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "creating" | "joining" | null
  >(null);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setRecentSession(readLastPlayerSession()),
      0,
    );
    return () => window.clearTimeout(timeout);
  }, []);

  function validateName() {
    const name = playerName.trim();
    if (name.length >= 2) return name;

    const feedback = t("entry.nameFeedback");
    setMessage(feedback);
    toast.error(t("entry.nameMissing"), { description: feedback });
    return null;
  }

  async function handleCreateRoom() {
    if (pendingAction) return;
    const name = validateName();
    if (!name) return;

    const code = makeRoomCode();
    const session = createPlayerSession(name, code, avatarId, profileColor);
    setPendingAction("creating");

    try {
      await createRoom(code, session);
      savePlayerSession(session);
      toast.success(t("entry.roomCreated"), {
        description: t("entry.code", { code }),
      });
      router.push(`/sala/${code}`);
    } catch (error) {
      toast.error(t("entry.createFailed"), {
        description: errorMessage(error),
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleJoinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingAction) return;
    const name = validateName();
    if (!name) return;

    const code = normalizeRoomCode(roomCode);
    if (code.length < 4) {
      const feedback = t("entry.invalidCodeFeedback");
      setMessage(feedback);
      toast.error(t("entry.invalidCode"), { description: feedback });
      return;
    }

    let room;
    setPendingAction("joining");
    try {
      room = await readRoom(code);
    } catch (error) {
      toast.error(t("entry.findFailed"), {
        description: errorMessage(error),
      });
      setPendingAction(null);
      return;
    }
    if (!room) {
      const feedback = t("entry.roomUnavailableFeedback");
      setMessage(feedback);
      toast.error(t("entry.roomUnavailable"), { description: feedback });
      setPendingAction(null);
      return;
    }

    if (room.status !== "lobby") {
      const feedback = t("entry.gameStartedFeedback");
      setMessage(feedback);
      toast.error(t("entry.gameStarted"), { description: feedback });
      setPendingAction(null);
      return;
    }

    const session = createPlayerSession(name, code, avatarId, profileColor);

    try {
      await joinRoom(code, session);
      savePlayerSession(session);
      toast.success(t("entry.joined"), { description: code });
      router.push(`/sala/${code}`);
    } catch (error) {
      toast.error(t("entry.joinFailed"), {
        description: errorMessage(error),
      });
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className={styles.actions} aria-busy={Boolean(pendingAction)}>
      {pendingAction && (
        <div className={styles.loadingOverlay}>
          <GameLoading
            detail={`${t("landing.heroTitle")} ${t("landing.heroTitleAccent")}`}
            message={
              pendingAction === "creating"
                ? t("entry.creatingRoom")
                : t("entry.joiningRoom")
            }
          />
        </div>
      )}

      <label className={styles.nameField} htmlFor="player-name">
        <span>{t("entry.nameQuestion")}</span>
        <div>
          <UserRound aria-hidden="true" />
          <Input
            id="player-name"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder={t("entry.namePlaceholder")}
            maxLength={24}
            autoComplete="nickname"
            disabled={Boolean(pendingAction)}
          />
        </div>
      </label>

      <AvatarPicker
        value={avatarId}
        color={profileColor}
        onChange={setAvatarId}
      />
      <ProfileColorPicker value={profileColor} onChange={setProfileColor} />
      <ThemePicker />

      <div className={styles.mainAction}>
        <Button
          className={styles.createButton}
          type="button"
          onClick={handleCreateRoom}
          disabled={Boolean(pendingAction)}
        >
          <Plus data-icon="inline-start" />
          {t("entry.createRoom")}
        </Button>
      </div>

      {recentSession && (
        <Button
          className={styles.resumeButton}
          type="button"
          variant="outline"
          onClick={() => router.push(`/sala/${recentSession.roomCode}`)}
          disabled={Boolean(pendingAction)}
        >
          <History />
          {t("entry.resumeRoom", { code: recentSession.roomCode })}
        </Button>
      )}

      <div className={styles.divider}>
        <Separator className={styles.dividerLine} />
        <span>{t("entry.orJoin")}</span>
        <Separator className={styles.dividerLine} />
      </div>

      <form className={styles.joinForm} onSubmit={handleJoinRoom}>
        <label className={styles.srOnly} htmlFor="room-code">
          {t("entry.roomCode")}
        </label>
        <Input
          id="room-code"
          value={roomCode}
          onChange={(event) => setRoomCode(event.target.value)}
          placeholder={t("entry.codePlaceholder")}
          maxLength={8}
          autoComplete="off"
          disabled={Boolean(pendingAction)}
        />
        <Button type="submit" disabled={Boolean(pendingAction)}>
          {t("entry.joinRoom")}
        </Button>
      </form>

      <p className={styles.feedback} aria-live="polite">
        {message || t("entry.noInstall")}
      </p>
    </div>
  );
}
