"use client";

import { FormEvent, useState } from "react";
import { Plus, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  createPlayerSession,
  createRoom,
  joinRoom,
  makeRoomCode,
  normalizeRoomCode,
  readRoom,
  savePlayerSession,
} from "@/lib/game/storage";
import { useLanguage } from "@/lib/i18n/language-provider";
import styles from "./room-actions.module.css";

export function RoomActions() {
  const { errorMessage, t } = useLanguage();
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [message, setMessage] = useState("");

  function validateName() {
    const name = playerName.trim();
    if (name.length >= 2) return name;

    const feedback = t("entry.nameFeedback");
    setMessage(feedback);
    toast.error(t("entry.nameMissing"), { description: feedback });
    return null;
  }

  async function handleCreateRoom() {
    const name = validateName();
    if (!name) return;

    const code = makeRoomCode();
    const session = createPlayerSession(name, code);

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
    }
  }

  async function handleJoinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    try {
      room = await readRoom(code);
    } catch (error) {
      toast.error(t("entry.findFailed"), {
        description: errorMessage(error),
      });
      return;
    }
    if (!room) {
      const feedback = t("entry.roomUnavailableFeedback");
      setMessage(feedback);
      toast.error(t("entry.roomUnavailable"), { description: feedback });
      return;
    }

    if (room.status !== "lobby") {
      const feedback = t("entry.gameStartedFeedback");
      setMessage(feedback);
      toast.error(t("entry.gameStarted"), { description: feedback });
      return;
    }

    const session = createPlayerSession(name, code);

    try {
      await joinRoom(code, session);
      savePlayerSession(session);
      toast.success(t("entry.joined"), { description: code });
      router.push(`/sala/${code}`);
    } catch (error) {
      toast.error(t("entry.joinFailed"), {
        description: errorMessage(error),
      });
    }
  }

  return (
    <div className={styles.actions}>
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
          />
        </div>
      </label>

      <div className={styles.mainAction}>
        <Button className={styles.createButton} type="button" onClick={handleCreateRoom}>
          <Plus data-icon="inline-start" />
          {t("entry.createRoom")}
        </Button>
      </div>

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
        />
        <Button type="submit">{t("entry.joinRoom")}</Button>
      </form>

      <p className={styles.feedback} aria-live="polite">
        {message || t("entry.noInstall")}
      </p>
    </div>
  );
}
