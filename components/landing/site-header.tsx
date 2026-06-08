import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import styles from "@/app/page.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <a href="#" aria-label="Página inicial">
        <Logo />
      </a>

      <nav className={styles.nav} aria-label="Navegação principal">
        <a href="#pontuacao">Pontuação</a>
        <a href="#como-jogar">Como jogar</a>
      </nav>

      <Button asChild variant="outline" className={styles.headerCta}>
        <a href="#jogar">Jogar agora</a>
      </Button>
    </header>
  );
}
