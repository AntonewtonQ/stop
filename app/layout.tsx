import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n/language-provider";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "stop.ao — Pensa rápido. Marca grande.",
  description:
    "Cria uma sala, desafia os teus e grita STOP antes dos outros.",
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
    title: "stop.ao",
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
    <html lang="pt-AO" className={`${geistSans.variable} antialiased`}>
      <head>
        <script
          async
          crossOrigin="anonymous"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9068523374327625"
        />
      </head>
      <body>
        <LanguageProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <ServiceWorkerRegister />
          <LanguageSwitcher />
          <Toaster position="top-center" richColors />
        </LanguageProvider>
      </body>
    </html>
  );
}
