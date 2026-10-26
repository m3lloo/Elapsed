/** Renders the shareable snapshot as a PNG, using the page's current theme tokens. */
export async function makeCard(o: { name: string; hours: string; age: string }): Promise<Blob> {
  const W = 1200;
  const H = 630;
  const cs = getComputedStyle(document.documentElement);
  const tok = (n: string) => cs.getPropertyValue(n).trim();
  try {
    await Promise.all([
      document.fonts.load('700 100px "Geist Mono"'),
      document.fonts.load('700 40px "Geist"'),
      document.fonts.load('400 32px "Geist"'),
    ]);
  } catch {
    /* fall back to system fonts */
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");

  ctx.fillStyle = tok("--bg");
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W, 0, 0, W, 0, 720);
  glow.addColorStop(0, tok("--accent-soft"));
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const pad = 72;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = tok("--ink");
  ctx.font = '700 40px "Geist", system-ui, sans-serif';
  ctx.fillText("Elapsed", pad, pad + 32);

  ctx.fillStyle = tok("--muted");
  ctx.font = '400 34px "Geist", system-ui, sans-serif';
  ctx.fillText(o.name, pad, 230);

  let size = 170;
  ctx.font = `700 ${size}px "Geist Mono", ui-monospace, monospace`;
  while (ctx.measureText(o.hours).width > W - pad * 2 && size > 40) {
    size -= 4;
    ctx.font = `700 ${size}px "Geist Mono", ui-monospace, monospace`;
  }
  ctx.fillStyle = tok("--ink");
  ctx.fillText(o.hours, pad, 230 + size + 10);

  ctx.fillStyle = tok("--accent");
  ctx.font = '700 44px "Geist", system-ui, sans-serif';
  ctx.fillText("hours alive", pad, 230 + size + 80);

  ctx.fillStyle = tok("--muted");
  ctx.font = '400 32px "Geist", system-ui, sans-serif';
  ctx.fillText(o.age, pad, H - pad);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image"))), "image/png"),
  );
}
