import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/language-provider";
import styles from "@/app/page.module.css";
import { CategoryIcon, CategoryType, StopwatchIcon } from "./icons";

const answers: Array<{
  category: "Nome" | "País" | "Comida" | "Profissão";
  answer: string;
  points: "+5" | "+10" | "+20";
  type: CategoryType;
}> = [
  { category: "Nome", answer: "Manuel", points: "+5", type: "name" },
  { category: "País", answer: "Moçambique", points: "+10", type: "country" },
  { category: "Comida", answer: "Muamba", points: "+20", type: "food" },
  { category: "Profissão", answer: "Médico", points: "+10", type: "job" },
];

export function GamePreview() {
  const { category, t } = useLanguage();

  return (
    <div className={styles.gameStage} aria-label={t("landing.previewAria")}>
      <span className={`${styles.spark} ${styles.sparkOne}`}>+</span>
      <span className={`${styles.spark} ${styles.sparkTwo}`}>+</span>

      <article className={styles.gameCard}>
        <div className={styles.gameTopbar}>
          <div className={styles.roundLabel}>
            <span>{t("common.room")} K8M2A</span>
            <strong>{t("common.round")} 04</strong>
          </div>
          <div className={styles.timer}>
            <StopwatchIcon />
            <div>
              <span>{t("landing.previewTime")}</span>
              <strong>00:18</strong>
            </div>
          </div>
        </div>

        <div className={styles.letterPanel}>
          <div className={styles.letter}>M</div>
          <div className={styles.letterCopy}>
            <span>{t("landing.previewRoundLetter")}</span>
            <strong>{t("landing.previewStartsWith", { letter: "M" })}</strong>
          </div>
          <AvatarGroup
            className={`space-x-0 ${styles.players}`}
            aria-label={t("landing.previewPlayers", { count: 3 })}
          >
            <Avatar className={styles.avatar}>
              <AvatarFallback className={styles.avatarFallback}>AN</AvatarFallback>
            </Avatar>
            <Avatar className={styles.avatar}>
              <AvatarFallback className={styles.avatarFallback}>JM</AvatarFallback>
            </Avatar>
            <Avatar className={styles.avatar}>
              <AvatarFallback className={styles.avatarFallback}>+1</AvatarFallback>
            </Avatar>
          </AvatarGroup>
        </div>

        <div className={styles.answerList}>
          {answers.map((answer) => (
            <div className={styles.answerRow} key={answer.category}>
              <span className={styles.categoryIcon}>
                <CategoryIcon type={answer.type} />
              </span>
              <label>{category(answer.category)}</label>
              <p>{answer.answer}</p>
              <Badge
                variant={answer.points === "+5" ? "outline" : "default"}
                className={`${styles.points} ${
                  answer.points === "+10"
                    ? styles.pointsTen
                    : answer.points === "+5"
                      ? styles.pointsFive
                      : ""
                }`}
              >
                {answer.points}
              </Badge>
            </div>
          ))}
        </div>

        <div className={styles.gameFooter}>
          <div className={styles.progress}>
            <div className={styles.progressFill} />
          </div>
          <Button className={styles.stopButton} type="button">
            {t("landing.previewStop")}
          </Button>
        </div>
      </article>

      <aside className={styles.scoreCard}>
        <strong>85</strong>
        <span>{t("common.points")}</span>
        <b>{t("landing.previewPosition")}</b>
      </aside>
    </div>
  );
}
