import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rubric - Monitor your Attendance",
    short_name: "Rubric",
    description: "Monitor, track and manage your attendance and your academic life.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#121111", // Sand Black HSL
    theme_color: "#c96f53", // Terracotta Orange HSL
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
