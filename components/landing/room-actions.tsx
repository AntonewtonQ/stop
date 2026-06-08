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
  createRoom as createGameRoom,
  joinRoom as addPlayerToRoom,
  makeRoomCode,
  normalizeRoomCode,
  readRoom,
  savePlayerSession,
  saveRoom,
} from "@/lib/game/storage";
import styles from "./room-actions.module.css";

export function RoomActions() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [message, setMessage] = useState("");

  function validateName() {
    const name = playerName.trim();
    if (name.length >= 2) return name;

    const feedback = "Escreve o teu nome antes de continuar.";
    setMessage(feedback);
    toast.error("Falta o teu nome", { description: feedback });
    return null;
  }

  function createRoom() {
    const name = validateName();
    if (!name) return;

    const code = makeRoomCode();
    const session = createPlayerSession(name, code);
    const room = createGameRoom(code, session);

    savePlayerSession(session);
    saveRoom(room);
    toast.success("Sala criada", { description: `Código: ${code}` });
    router.push(`/sala/${code}`);
  }

  function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = validateName();
    if (!name) return;

    const code = normalizeRoomCode(roomCode);
    if (code.length < 4) {
      const feedback = "Insere um código válido para entrar na sala.";
      setMessage(feedback);
      toast.error("Código inválido", { description: feedback });
      return;
    }

    const room = readRoom(code);
    if (!room) {
      const feedback =
        "Esta sala não existe neste navegador. Confirma o código ou cria uma nova.";
      setMessage(feedback);
      toast.error("Sala não encontrada", { description: feedback });
      return;
    }

    if (room.status !== "lobby") {
      const feedback = "A partida desta sala já começou.";
      setMessage(feedback);
      toast.error("Sala em jogo", { description: feedback });
      return;
    }

    const session = createPlayerSession(name, code);
    savePlayerSession(session);
    addPlayerToRoom(room, session);
    toast.success("Entraste na sala", { description: code });
    router.push(`/sala/${code}`);
  }

  return (
    <div className={styles.actions}>
      <label className={styles.nameField} htmlFor="player-name">
        <span>Como te chamamos?</span>
        <div>
          <UserRound aria-hidden="true" />
          <Input
            id="player-name"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="O teu nome"
            maxLength={24}
            autoComplete="nickname"
          />
        </div>
      </label>

      <div className={styles.mainAction}>
        <Button className={styles.createButton} type="button" onClick={createRoom}>
          <Plus data-icon="inline-start" />
          Criar uma sala
        </Button>
      </div>

      <div className={styles.divider}>
        <Separator className={styles.dividerLine} />
        <span>ou entra com um código</span>
        <Separator className={styles.dividerLine} />
      </div>

      <form className={styles.joinForm} onSubmit={joinRoom}>
        <label className={styles.srOnly} htmlFor="room-code">
          Código da sala
        </label>
        <Input
          id="room-code"
          value={roomCode}
          onChange={(event) => setRoomCode(event.target.value)}
          placeholder="Ex.: K8M2A"
          maxLength={8}
          autoComplete="off"
        />
        <Button type="submit">Entrar</Button>
      </form>

      <p className={styles.feedback} aria-live="polite">
        {message || "Sem instalação. Cria uma sala e chama os teus amigos."}
      </p>
    </div>
  );
}
