"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  Play,
  Settings2,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  CATEGORY_OPTIONS,
  ROUND_DURATION_OPTIONS,
} from "@/lib/game/constants";
import {
  startFirstRound,
  updateRoomSettings,
} from "@/lib/game/storage";
import type { PlayerSession, Room } from "@/lib/game/types";
import { PlayerList } from "./player-list";
import styles from "./game.module.css";

export function LobbyRoom({
  room,
  session,
}: {
  room: Room;
  session: PlayerSession;
}) {
  const isHost = room.hostId === session.id;

  async function toggleCategory(category: string) {
    if (!isHost) return;

    const isSelected = room.settings.categories.includes(category);
    const categories = isSelected
      ? room.settings.categories.filter((item) => item !== category)
      : [...room.settings.categories, category];

    if (categories.length < 3) {
      toast.error("Escolhe pelo menos três categorias.");
      return;
    }

    try {
      await updateRoomSettings(room.code, { categories });
    } catch (error) {
      toast.error("Não conseguimos actualizar as categorias.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function updateDuration(roundDuration: number) {
    if (!isHost) return;
    try {
      await updateRoomSettings(room.code, { roundDuration });
    } catch (error) {
      toast.error("Não conseguimos actualizar o tempo.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function copyInvite() {
    const inviteUrl = `${window.location.origin}/sala/${room.code}`;
    await navigator.clipboard?.writeText(inviteUrl);
    toast.success("Convite copiado", { description: `Sala ${room.code}` });
  }

  async function handleStart() {
    if (!isHost) return;
    try {
      await startFirstRound(room.code);
      toast.success("Tudo pronto. Escolhe a primeira letra!");
    } catch (error) {
      toast.error("Não conseguimos preparar a partida.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <main className={styles.gamePage}>
      <header className={styles.gameHeader}>
        <Logo />
        <div className={styles.roomIdentity}>
          <span>Sala</span>
          <strong>{room.code}</strong>
        </div>
        <Button variant="outline" className={styles.copyButton} onClick={copyInvite}>
          <Copy />
          Copiar convite
        </Button>
      </header>

      <div className={styles.lobbyLayout}>
        <section className={styles.lobbyMain}>
          <div className={styles.sectionTitle}>
            <div>
              <span className={styles.eyebrow}>Antes do STOP</span>
              <h1>Chama os teus. O jogo começa já.</h1>
            </div>
            <BadgeCounter count={room.players.length} />
          </div>

          <PlayerList players={room.players} currentPlayerId={session.id} />

          <aside className={styles.inviteCallout}>
            <div className={styles.calloutIcon}>
              <UsersRound />
            </div>
            <div>
              <strong>Chama os teus</strong>
              <p>
                Partilha o convite. Quem entrar aparece aqui e fica pronto para
                jogar.
              </p>
            </div>
            <Button variant="outline" onClick={copyInvite}>
              <Copy />
              Copiar convite
            </Button>
          </aside>
        </section>

        <aside className={styles.settingsPanel}>
          <div className={styles.panelTitle}>
            <Settings2 />
            <div>
              <span>Regras da partida</span>
              <strong>{isHost ? "Tu decides" : "O anfitrião decide"}</strong>
            </div>
          </div>

          <div className={styles.settingGroup}>
            <div className={styles.settingLabel}>
              <span>Categorias</span>
              <small>{room.settings.categories.length} seleccionadas</small>
            </div>
            <div className={styles.categoryOptions}>
              {CATEGORY_OPTIONS.map((category) => {
                const checked = room.settings.categories.includes(category);
                return (
                  <Label
                    className={`${styles.categoryOption} ${
                      checked ? styles.categoryOptionSelected : ""
                    }`}
                    key={category}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={!isHost}
                      onCheckedChange={() => toggleCategory(category)}
                    />
                    {category}
                    {checked && <Check />}
                  </Label>
                );
              })}
            </div>
          </div>

          <div className={styles.commanderSummary}>
            <Crown />
            <div>
              <span>Ordem de comando</span>
              <strong>
                {room.players.length} jogador{room.players.length === 1 ? "" : "es"},{" "}
                {room.players.length} rodada{room.players.length === 1 ? "" : "s"}
              </strong>
              <small>
                O anfitrião começa. Depois, o comando passa de jogador em
                jogador.
              </small>
            </div>
          </div>

          <div className={styles.settingGroup}>
            <div className={styles.settingLabel}>
              <span>Tempo da rodada</span>
              <small>{room.settings.roundDuration} segundos</small>
            </div>
            <div className={styles.durationOptions}>
              {ROUND_DURATION_OPTIONS.map((duration) => (
                <Button
                  className={
                    duration === room.settings.roundDuration
                      ? styles.durationSelected
                      : ""
                  }
                  variant="outline"
                  disabled={!isHost}
                  onClick={() => updateDuration(duration)}
                  key={duration}
                >
                  {duration}s
                </Button>
              ))}
            </div>
          </div>

          {isHost ? (
            <Button className={styles.startButton} onClick={handleStart}>
              <Play />
              Preparar primeira rodada
            </Button>
          ) : (
            <div className={styles.waitingHost}>
              <span />
              O anfitrião está a preparar a partida...
            </div>
          )}

          <Button asChild variant="ghost" className={styles.leaveButton}>
            <Link href="/">
              <ArrowLeft />
              Sair da sala
            </Link>
          </Button>
        </aside>
      </div>
    </main>
  );
}

function BadgeCounter({ count }: { count: number }) {
  return (
    <div className={styles.playerCount}>
      <UsersRound />
      <div>
        <strong>{count}</strong>
        <span>{count === 1 ? "jogador" : "jogadores"}</span>
      </div>
    </div>
  );
}
