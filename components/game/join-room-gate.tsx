"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LogIn, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { AvatarPicker } from "@/components/game/avatar-picker";
import { ProfileColorPicker } from "@/components/game/profile-color-picker";
import { ThemePicker } from "@/components/game/theme-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PLAYABLE_LETTERS } from "@/lib/game/constants";
import { DEFAULT_AVATAR_ID, type AvatarId } from "@/lib/game/avatars";
import {
  DEFAULT_PROFILE_COLOR,
  type ProfileColor,
} from "@/lib/game/profile-colors";
import {
  createPlayerSession,
  joinRoom,
  savePlayerSession,
} from "@/lib/game/storage";
import type { Room } from "@/lib/game/types";
import { useLanguage } from "@/lib/i18n/language-provider";
import styles from "./game.module.css";

export function JoinRoomGate({
  room,
  onJoined,
}: {
  room: Room;
  onJoined: () => void | Promise<unknown>;
}) {
  const { errorMessage, t } = useLanguage();
  const [name, setName] = useState("");
  const [avatarId, setAvatarId] = useState<AvatarId>(DEFAULT_AVATAR_ID);
  const [profileColor, setProfileColor] =
    useState<ProfileColor>(DEFAULT_PROFILE_COLOR);

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (name.trim().length < 2) {
      toast.error(t("join.nameRequired"));
      return;
    }

    if (room.status !== "lobby") {
      toast.error(t("join.gameStarted"));
      return;
    }

    if (room.players.length >= PLAYABLE_LETTERS.length) {
      toast.error(t("join.roomFull"));
      return;
    }

    const session = createPlayerSession(
      name,
      room.code,
      avatarId,
      profileColor,
    );

    try {
      await joinRoom(room.code, session, "room_gate");
      savePlayerSession(session);
      toast.success(t("entry.joined"), { description: room.code });
      await onJoined();
    } catch (error) {
      toast.error(t("entry.joinFailed"), {
        description: errorMessage(error),
      });
    }
  }

  return (
    <main className={styles.gamePage}>
      <div className={styles.centeredCard}>
        <Logo />
        <span className={styles.eyebrow}>
          {t("common.room")} {room.code}
        </span>
        <h1>{t("join.title")}</h1>
        <p>{t("join.body")}</p>

        <form className={styles.joinGateForm} onSubmit={handleJoin}>
          <label htmlFor="guest-name">{t("join.nameLabel")}</label>
          <div className={styles.iconInput}>
            <UserRound />
            <Input
              id="guest-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("join.namePlaceholder")}
              maxLength={24}
              autoFocus
            />
          </div>
          <AvatarPicker
            value={avatarId}
            color={profileColor}
            onChange={setAvatarId}
          />
          <ProfileColorPicker value={profileColor} onChange={setProfileColor} />
          <ThemePicker />
          <Button type="submit" className={styles.primaryButton}>
            <LogIn />
            {t("entry.joinRoom")}
          </Button>
        </form>

        <Button asChild variant="ghost">
          <Link href="/">
            <ArrowLeft />
            {t("common.home")}
          </Link>
        </Button>
      </div>
    </main>
  );
}
