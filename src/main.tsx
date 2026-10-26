import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./features.css";
import "./polish.css";
import "./mobile.css";
import "./layout.css";

const started = performance.now();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* offline support is optional */
    });
  });
}

/* Splash: stays for at least 1.6s (0.5s with reduced motion), then waits for fonts and fades away. */
const splash = document.getElementById("splash");
if (splash && !document.documentElement.classList.contains("no-splash")) {
  const minimum = matchMedia("(prefers-reduced-motion: reduce)").matches ? 500 : 1600;
  const fonts = document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]) : Promise.resolve();
  const loaded = document.readyState === "complete" ? Promise.resolve() : new Promise<void>((r) => window.addEventListener("load", () => r(), { once: true }));
  void Promise.all([fonts, loaded]).then(() => {
    setTimeout(() => {
      splash.classList.add("out");
      try {
        sessionStorage.setItem("elapsed:splash", "1");
      } catch {
        /* the splash simply shows again next time */
      }
      setTimeout(() => splash.remove(), 800);
    }, Math.max(0, minimum - (performance.now() - started)));
  });
} else {
  splash?.remove();
}
