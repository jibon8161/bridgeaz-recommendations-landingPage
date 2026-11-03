import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      strategies: "injectManifest",

      srcDir: "src",
      filename: "sw.js",

      registerType: "autoUpdate",

      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2}"],

        globIgnores: ["**/homeImage-*.png"],
      },

      manifest: {
        name: "My Bridge",
        short_name: "My Bridge",

        description:
          "Your personalized Bridge experience for local people, opportunities, resources, and connections.",

        start_url: "/",
        scope: "/",
        display: "standalone",

        background_color: "#F6F8FC",
        theme_color: "#071A4A",

        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],

  server: {
    proxy: {
      "/bridgeaz-api": {
        target: "https://bridgeaz.co",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/bridgeaz-api/, ""),
      },
    },
  },
});
