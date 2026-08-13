import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

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
