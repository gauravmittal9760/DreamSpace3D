import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In dev the React app runs on :5173 and proxies /api to Flask on :5000 (same origin -> cookies just work).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://127.0.0.1:5000" } },
  build: { chunkSizeWarningLimit: 1500 },
});
