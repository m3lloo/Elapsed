import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the build works from any path (GitHub Pages project sites, subfolders, file hosting).
export default defineConfig({ base: "./", build: { chunkSizeWarningLimit: 900 }, plugins: [react()] });
