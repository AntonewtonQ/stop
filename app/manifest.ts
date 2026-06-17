import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "jogastop - Jogo Stop Online",
    short_name: "jogastop",
    description:
      "Joga Stop online com os teus amigos. Pensa rápido e marca grande.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FFFEFA",
    theme_color: "#0F2D3D",
    orientation: "any",
    lang: "pt-AO",
    categories: ["games", "entertainment", "social"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
