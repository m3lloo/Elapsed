import { useEffect, useRef, useState } from "react";
import type * as ThreeNS from "three";
import { Hand } from "lucide-react";
import { reducedMotion } from "../lib/format";
import { Ic } from "./Icon";

type Three = typeof ThreeNS;

interface Props {
  /** 0 to 1: how far along the arc to the next milestone. */
  progress: number;
  /** Dimmed variant for the empty state. */
  faint?: boolean;
}

interface Handle { setProgress: (p: number) => void; dispose: () => void }

const TAU = Math.PI * 2;
const HOLD_MS = 320;
const MOVE_PX = 6;

function webglOk() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const css = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/**
 * An armillary "time orb" you can handle:
 *   drag  - spin it (with inertia; vertical drags still scroll the page on touch screens)
 *   tap   - send a pulse through it
 *   hold  - warp time: the rings and the seconds bead race ahead
 *   keys  - Enter/Space pulse, arrows nudge
 * Core, rings, a bead that laps once per real minute, and an arc that fills toward the next milestone.
 * three.js loads lazily. Pixel ratio is capped and adapts down on slow devices; rendering pauses off-screen.
 */
function build(THREE: Three, host: HTMLElement, initial: number, onUse: () => void): Handle {
  const coarse = matchMedia("(pointer: coarse)").matches;
  const still = reducedMotion();

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !coarse, powerPreference: "high-performance" });
  let dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  host.prepend(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.set(0, 0, 9.3);

  const accent = new THREE.Color(css("--accent", "#5fe3b5"));
  const accent2 = new THREE.Color(css("--accent-2", "#7aa7ff"));
  const ink = new THREE.Color(css("--ink", "#eceef2"));

  const rig = new THREE.Group();
  scene.add(rig);
  const geos: ThreeNS.BufferGeometry[] = [];
  const mats: ThreeNS.Material[] = [];
  const track = <T extends ThreeNS.BufferGeometry>(g: T) => (geos.push(g), g);
  const trackM = <T extends ThreeNS.Material>(m: T) => (mats.push(m), m);

  // Core: fresnel-lit sphere so it glows at the rim without needing scene lights.
  const coreMat = trackM(new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { uColor: { value: accent.clone() }, uTime: { value: 0 }, uBoost: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uTime; uniform float uBoost; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(1.0 - max(dot(vN, vV), 0.0), 2.2); float pulse = 0.85 + 0.15 * sin(uTime * 1.6);
        float a = (0.12 + f * 0.85) * pulse + uBoost * (0.35 + f * 0.5);
        gl_FragColor = vec4(mix(uColor, vec3(1.0), uBoost * 0.45), clamp(a, 0.0, 1.0)); }`,
  }));
  const core = new THREE.Mesh(track(new THREE.SphereGeometry(0.95, coarse ? 24 : 40, coarse ? 24 : 40)), coreMat);
  rig.add(core);

  const shellMat = trackM(new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.35 }));
  const shell = new THREE.Mesh(track(new THREE.IcosahedronGeometry(1.35, 1)), shellMat);
  rig.add(shell);

  // Gyroscope rings, each with a bead on it.
  const ringSpecs = [
    { r: 1.9, tilt: [1.2, 0, 0.3], speed: 0.35, color: accent },
    { r: 2.35, tilt: [0.3, 0, 1.1], speed: -0.25, color: accent2 },
    { r: 2.8, tilt: [-0.5, 0.6, 0], speed: 0.18, color: ink },
  ] as const;
  const rings = ringSpecs.map((s) => {
    const pivot = new THREE.Group();
    pivot.rotation.set(s.tilt[0], s.tilt[1], s.tilt[2]);
    const m = trackM(new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.55 }));
    pivot.add(new THREE.Mesh(track(new THREE.TorusGeometry(s.r, 0.011, 6, coarse ? 96 : 160)), m));
    const bm = trackM(new THREE.MeshBasicMaterial({ color: s.color }));
    const bead = new THREE.Mesh(track(new THREE.SphereGeometry(0.075, 12, 12)), bm);
    pivot.add(bead);
    rig.add(pivot);
    return { ...s, pivot, bead, m, bm, phase: 0 };
  });

  // Seconds hand: one lap per real minute, on its own ring.
  const secPivot = new THREE.Group();
  secPivot.rotation.x = Math.PI / 2;
  const secMat = trackM(new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0.18 }));
  secPivot.add(new THREE.Mesh(track(new THREE.TorusGeometry(3.25, 0.008, 6, 160)), secMat));
  const secBeadMat = trackM(new THREE.MeshBasicMaterial({ color: accent }));
  const secBead = new THREE.Mesh(track(new THREE.SphereGeometry(0.1, 14, 14)), secBeadMat);
  secPivot.add(secBead);
  rig.add(secPivot);

  // Progress arc on the equator, thicker than the rings.
  const arcMat = trackM(new THREE.MeshBasicMaterial({ color: accent }));
  const arcPivot = new THREE.Group();
  arcPivot.rotation.x = Math.PI / 2;
  rig.add(arcPivot);
  let arc: ThreeNS.Mesh | null = null;
  let arcKey = -1;
  const setProgress = (p: number) => {
    const key = Math.round(Math.max(0.005, Math.min(1, p)) * 400);
    if (key === arcKey) return;
    arcKey = key;
    if (arc) { arcPivot.remove(arc); arc.geometry.dispose(); }
    arc = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.04, 8, 96, (key / 400) * TAU), arcMat);
    arc.rotation.z = Math.PI / 2; // start at the top
    arcPivot.add(arc);
  };
  setProgress(initial);

  // Shockwave sent out by a pulse. Lives in the scene (not the rig) so it always faces the camera.
  const waveMat = trackM(new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0, depthWrite: false }));
  const wave = new THREE.Mesh(track(new THREE.TorusGeometry(1, 0.018, 6, 128)), waveMat);
  wave.visible = false;
  scene.add(wave);

  // Particle shell.
  const count = coarse ? 260 : 620;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 3.6 + Math.random() * 2.2;
    const th = Math.random() * TAU;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    pos[i * 3 + 2] = r * Math.cos(ph);
  }
  const pg = track(new THREE.BufferGeometry());
  pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pm = trackM(new THREE.PointsMaterial({ color: accent2, size: coarse ? 0.055 : 0.045, transparent: true, opacity: 0.75, depthWrite: false, sizeAttenuation: true }));
  const points = new THREE.Points(pg, pm);
  scene.add(points);

  const resize = () => {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  // ---- Interaction state ----
  const user = { y: 0, x: 0, vy: 0, vx: 0 }; // dragged rotation and its inertia
  const look = { tx: 0, ty: 0, x: 0, y: 0 }; // gentle pointer parallax
  let hover = 0, hoverT = 0;
  let warp = 0, warpT = 0;
  let burst = 0, flash = 0, waveT = 1;
  let used = false;
  let idleUntil = 0;

  const touched = () => {
    if (!used) { used = true; onUse(); }
  };
  const kick = (ms = 1800) => {
    idleUntil = performance.now() + ms;
    request();
  };
  const pulse = () => {
    burst = 1;
    flash = 1;
    waveT = 0;
    wave.visible = true;
    waveMat.color.copy(accent);
    if (navigator.vibrate) navigator.vibrate(12);
    touched();
    kick(2200);
  };

  let drag: { id: number; x: number; y: number; sx: number; sy: number; t0: number; moved: boolean; lastT: number } | null = null;
  let holdTimer = 0;

  const onDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t0: performance.now(), moved: false, lastT: performance.now() };
    user.vx = 0; user.vy = 0;
    host.classList.add("grabbing");
    holdTimer = window.setTimeout(() => {
      if (drag && !drag.moved) { warpT = 1; touched(); kick(60_000); }
    }, HOLD_MS);
    kick();
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && !drag) {
      const r = host.getBoundingClientRect();
      look.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      look.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    }
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    const now = performance.now();
    const dt = Math.max(1, now - drag.lastT) / 1000;
    drag.x = e.clientX; drag.y = e.clientY; drag.lastT = now;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > MOVE_PX) {
      drag.moved = true;
      window.clearTimeout(holdTimer);
      warpT = 0;
      touched();
      try { host.setPointerCapture(e.pointerId); } catch { /* capture is a nicety */ }
    }
    if (drag.moved) {
      const k = 0.0085;
      user.y += dx * k;
      user.x = Math.max(-1.3, Math.min(1.3, user.x + dy * k));
      user.vy = (dx * k) / dt;
      user.vx = (dy * k) / dt;
      kick();
    }
  };
  const onUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    window.clearTimeout(holdTimer);
    const wasTap = !drag.moved && performance.now() - drag.t0 < HOLD_MS;
    drag = null;
    warpT = 0;
    host.classList.remove("grabbing");
    if (wasTap) pulse();
    else kick();
  };
  const onCancel = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    window.clearTimeout(holdTimer);
    drag = null;
    warpT = 0;
    host.classList.remove("grabbing");
  };
  const onEnter = (e: PointerEvent) => { if (e.pointerType === "mouse") { hoverT = 1; kick(); } };
  const onLeave = () => { hoverT = 0; look.tx = 0; look.ty = 0; kick(); };
  const onKey = (e: KeyboardEvent) => {
    const nudge: Record<string, () => void> = {
      ArrowLeft: () => (user.vy -= 3),
      ArrowRight: () => (user.vy += 3),
      ArrowUp: () => (user.vx -= 3),
      ArrowDown: () => (user.vx += 3),
    };
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pulse(); }
    else if (nudge[e.key]) { e.preventDefault(); nudge[e.key](); touched(); kick(); }
  };
  host.addEventListener("pointerdown", onDown);
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerup", onUp);
  host.addEventListener("pointercancel", onCancel);
  host.addEventListener("pointerenter", onEnter);
  host.addEventListener("pointerleave", onLeave);
  host.addEventListener("keydown", onKey);

  const ro = new ResizeObserver(() => { resize(); kick(300); });
  ro.observe(host);
  resize();

  // Keep colors in step with the theme.
  const recolor = () => {
    accent.set(css("--accent", "#5fe3b5"));
    accent2.set(css("--accent-2", "#7aa7ff"));
    ink.set(css("--ink", "#eceef2"));
    (coreMat.uniforms.uColor.value as ThreeNS.Color).copy(accent);
    shellMat.color.copy(accent);
    arcMat.color.copy(accent);
    secBeadMat.color.copy(accent);
    secMat.color.copy(ink);
    pm.color.copy(accent2);
    rings.forEach((r) => { r.m.color.copy(r.color); r.bm.color.copy(r.color); });
    kick(300);
  };
  const mo = new MutationObserver(recolor);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const mq = matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", recolor);

  let visible = true;
  let last = performance.now();
  let t = 0;
  let intro = 0;
  let slow = 0;
  let samples = 0;
  let raf = 0;
  let stopped = false;
  let secExtra = 0;

  const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

  function frame(dt: number) {
    const auto = still ? 0 : 1;
    t += dt * auto;
    intro = Math.min(1, intro + dt / 1.4);
    const e = 1 - Math.pow(1 - intro, 4);

    hover += (hoverT - hover) * damp(6, dt);
    warp += (warpT - warp) * damp(still ? 8 : 3.5, dt);
    look.x += (look.tx - look.x) * damp(4, dt);
    look.y += (look.ty - look.y) * damp(4, dt);

    // Dragged rotation keeps coasting after release, then settles.
    if (!drag?.moved) {
      user.y += user.vy * dt;
      user.x = Math.max(-1.3, Math.min(1.3, user.x + user.vx * dt));
      const f = Math.exp(-2.6 * dt);
      user.vy *= f; user.vx *= f;
      // Pitch eases back toward level when nobody is holding it.
      user.x *= Math.exp(-0.35 * dt);
    }

    const speedUp = 1 + warp * 7;
    const spin = (0.12 + hover * 0.1) * speedUp;
    rig.rotation.y += dt * spin * auto;
    rig.rotation.y += user.y; user.y = 0;
    rig.rotation.x = -0.25 + user.x + look.y * 0.18;
    rig.position.x = look.x * 0.12;

    burst *= Math.exp(-3.2 * dt);
    flash *= Math.exp(-2.4 * dt);
    const grow = 1 + burst * 0.1 + hover * 0.025;
    rig.scale.setScalar((0.4 + 0.6 * e) * grow);

    shell.rotation.y = -t * 0.2 * speedUp;
    shell.rotation.x = t * 0.1 * speedUp;
    coreMat.uniforms.uTime.value = t * (1 + warp * 3);
    coreMat.uniforms.uBoost.value = Math.min(1, flash * 0.9 + hover * 0.12 + warp * 0.25);
    shellMat.opacity = (0.35 + hover * 0.2 + warp * 0.2) * e;
    points.rotation.y = t * 0.03 * speedUp;
    points.rotation.x = look.y * 0.08;
    points.scale.setScalar(1 + burst * 0.4);
    pm.opacity = (0.75 - burst * 0.25) * e;

    for (const r of rings) {
      r.phase += dt * r.speed * 2.2 * speedUp * auto;
      r.bead.position.set(Math.cos(r.phase) * r.r, Math.sin(r.phase) * r.r, 0);
      r.m.opacity = 0.55 + hover * 0.25 + warp * 0.2;
    }
    secExtra += dt * warp * 10;
    const a = ((Date.now() % 60000) / 60000) * TAU - Math.PI / 2 + secExtra;
    secBead.position.set(Math.cos(a) * 3.25, Math.sin(a) * 3.25, 0);
    secBead.scale.setScalar(1 + 0.25 * Math.sin(t * 6) + warp * 0.5);

    if (waveT < 1) {
      waveT = Math.min(1, waveT + dt / 1.15);
      const k = 1 - Math.pow(1 - waveT, 3);
      wave.scale.setScalar(0.9 + k * 3.4);
      waveMat.opacity = 0.85 * (1 - waveT);
      if (waveT >= 1) wave.visible = false;
    }

    renderer.render(scene, camera);
  }

  function loop(now: number) {
    raf = 0;
    if (stopped) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (visible && !document.hidden) {
      frame(dt);
      // Adaptive quality: if the first seconds run slow, step the pixel ratio down.
      if (samples < 90) {
        samples++;
        if (dt > 0.026) slow++;
        if (samples === 90 && slow > 35 && dpr > 0.8) {
          dpr = Math.max(0.75, dpr - 0.5);
          renderer.setPixelRatio(dpr);
          resize();
        }
      }
    }
    // With reduced motion the loop sleeps once the orb has been left alone.
    if (still && now > idleUntil && !drag && Math.abs(user.vy) + Math.abs(user.vx) < 0.01 && waveT >= 1 && warp < 0.01) return;
    raf = requestAnimationFrame(loop);
  }
  function request() {
    if (raf || stopped) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; last = performance.now(); if (visible) request(); });
  io.observe(host);

  if (still) {
    intro = 1;
    frame(0);
  } else {
    request();
  }

  return {
    setProgress(p) { setProgress(p); kick(300); },
    dispose() {
      stopped = true;
      window.clearTimeout(holdTimer);
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
      mq.removeEventListener("change", recolor);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onCancel);
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("keydown", onKey);
      if (arc) arc.geometry.dispose();
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}

export function TimeOrb({ progress, faint }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const handle = useRef<Handle | null>(null);
  const latest = useRef(progress);
  latest.current = progress;
  const [used, setUsed] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el || !webglOk()) return;
    let cancelled = false;
    void import("three").then((THREE) => {
      if (cancelled) return;
      handle.current = build(THREE, el, latest.current, () => setUsed(true));
    });
    return () => {
      cancelled = true;
      handle.current?.dispose();
      handle.current = null;
    };
  }, []);

  useEffect(() => {
    handle.current?.setProgress(progress);
  }, [progress]);

  return (
    <div
      className={`orb3d${faint ? " faint" : ""}`}
      ref={host}
      tabIndex={0}
      role="group"
      aria-label="Interactive 3D orb. Drag or use arrow keys to spin it, tap or press Enter to pulse, hold to speed up time."
    >
      <span className={`orb-hint${used ? " gone" : ""}`} aria-hidden="true">
        <Ic icon={Hand} size={14} /> Drag to spin · tap to pulse · hold to warp
      </span>
    </div>
  );
}
