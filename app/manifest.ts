import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Club de Squash Linares",
    short_name: "Squash Linares",
    description: "Tu club, tus torneos y tus partidos",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f5ef",
    theme_color: "#175c43",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
