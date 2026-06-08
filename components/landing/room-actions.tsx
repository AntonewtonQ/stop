"use client";

import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import styles from "./room-actions.module.css";

function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () =>
    alphabet.charAt(Math.floor(Math.random() * alphabet.length)),
  ).join("");
}

export function RoomActions() {
  const [roomCode, setRoomCode] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const [message, setMessage] = useState("");

  function createRoom() {
    const code = makeRoomCode();
    const feedback = `Sala ${code} preparada. O multiplayer será ligado a seguir.`;

    setCreatedCode(code);
    setMessage(feedback);
    toast.success("Sala preparada", { description: `Código: ${code}` });
  }

  function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = roomCode.trim().toUpperCase();

    if (code.length < 4) {
      const feedback = "Insere um código válido para entrar na sala.";
      setMessage(feedback);
      toast.error("Código inválido", { description: feedback });
      return;
    }

    const feedback = `Código ${code} reconhecido. A ligação da sala vem na próxima etapa.`;
    setMessage(feedback);
    toast.info("Código reconhecido", { description: `Sala ${code}` });
  }

  async function copyCode() {
    if (!createdCode) return;

    await navigator.clipboard?.writeText(createdCode);
    setMessage(`Código ${createdCode} copiado.`);
    toast.success("Código copiado", { description: createdCode });
  }

  return (
    <div className={styles.actions}>
      <div className={styles.mainAction}>
        <Button className={styles.createButton} type="button" onClick={createRoom}>
          <Plus data-icon="inline-start" />
          Criar uma sala
        </Button>

        {createdCode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className={styles.roomCode}
                variant="outline"
                type="button"
                onClick={copyCode}
              >
                <span>Sala criada</span>
                <strong>{createdCode}</strong>
                <small>Clica para copiar</small>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copiar código da sala</TooltipContent>
          </Tooltip>
        )}
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
