"use client";

import { Download, Share2, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { Player } from "@/lib/game/types";
import { useLanguage } from "@/lib/i18n/language-provider";
import styles from "./game.module.css";

type RankedPlayer = Player & {
  total: number;
};

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;
const BRAND_URL = "jogastop.ao";

export function FinalShareCard({
  roomCode,
  winner,
  ranking,
}: {
  roomCode: string;
  winner: RankedPlayer;
  ranking: RankedPlayer[];
}) {
  const { t } = useLanguage();
  const podium = ranking.slice(0, 3);

  async function shareImage() {
    try {
      const blob = await createShareImage({
        roomCode,
        winner,
        podium,
        t,
      });
      const file = new File([blob], `jogastop-${roomCode}.png`, {
        type: "image/png",
      });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: t("final.shareText"),
          title: t("final.shareTitle"),
        });
        return;
      }

      downloadBlob(blob, roomCode);
      toast.success(t("final.shareDownloaded"));
    } catch {
      toast.error(t("final.shareFailed"));
    }
  }

  async function downloadImage() {
    try {
      const blob = await createShareImage({
        roomCode,
        winner,
        podium,
        t,
      });
      downloadBlob(blob, roomCode);
      toast.success(t("final.shareDownloaded"));
    } catch {
      toast.error(t("final.shareFailed"));
    }
  }

  return (
    <section className={styles.shareCardSection}>
      <div>
        <span className={styles.finalKicker}>{t("final.shareKicker")}</span>
        <h2>{t("final.shareHeading")}</h2>
        <p>{t("final.shareBody")}</p>
      </div>

      <article
        aria-label={t("final.sharePreview")}
        className={styles.shareCard}
      >
        <div className={styles.shareCardHeader}>
          <span className={styles.shareBadge}>
            <Sparkles />
            {t("final.shareBadge")}
          </span>
          <strong>{BRAND_URL}</strong>
        </div>

        <div className={styles.shareCardWinner}>
          <span className={styles.shareTrophy}>
            <Trophy />
          </span>
          <small>{t("final.shareWinner")}</small>
          <h3>{winner.name}</h3>
          <b>{t("final.shareScore", { count: winner.total })}</b>
        </div>

        <div className={styles.shareRoom}>
          <span>{t("common.room")}</span>
          <strong>{roomCode}</strong>
        </div>

        <div className={styles.sharePodium}>
          {podium.map((player, index) => (
            <div className={styles.sharePodiumRow} key={player.id}>
              <span>{index + 1}</span>
              <strong>{player.name}</strong>
              <b>{player.total}</b>
            </div>
          ))}
        </div>

        <footer className={styles.shareFooter}>
          {t("final.shareTagline")}
        </footer>
      </article>

      <div className={styles.shareCardActions}>
        <Button onClick={shareImage}>
          <Share2 />
          {t("final.shareImage")}
        </Button>
        <Button onClick={downloadImage} variant="outline">
          <Download />
          {t("final.downloadImage")}
        </Button>
      </div>
    </section>
  );
}

