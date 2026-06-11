import type { Metadata } from "next";
import localFont from "next/font/local";
import { LanguageSwitcher } from "@/components/language-switcher";
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
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-AO" className={`${geistSans.variable} antialiased`}>
      <body>
        <LanguageProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <LanguageSwitcher />
          <Toaster position="top-center" richColors />
        </LanguageProvider>
      </body>
    </html>
  );
}
