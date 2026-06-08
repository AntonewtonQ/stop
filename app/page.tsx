import { FeatureStrip } from "@/components/landing/feature-strip";
import { HeroSection } from "@/components/landing/hero-section";
import { HowToSection } from "@/components/landing/how-to-section";
import { ScoringSection } from "@/components/landing/scoring-section";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <SiteHeader />
      <HeroSection />
      <FeatureStrip />
      <ScoringSection />
      <HowToSection />
      <SiteFooter />
    </main>
  );
}
