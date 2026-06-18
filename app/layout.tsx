import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n/language-provider";
import "./globals.css";

const siteUrl = "https://jogastop.ao";
const siteDescription =
  "Joga Stop online com amigos no telemóvel. Cria uma sala, escolhe a letra, responde por categorias e grita STOP em tempo real.";

const geistSans = localFont({
  src: "./fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "jogastop",
  title: {
    default: "jogastop | Jogo Stop Online",
    template: "%s | jogastop",
  },
  description: siteDescription,
  keywords: [
    "jogastop",
    "stop online",
    "jogo stop",
    "stop angola",
    "jogo de palavras",
    "jogo multiplayer",
    "jogo para WhatsApp",
    "jogo de categorias",
  ],
  authors: [{ name: "jogastop" }],
  creator: "jogastop",
  publisher: "jogastop",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "jogastop",
  },
  openGraph: {
    type: "website",
    locale: "pt_AO",
    url: "/",
    siteName: "jogastop",
    title: "jogastop | Jogo Stop Online",
    description: siteDescription,
    images: [
      {
        url: "/brand/jogastop-logo-instagram.png",
        width: 3000,
        height: 3000,
        alt: "Logotipo do jogastop",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "jogastop | Jogo Stop Online",
    description: siteDescription,
    images: ["/brand/jogastop-logo-instagram.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0F2D3D",
  colorScheme: "light",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-AO"
      className={`${geistSans.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          async
          crossOrigin="anonymous"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9068523374327625"
        />
      </head>
      <body>
        <ThemeProvider>
          <LanguageProvider>
            <TooltipProvider>{children}</TooltipProvider>
            <ServiceWorkerRegister />
            <LanguageSwitcher />
            <Toaster position="top-center" richColors />
          </LanguageProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
