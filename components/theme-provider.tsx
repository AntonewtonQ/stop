"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

import { DEFAULT_THEME_ID, THEME_IDS } from "@/lib/themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme={DEFAULT_THEME_ID}
      disableTransitionOnChange
      enableColorScheme={false}
      enableSystem={false}
      storageKey="stop.ao:theme"
      themes={[...THEME_IDS]}
    >
      {children}
    </NextThemesProvider>
  );
}
