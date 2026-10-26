# Elapsed

> How long you've been alive, counted live.

Elapsed is a private, installable web app that turns a birth date into a living readout: hours alive ticking in real time, your exact age, milestones, a life-in-weeks grid, and fun numbers. Compare two people, and count down (or up) to any event.

Everything runs in your browser. Nothing is uploaded; data lives in `localStorage` unless you copy a share link.

## Features

- **Live hour counter** with rolling digits and a progress bar to the next milestone
- **Exact age** in calendar years, months, days, hours, minutes and seconds, in any birth time zone
- **Milestones** (e.g. 100,000 hours) with countdowns and optional browser notifications
- **Life in weeks** canvas grid
- **By the numbers**: heartbeats, breaths, distance traveled around the Sun, age on other planets
- **Compare** two people and **Events** for countdowns and count-ups
- **Share links**, a downloadable share card, multiple profiles
- Light, dark and system themes; offline-capable PWA; keyboard and screen-reader friendly
- Motion layer built with [Motion](https://motion.dev) and [anime.js](https://animejs.com), CSS aurora background, cursor spotlight, and full `prefers-reduced-motion` support

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build
```

Requires Node 18+.

## Deploy

A GitHub Actions workflow (`.github/workflows/deploy.yml`) publishes to GitHub Pages on every push to `main`.
In the repository, go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
The build uses a relative base path, so it also works on any static host.

## Stack

React 18 · TypeScript · Vite · Motion · anime.js · lucide-react

## Project layout

```
src/
  components/   UI pieces (readout, milestones, compare, events, pickers)
  lib/          time math, formatting, storage, alerts, share card
  styles.css    tokens and base components
  features.css  layout for each view
  polish.css    ambient background, hover and motion effects
public/         icon, web manifest, service worker
```

## License

[MIT](LICENSE)
