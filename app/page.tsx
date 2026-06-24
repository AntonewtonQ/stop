import { AdSenseScript } from "@/components/ads/adsense-script";
import { FeatureStrip } from "@/components/landing/feature-strip";
import { HeroSection } from "@/components/landing/hero-section";
import { HowToSection } from "@/components/landing/how-to-section";
import { ScoringSection } from "@/components/landing/scoring-section";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import styles from "./page.module.css";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "jogastop",
  alternateName: "Joga Stop",
  url: "https://jogastop.ao",
  applicationCategory: "GameApplication",
  operatingSystem: "Web, Android, iOS",
  description:
    "Jogo Stop online em tempo real para jogar com amigos por sala privada.",
  image: "https://jogastop.ao/brand/jogastop-logo-instagram.png",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "AOA",
  },
};

export default function Home() {
  return (
    <main className={styles.page}>
      <AdSenseScript />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <SiteHeader />
      <HeroSection />
      <FeatureStrip />
      <ScoringSection />
      <HowToSection />
      <SiteFooter />
      <InstallPrompt />
    </main>
  );
}
