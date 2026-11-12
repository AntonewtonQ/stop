import type { MetadataRoute } from "next";

import { LETTER_GUIDES } from "@/lib/content/word-lists";

const SITE_URL = "https://jogastop.ao";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
      images: [`${SITE_URL}/brand/jogastop-logo-instagram.png`],
    },
    {
      url: `${SITE_URL}/privacidade`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/ranking`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.7,
    },
    ...["/regras", "/dicas", "/palavras", "/sobre"].map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...LETTER_GUIDES.map((guide) => ({
      url: `${SITE_URL}/palavras/${guide.letter.toLowerCase()}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
