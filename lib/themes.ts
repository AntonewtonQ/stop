export const THEME_IDS = ["classic", "atlantic", "kizomba", "neon"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME_ID: ThemeId = "classic";
