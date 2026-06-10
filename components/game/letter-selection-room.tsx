"use client";

import { Crown, Play, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLAYABLE_LETTERS } from "@/lib/game/constants";
import { chooseRoundLetter } from "@/lib/game/storage";
import type { PlayerSession, Room } from "@/lib/game/types";
import styles from "./game.module.css";

export function LetterSelectionRoom({
  room,
  session,
}: {
  room: Room;
  session: PlayerSession;
}) {
  const round = room.round!;
  const commander = room.players.find(
    (player) => player.id === round.commanderId,
  )!;
  const isCommander = commander.id === session.id;
  const usedLetters = new Set(room.history.map((item) => item.letter));
  const onlinePlayers = room.players.filter((player) => player.isOnline).length;

  async function selectLetter(letter: string) {
    if (!isCommander || usedLetters.has(letter)) return;
    try {
      await chooseRoundLetter(room.code, letter);
      toast.success(`Letra ${letter} escolhida. O relógio começou!`);
    } catch (error) {
      toast.error("Não foi possível escolher esta letra.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <main className={styles.commanderPage}>
      <header className={styles.roundHeader}>
        <Logo light />
        <div className={styles.roundRoomCode}>
          <span>Sala</span>
          <strong>{room.code}</strong>
        </div>
        <div className={styles.roundPlayers}>
          <UsersRound />
          {onlinePlayers} online · Rodada {round.number} de{" "}
          {room.settings.roundsToPlay}
        </div>
      </header>

      <section className={styles.commanderHero}>
        <Badge className={styles.roundBadge}>Escolha da letra</Badge>
        <span className={styles.commanderKicker}>Comandante da rodada</span>
        <Avatar className={styles.commanderAvatar}>
          <AvatarFallback style={{ background: commander.color }}>
            {commander.initials}
          </AvatarFallback>
        </Avatar>
        <h1>
          {isCommander ? "Tu comandas agora." : `${commander.name} comanda agora.`}
        </h1>
        <p>
          {isCommander
            ? "Escolhe uma letra disponível. A rodada e o relógio começam imediatamente."
            : `Aguarda ${commander.name} escolher a letra e iniciar o relógio.`}
        </p>
      </section>

      <section className={styles.letterPicker}>
        <div className={styles.letterPickerHeader}>
          <div>
            <span className={styles.eyebrow}>Letras disponíveis</span>
            <strong>
              {PLAYABLE_LETTERS.length - usedLetters.size} por escolher
            </strong>
          </div>
          <div className={styles.commanderRule}>
            <Crown />
            Cada jogador comanda uma rodada
          </div>
        </div>

        <div className={styles.letterGrid}>
          {PLAYABLE_LETTERS.map((letter) => {
            const used = usedLetters.has(letter);

            return (
              <Button
                className={`${styles.letterChoice} ${
                  used ? styles.letterChoiceUsed : ""
                }`}
                disabled={!isCommander || used}
                onClick={() => selectLetter(letter)}
                type="button"
                variant="outline"
                key={letter}
              >
                {letter}
                <small>{used ? "Usada" : isCommander ? "Escolher" : "Livre"}</small>
              </Button>
            );
          })}
        </div>

        <div className={styles.commanderNotice}>
          <Play />
          {isCommander
            ? "A tua escolha inicia a rodada para todos."
            : "A rodada começa assim que o comandante escolher."}
        </div>
      </section>
    </main>
  );
}
