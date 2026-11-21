import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// O proxy encaminha /api para o backend, então o frontend não precisa conhecer a porta da API.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": process.env.VITE_API_URL || "http://localhost:3001",
    },
  },
});
