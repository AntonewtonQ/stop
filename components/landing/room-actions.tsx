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
import styles from "./room-actions.module.css";

export function RoomActions() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [message, setMessage] = useState("");

  function validateName() {
    const name = playerName.trim();
    if (name.length >= 2) return name;

    const feedback = "Escreve o teu nome para começar.";
    setMessage(feedback);
    toast.error("Falta o teu nome", { description: feedback });
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
      toast.success("Sala criada", { description: `Código: ${code}` });
      router.push(`/sala/${code}`);
    } catch (error) {
      toast.error("Não conseguimos criar a sala.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function handleJoinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = validateName();
    if (!name) return;

    const code = normalizeRoomCode(roomCode);
    if (code.length < 4) {
      const feedback = "Escreve um código de sala válido.";
      setMessage(feedback);
      toast.error("Código inválido", { description: feedback });
      return;
    }

    let room;
    try {
      room = await readRoom(code);
    } catch (error) {
      toast.error("Não conseguimos encontrar a sala.", {
        description: error instanceof Error ? error.message : undefined,
      });
      return;
    }
    if (!room) {
      const feedback = "Confirma o código ou cria uma nova sala.";
      setMessage(feedback);
      toast.error("Sala indisponível", { description: feedback });
      return;
    }

    if (room.status !== "lobby") {
      const feedback = "Esta partida já começou.";
      setMessage(feedback);
      toast.error("Partida em curso", { description: feedback });
      return;
    }

    const session = createPlayerSession(name, code);

    try {
      await joinRoom(code, session);
      savePlayerSession(session);
      toast.success("Entraste na sala", { description: code });
      router.push(`/sala/${code}`);
    } catch (error) {
      toast.error("Não conseguimos entrar na sala.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <div className={styles.actions}>
      <label className={styles.nameField} htmlFor="player-name">
        <span>Qual é o teu nome?</span>
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
        <Button className={styles.createButton} type="button" onClick={handleCreateRoom}>
          <Plus data-icon="inline-start" />
          Criar uma sala
        </Button>
      </div>

      <div className={styles.divider}>
        <Separator className={styles.dividerLine} />
        <span>ou entra numa sala</span>
        <Separator className={styles.dividerLine} />
      </div>

      <form className={styles.joinForm} onSubmit={handleJoinRoom}>
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
        <Button type="submit">Entrar na sala</Button>
      </form>

      <p className={styles.feedback} aria-live="polite">
        {message || "Sem instalação. Cria uma sala e chama os teus."}
      </p>
    </div>
  );
}
