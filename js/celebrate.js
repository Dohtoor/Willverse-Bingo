// The "BINGO!" banner and confetti.

const COLORS = ["#ffc928", "#f5b800", "#ffe27a", "#e08a00", "#fff1b8"];

let bannerTimer;

export function celebrate(blackout) {
  const banner = document.getElementById("banner");
  banner.textContent = blackout ? "BLACKOUT!" : "BINGO!";
  banner.classList.add("show");
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => banner.classList.remove("show"), 1800);
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) confetti();
}

function confetti() {
  const canvas = document.getElementById("confetti");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.scale(dpr, dpr);
  const parts = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2 + (Math.random() - .5) * 80,
    y: innerHeight * 0.4,
    vx: (Math.random() - .5) * 14,
    vy: -Math.random() * 14 - 4,
    r: Math.random() * 6 + 4,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - .5) * .3,
    c: COLORS[Math.floor(Math.random() * COLORS.length)]
  }));
  const start = performance.now();
  (function frame(t) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.35; p.vx *= 0.99;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
      ctx.restore();
    }
    if (t - start < 2600) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })(start);
}
