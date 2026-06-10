import { Logo } from "@/components/brand/logo";
import { Separator } from "@/components/ui/separator";
import styles from "@/app/page.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <Separator className={styles.footerSeparator} />
      <Logo compact />
      <p>Feito em Angola para quem pensa rápido.</p>
    </footer>
  );
}
