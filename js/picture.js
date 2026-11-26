// "Save picture": draws the sheet onto a canvas in the current theme and
// state, then downloads it as a PNG (or opens the share sheet on phones, so
// it can go straight to Photos).

import { SIZE, CENTER } from "./config.js";
import { winningCells, progressText } from "./sheet.js";

export async function savePicture(sheet) {
  const canvas = drawSheet(sheet);
  const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
  if (!blob) throw new Error("Could not create the picture");

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `bingo-${stamp}.png`;
  const file = new File([blob], filename, { type: "image/png" });

  const isPhone = matchMedia("(pointer: coarse)").matches;
  if (isPhone && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "My bingo sheet" });
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return; // user closed the share sheet
      // any other error: fall through to a normal download
    }
  }
  downloadBlob(blob, filename);
}

function drawSheet(sheet) {
  // Read colours from the CSS variables, so the picture matches the current theme
  const css = getComputedStyle(document.documentElement);
  const v = name => css.getPropertyValue(name).trim();
  const c = {
    bg: v("--bg"), ink: v("--ink"), muted: v("--muted"), card: v("--card"),
    line: v("--line"), accent: v("--accent"), mark: v("--mark"),
    markInk: v("--mark-ink"), win: v("--win")
  };
  const family = getComputedStyle(document.body).fontFamily;

  const W = 1080, pad = 60, gap = 14;
  const gridTop = 190;
  const cell = (W - pad * 2 - gap * (SIZE - 1)) / SIZE;
  const gridH = cell * SIZE + gap * (SIZE - 1);
  const H = gridTop + gridH + 110;

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);

  // Title: BIN + GO in the accent colour
  ctx.textBaseline = "alphabetic";
  ctx.font = `900 96px ${family}`;
  ctx.fillStyle = c.ink;
  ctx.fillText("BIN", pad, 140);
  const binW = ctx.measureText("BIN").width;
  ctx.fillStyle = c.accent;
  ctx.fillText("GO", pad + binW, 140);

  // Progress, right-aligned
  ctx.textAlign = "right";
  ctx.font = `600 34px ${family}`;
  ctx.fillStyle = c.muted;
  ctx.fillText(progressText(sheet), W - pad, 130);
  ctx.textAlign = "left";

  const win = winningCells(sheet);

  sheet.cells.forEach((text, i) => {
    const x = pad + (i % SIZE) * (cell + gap);
    const y = gridTop + Math.floor(i / SIZE) * (cell + gap);
    const marked = sheet.marked[i];

    roundRect(ctx, x, y, cell, cell, 22);
    ctx.fillStyle = marked ? c.mark : c.card;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = win.has(i) ? c.win : marked ? c.mark : c.line;
    ctx.stroke();
    if (win.has(i)) {
      roundRect(ctx, x + 6, y + 6, cell - 12, cell - 12, 17);
      ctx.lineWidth = 6;
      ctx.strokeStyle = c.win;
      ctx.stroke();
    }

    const free = i === CENTER;
    const inner = cell - 34;
    const { size, lines } = fitText(ctx, text, family, free ? 900 : 700, free ? 44 : 30, inner, inner);
    ctx.fillStyle = marked ? c.markInk : c.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lh = size * 1.15;
    const startY = y + cell / 2 - ((lines.length - 1) * lh) / 2;
    lines.forEach((ln, k) => ctx.fillText(ln, x + cell / 2, startY + k * lh));
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  });

  // Footer with the date
  ctx.font = `500 26px ${family}`;
  ctx.fillStyle = c.muted;
  ctx.textAlign = "center";
  const when = new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  ctx.fillText(when, W / 2, H - 46);
  ctx.textAlign = "left";

  return canvas;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Splits text into lines that fit maxW; very long words are broken by letter
function wrapLines(ctx, text, maxW) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const parts = [];
    if (ctx.measureText(word).width <= maxW) parts.push(word);
    else {
      let chunk = "";
      for (const ch of word) {
        if (ctx.measureText(chunk + ch + "-").width > maxW && chunk) { parts.push(chunk + "-"); chunk = ""; }
        chunk += ch;
      }
      if (chunk) parts.push(chunk);
    }
    for (const part of parts) {
      const test = line ? line + " " + part : part;
      if (ctx.measureText(test).width <= maxW || !line) line = test;
      else { lines.push(line); line = part; }
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Largest font size (with wrapping) that fits the box
function fitText(ctx, text, family, weight, start, maxW, maxH) {
  for (let size = start; size >= 12; size -= 1) {
    ctx.font = `${weight} ${size}px ${family}`;
    const wordsFit = text.split(/\s+/).every(w => ctx.measureText(w).width <= maxW);
    const lines = wrapLines(ctx, text, maxW);
    if (wordsFit && lines.length * size * 1.15 <= maxH) return { size, lines };
  }
  ctx.font = `${weight} 12px ${family}`;
  return { size: 12, lines: wrapLines(ctx, text, maxW) };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
