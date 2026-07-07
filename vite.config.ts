import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Config base. La PWA permite "Añadir a pantalla de inicio" en iPad (offline + IndexedDB).
export default defineConfig({
  resolve: {
    alias: { "@": "/src" },
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Cotilleo Island",
        short_name: "Cotilleo",
        description: "Simulador social local-first tipo Tomodachi.",
        theme_color: "#1f6f5c",
        background_color: "#0f1720",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
});
