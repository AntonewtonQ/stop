"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LogIn, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createPlayerSession,
  joinRoom,
  savePlayerSession,
} from "@/lib/game/storage";
import type { Room } from "@/lib/game/types";
import styles from "./game.module.css";

export function JoinRoomGate({
  room,
  onJoined,
}: {
  room: Room;
  onJoined: () => void;
}) {
  const [name, setName] = useState("");

  function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (name.trim().length < 2) {
      toast.error("Escreve o teu nome para entrar.");
      return;
    }

    if (room.status !== "lobby") {
      toast.error("Esta partida já começou.");
      return;
    }

    const session = createPlayerSession(name, room.code);
    savePlayerSession(session);
    joinRoom(room, session);
    toast.success("Entraste na sala", { description: room.code });
    onJoined();
  }

  return (
    <main className={styles.gamePage}>
      <div className={styles.centeredCard}>
        <Logo />
        <span className={styles.eyebrow}>Sala {room.code}</span>
        <h1>Entra na roda.</h1>
        <p>Escolhe o nome que os outros jogadores vão ver nesta partida.</p>

        <form className={styles.joinGateForm} onSubmit={handleJoin}>
          <label htmlFor="guest-name">O teu nome</label>
          <div className={styles.iconInput}>
            <UserRound />
            <Input
              id="guest-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Ana Manuel"
              maxLength={24}
              autoFocus
            />
          </div>
          <Button type="submit" className={styles.primaryButton}>
            <LogIn />
            Entrar na sala
          </Button>
        </form>

        <Button asChild variant="ghost">
          <Link href="/">
            <ArrowLeft />
            Voltar ao início
          </Link>
        </Button>
      </div>
    </main>
  );
}
