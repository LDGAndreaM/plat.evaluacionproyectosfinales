import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EvalúaQR",
    short_name: "EvalúaQR",
    description: "Evalúa proyectos con QR y organiza tus clases: asistencia, tareas, calificaciones y avisos.",
    lang: "es-MX",
    start_url: "/inicio",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#6A11CB",
    categories: ["education", "productivity"],
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/pwa/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Registrar asistencia", short_name: "Asistencia", url: "/asistencia", icons: [{ src: "/pwa/icon-192.png", sizes: "192x192" }] },
      { name: "Mis actividades", short_name: "Actividades", url: "/actividades", icons: [{ src: "/pwa/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
