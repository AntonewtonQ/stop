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
import { useLanguage } from "@/lib/i18n/language-provider";
import { PlayerList } from "./player-list";
import styles from "./game.module.css";

export function LobbyRoom({
  room,
  session,
}: {
  room: Room;
  session: PlayerSession;
}) {
  const { category: categoryLabel, errorMessage, t } = useLanguage();
  const isHost = room.hostId === session.id;

  async function toggleCategory(category: string) {
    if (!isHost) return;

    const isSelected = room.settings.categories.includes(category);
    const categories = isSelected
      ? room.settings.categories.filter((item) => item !== category)
      : [...room.settings.categories, category];

    if (categories.length < 3) {
      toast.error(t("lobby.minCategories"));
      return;
    }

    try {
      await updateRoomSettings(room.code, { categories });
    } catch (error) {
      toast.error(t("lobby.categoriesFailed"), {
        description: errorMessage(error),
      });
    }
  }

  async function updateDuration(roundDuration: number) {
    if (!isHost) return;
    try {
      await updateRoomSettings(room.code, { roundDuration });
    } catch (error) {
      toast.error(t("lobby.timeFailed"), {
        description: errorMessage(error),
      });
    }
  }

  async function copyInvite() {
    const inviteUrl = `${window.location.origin}/sala/${room.code}`;
    await navigator.clipboard?.writeText(inviteUrl);
    toast.success(t("lobby.inviteCopied"), {
      description: `${t("common.room")} ${room.code}`,
    });
  }

  async function handleStart() {
    if (!isHost) return;
    try {
      await startFirstRound(room.code);
      toast.success(t("lobby.ready"));
    } catch (error) {
      toast.error(t("lobby.prepareFailed"), {
        description: errorMessage(error),
      });
    }
  }

  return (
    <main className={styles.gamePage}>
      <header className={styles.gameHeader}>
        <Logo />
        <div className={styles.roomIdentity}>
          <span>{t("common.room")}</span>
          <strong>{room.code}</strong>
        </div>
        <Button variant="outline" className={styles.copyButton} onClick={copyInvite}>
          <Copy />
          {t("lobby.copyInvite")}
        </Button>
      </header>

      <div className={styles.lobbyLayout}>
        <section className={styles.lobbyMain}>
          <div className={styles.sectionTitle}>
            <div>
              <span className={styles.eyebrow}>{t("lobby.eyebrow")}</span>
              <h1>{t("lobby.title")}</h1>
            </div>
            <BadgeCounter count={room.players.length} />
          </div>

          <PlayerList players={room.players} currentPlayerId={session.id} />

          <aside className={styles.inviteCallout}>
            <div className={styles.calloutIcon}>
              <UsersRound />
            </div>
            <div>
              <strong>{t("lobby.callTitle")}</strong>
              <p>{t("lobby.callBody")}</p>
            </div>
            <Button variant="outline" onClick={copyInvite}>
              <Copy />
              {t("lobby.copyInvite")}
            </Button>
          </aside>
        </section>

        <aside className={styles.settingsPanel}>
          <div className={styles.panelTitle}>
            <Settings2 />
            <div>
              <span>{t("lobby.rules")}</span>
              <strong>
                {isHost ? t("lobby.youDecide") : t("lobby.hostDecides")}
              </strong>
            </div>
          </div>

          <div className={styles.settingGroup}>
            <div className={styles.settingLabel}>
              <span>{t("lobby.categories")}</span>
              <small>
                {t("lobby.selected", {
                  count: room.settings.categories.length,
                })}
              </small>
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
                    {categoryLabel(category)}
                    {checked && <Check />}
                  </Label>
                );
              })}
            </div>
          </div>

          <div className={styles.commanderSummary}>
            <Crown />
            <div>
              <span>{t("lobby.commandOrder")}</span>
              <strong>
                {t("lobby.playersRounds", {
                  players: room.players.length,
                  rounds: room.players.length,
                })}
              </strong>
              <small>{t("lobby.commandRule")}</small>
            </div>
          </div>

          <div className={styles.settingGroup}>
            <div className={styles.settingLabel}>
              <span>{t("lobby.roundTime")}</span>
              <small>
                {t("lobby.seconds", { count: room.settings.roundDuration })}
              </small>
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
              {t("lobby.prepareFirst")}
            </Button>
          ) : (
            <div className={styles.waitingHost}>
              <span />
              {t("lobby.hostPreparing")}
            </div>
          )}

          <Button asChild variant="ghost" className={styles.leaveButton}>
            <Link href="/">
              <ArrowLeft />
              {t("lobby.leave")}
            </Link>
          </Button>
        </aside>
      </div>
    </main>
  );
}

function BadgeCounter({ count }: { count: number }) {
  const { t } = useLanguage();

  return (
    <div className={styles.playerCount}>
      <UsersRound />
      <div>
        <strong>{count}</strong>
        <span>{t(count === 1 ? "common.player" : "common.players")}</span>
      </div>
    </div>
  );
}