function downloadBlob(blob: Blob, roomCode: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `jogastop-${roomCode}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function createShareImage({
  roomCode,
  winner,
  podium,
  t,
}: {
  roomCode: string;
  winner: RankedPlayer;
  podium: RankedPlayer[];
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");

  drawCardBackground(context);
  drawBrand(context);
  drawWinner(context, winner, t);
  drawRoom(context, roomCode, t);
  drawPodium(context, podium);
  drawFooter(context, t);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("Image unavailable"));
    }, "image/png");
  });

  return blob;
}

function drawCardBackground(context: CanvasRenderingContext2D) {
  const gradient = context.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  gradient.addColorStop(0, "#092232");
  gradient.addColorStop(0.55, "#0F2D3D");
  gradient.addColorStop(1, "#061722");
  context.fillStyle = gradient;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  context.fillStyle = "rgba(240, 178, 74, 0.18)";
  context.beginPath();
  context.arc(940, 140, 260, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "rgba(255, 255, 255, 0.07)";
  context.beginPath();
  context.arc(120, 1180, 360, 0, Math.PI * 2);
  context.fill();
}

function drawBrand(context: CanvasRenderingContext2D) {
  context.fillStyle = "#FFFFFF";
  context.font = "900 88px Nunito Rounded, Arial, sans-serif";
  context.fillText("joga", 96, 150);
  context.fillStyle = "#F0B24A";
  context.fillText("stop", 305, 150);

  context.fillStyle = "rgba(255, 255, 255, 0.58)";
  context.font = "800 28px Arial, sans-serif";
  context.fillText("THINK FAST. SCORE BIG.", 100, 205);
}

function drawWinner(
  context: CanvasRenderingContext2D,
  winner: RankedPlayer,
  t: ReturnType<typeof useLanguage>["t"],
) {
  roundedRect(context, 96, 300, 888, 420, 56, "rgba(255, 255, 255, 0.09)");
  roundedRect(context, 126, 330, 140, 140, 40, winner.color);

  context.fillStyle = winner.color === "#F0B24A" ? "#0F2D3D" : "#FFFFFF";
  context.font = "900 74px Arial, sans-serif";
  context.textAlign = "center";
  context.fillText(initials(winner.name), 196, 420);
  context.textAlign = "left";

  context.fillStyle = "#F0B24A";
  context.font = "900 36px Arial, sans-serif";
  context.fillText(t("final.shareWinner").toUpperCase(), 300, 382);

  context.fillStyle = "#FFFFFF";
  context.font = "900 92px Arial, sans-serif";
  drawFittedText(context, winner.name, 300, 485, 610);

  context.fillStyle = "rgba(255, 255, 255, 0.64)";
  context.font = "700 34px Arial, sans-serif";
  context.fillText(t("final.shareTagline"), 300, 555);

  roundedRect(context, 300, 610, 300, 70, 24, "#F0B24A");
  context.fillStyle = "#0F2D3D";
  context.font = "900 34px Arial, sans-serif";
  context.fillText(t("final.shareScore", { count: winner.total }), 330, 657);
}

function drawRoom(
  context: CanvasRenderingContext2D,
  roomCode: string,
  t: ReturnType<typeof useLanguage>["t"],
) {
  roundedRect(context, 96, 760, 888, 116, 34, "rgba(240, 178, 74, 0.16)");
  context.fillStyle = "rgba(255, 255, 255, 0.62)";
  context.font = "800 30px Arial, sans-serif";
  context.fillText(t("common.room").toUpperCase(), 140, 830);

  context.fillStyle = "#F0B24A";
  context.font = "900 56px Arial, sans-serif";
  context.textAlign = "right";
  context.fillText(roomCode, 940, 840);
  context.textAlign = "left";
}

function drawPodium(context: CanvasRenderingContext2D, podium: RankedPlayer[]) {
  let y = 940;
  for (const [index, player] of podium.entries()) {
    roundedRect(context, 96, y, 888, 96, 28, "rgba(255, 255, 255, 0.09)");

    context.fillStyle = index === 0 ? "#F0B24A" : "rgba(255, 255, 255, 0.72)";
    context.font = "900 34px Arial, sans-serif";
    context.fillText(`${index + 1}`, 145, y + 60);

    context.fillStyle = "#FFFFFF";
    context.font = "800 34px Arial, sans-serif";
    drawFittedText(context, player.name, 210, y + 60, 540);

    context.fillStyle = "#F0B24A";
    context.font = "900 34px Arial, sans-serif";
    context.textAlign = "right";
    context.fillText(String(player.total), 930, y + 60);
    context.textAlign = "left";

    y += 116;
  }
}

function drawFooter(
  context: CanvasRenderingContext2D,
  t: ReturnType<typeof useLanguage>["t"],
) {
  context.fillStyle = "rgba(255, 255, 255, 0.70)";
  context.font = "800 36px Arial, sans-serif";
  context.textAlign = "center";
  context.fillText(t("final.sharePlayedAt"), CARD_WIDTH / 2, 1282);
  context.textAlign = "left";
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string,
) {
  context.fillStyle = fillStyle;
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
  context.fill();
}

function drawFittedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
) {
  let output = text;
  while (context.measureText(output).width > maxWidth && output.length > 3) {
    output = `${output.slice(0, -2)}…`;
  }
  context.fillText(output, x, y);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
