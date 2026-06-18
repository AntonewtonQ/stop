import type { MetadataRoute } from "next";

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
  ];
}
