import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The API runs on :8010 (see README). In production set VITE_API_URL or serve both behind one domain.
// Emergent runs one React app on :3000 and passes the backend URL as REACT_APP_BACKEND_URL; both prefixes are exposed.
export default defineConfig({
  plugins: [react()],
  envPrefix: ["VITE_", "REACT_APP_"],
  server: { host: "0.0.0.0", port: 3000, allowedHosts: true, proxy: { "/api": process.env.VITE_API_PROXY || "http://127.0.0.1:8010" } },
});
