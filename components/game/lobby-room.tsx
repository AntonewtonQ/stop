"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  MessageCircle,
  Minus,
  Play,
  Plus,
  Settings2,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CATEGORY_OPTIONS,
  MAX_CATEGORIES,
  MAX_CATEGORY_LENGTH,
  MIN_CATEGORIES,
  MIN_CATEGORY_LENGTH,
  normalizeCategoryKey,
  normalizeCategoryName,
  MAX_ROUNDS_TO_PLAY,
  MIN_ROUNDS_TO_PLAY,
  ROUND_DURATION_OPTIONS,
} from "@/lib/game/constants";
import {
  startFirstRound,
  updateRoomSettings,
} from "@/lib/game/storage";
import type { PlayerSession, Room } from "@/lib/game/types";
import { useLanguage } from "@/lib/i18n/language-provider";
import { PlayerList } from "./player-list";
import { ThemePicker } from "./theme-picker";
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
  const [customCategory, setCustomCategory] = useState("");
  const customCategories = room.settings.categories.filter(
    (category) =>
      !CATEGORY_OPTIONS.some(
        (option) => normalizeCategoryKey(option) === normalizeCategoryKey(category),
      ),
  );

  async function toggleCategory(category: string) {
    if (!isHost) return;

    const isSelected = room.settings.categories.includes(category);
    if (!isSelected && room.settings.categories.length >= MAX_CATEGORIES) {
      toast.error(t("lobby.maxCategories", { count: MAX_CATEGORIES }));
      return;
    }

    const categories = isSelected
      ? room.settings.categories.filter((item) => item !== category)
      : [...room.settings.categories, category];

    if (categories.length < MIN_CATEGORIES) {
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

  async function addCustomCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isHost) return;

    const category = normalizeCategoryName(customCategory);
    const categoryExists = room.settings.categories.some(
      (item) => normalizeCategoryKey(item) === normalizeCategoryKey(category),
    );

    if (category.length < MIN_CATEGORY_LENGTH) {
      toast.error(t("lobby.categoryInvalid"));
      return;
    }

    if (categoryExists) {
      toast.error(t("lobby.categoryExists"));
      return;
    }

    if (room.settings.categories.length >= MAX_CATEGORIES) {
      toast.error(t("lobby.maxCategories", { count: MAX_CATEGORIES }));
      return;
    }

    try {
      await updateRoomSettings(room.code, {
        categories: [...room.settings.categories, category],
      });
      setCustomCategory("");
    } catch (error) {
      toast.error(t("lobby.categoriesFailed"), {
        description: errorMessage(error),
      });
    }
  }

  async function removeCategory(category: string) {
    if (!isHost) return;
    const categories = room.settings.categories.filter(
      (item) => normalizeCategoryKey(item) !== normalizeCategoryKey(category),
    );

    if (categories.length < MIN_CATEGORIES) {
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

  async function updateRoundCount(roundsToPlay: number) {
    if (!isHost) return;
    try {
      await updateRoomSettings(room.code, { roundsToPlay });
    } catch (error) {
      toast.error(t("lobby.roundsFailed"), {
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

  function inviteOnWhatsApp() {
    const inviteUrl = `${window.location.origin}/sala/${room.code}`;
    const message = t("lobby.whatsappMessage", {
      code: room.code,
      url: inviteUrl,
    });
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
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
        <div className={styles.headerInviteActions}>
          <Button
            variant="outline"
            className={`${styles.copyButton} ${styles.whatsappButton}`}
            onClick={inviteOnWhatsApp}
          >
            <MessageCircle />
            {t("lobby.whatsappInvite")}
          </Button>
          <Button variant="outline" className={styles.copyButton} onClick={copyInvite}>
            <Copy />
            {t("lobby.copyInvite")}
          </Button>
        </div>
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
            <div className={styles.inviteActions}>
              <Button variant="outline" onClick={inviteOnWhatsApp}>
                <MessageCircle />
                {t("lobby.whatsappInvite")}
              </Button>
              <Button variant="outline" onClick={copyInvite}>
                <Copy />
                {t("lobby.copyInvite")}
              </Button>
            </div>
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
            {customCategories.length > 0 && (
              <div className={styles.customCategoryList}>
                {customCategories.map((category) => (
                  <div className={styles.customCategoryChip} key={category}>
                    <span>{categoryLabel(category)}</span>
                    {isHost && (
                      <button
                        aria-label={t("lobby.removeCategory", { category })}
                        onClick={() => removeCategory(category)}
                        type="button"
                      >
                        <X />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <form
              className={styles.customCategoryForm}
              onSubmit={addCustomCategory}
            >
              <Label htmlFor="custom-category">
                {t("lobby.customCategory")}
              </Label>
              <div>
                <Input
                  disabled={!isHost}
                  id="custom-category"
                  maxLength={MAX_CATEGORY_LENGTH}
                  onChange={(event) => setCustomCategory(event.target.value)}
                  placeholder={t("lobby.customPlaceholder")}
                  value={customCategory}
                />
                <Button disabled={!isHost} type="submit" variant="outline">
                  <Plus />
                  {t("lobby.addCategory")}
                </Button>
              </div>
              <small>{t("lobby.customHint", { count: MAX_CATEGORIES })}</small>
            </form>
          </div>

          <div className={styles.commanderSummary}>
            <Crown />
            <div>
              <span>{t("lobby.commandOrder")}</span>
              <strong>
                {t("lobby.playersRounds", {
                  players: room.players.length,
                  rounds: room.settings.roundsToPlay,
                })}
              </strong>
              <small>{t("lobby.commandRule")}</small>
            </div>
          </div>

          <div className={styles.settingGroup}>
            <div className={styles.settingLabel}>
              <span>{t("lobby.rounds")}</span>
              <small>
                {room.settings.roundsCustomized
                  ? t("lobby.roundsFixed")
                  : t("lobby.roundsAuto")}
              </small>
            </div>
            <div className={styles.roundCountControl}>
              <Button
                aria-label={t("lobby.decreaseRounds")}
                disabled={
                  !isHost ||
                  room.settings.roundsToPlay <= MIN_ROUNDS_TO_PLAY
                }
                onClick={() =>
                  updateRoundCount(room.settings.roundsToPlay - 1)
                }
                type="button"
                variant="outline"
              >
                <Minus />
              </Button>
              <div aria-live="polite">
                <strong>{room.settings.roundsToPlay}</strong>
                <span>{t("common.rounds")}</span>
              </div>
              <Button
                aria-label={t("lobby.increaseRounds")}
                disabled={
                  !isHost ||
                  room.settings.roundsToPlay >= MAX_ROUNDS_TO_PLAY
                }
                onClick={() =>
                  updateRoundCount(room.settings.roundsToPlay + 1)
                }
                type="button"
                variant="outline"
              >
                <Plus />
              </Button>
            </div>
          </div>

          <div className={styles.settingGroup}>
            <ThemePicker />
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
