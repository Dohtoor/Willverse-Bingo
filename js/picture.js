// "Save picture": draws the sheet onto a canvas in the current theme and
// state, then downloads it as a PNG (or opens the share sheet on phones, so
// it can go straight to Photos).

import { SIZE, CENTER } from "./config.js";
import { winningCells, progressText } from "./sheet.js";
import { tokenBreakPoints } from "./hyphenate.js";

export async function savePicture(sheet) {
  const canvas = drawSheet(sheet);
  const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
  if (!blob) throw new Error("Could not create the picture");

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `commander-bingo-${stamp}.png`;
  const file = new File([blob], filename, { type: "image/png" });

  const isPhone = matchMedia("(pointer: coarse)").matches;
  if (isPhone && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "My Commander Bingo sheet" });
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
  const gridTop = 240;
  const cell = (W - pad * 2 - gap * (SIZE - 1)) / SIZE;
  const gridH = cell * SIZE + gap * (SIZE - 1);
  const H = gridTop + gridH + 110;

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);

  // Title: big "THE COMMANDER" above a small BIN + GO (GO in the accent colour)
  ctx.textBaseline = "alphabetic";
  ctx.font = `900 80px ${family}`;
  ctx.fillStyle = c.ink;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "3px";
  ctx.fillText("THE COMMANDER", pad, 130);
  ctx.font = `900 36px ${family}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "5px";
  ctx.fillStyle = c.muted;
  ctx.fillText("BIN", pad, 190);
  const binW = ctx.measureText("BIN").width;
  ctx.fillStyle = c.accent;
  ctx.fillText("GO", pad + binW, 190);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

  // Progress, right-aligned
  ctx.textAlign = "right";
  ctx.font = `600 34px ${family}`;
  ctx.fillStyle = c.muted;
  ctx.fillText(progressText(sheet), W - pad, 190);
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

// Splits text into lines that fit maxW. With `hyphenate`, long words may be split
// at a syllable break ("over-" / "powered"); words that still don't fit are broken by letter.
function wrapLines(ctx, text, maxW, hyphenate) {
  const fits = s => ctx.measureText(s).width <= maxW;
  const lines = [];
  let line = "";
  const push = part => {
    const test = line ? line + " " + part : part;
    if (fits(test) || !line) line = test;
    else { lines.push(line); line = part; }
  };
  for (let word of text.split(/\s+/).filter(Boolean)) {
    if (hyphenate) {
      // Fill the rest of the current line with as much of the word as fits
      while (!fits(line ? line + " " + word : word)) {
        const room = line ? line + " " : "";
        const p = tokenBreakPoints(word).reverse().find(p => fits(room + word.slice(0, p) + "-"));
        if (p === undefined) {
          if (!line) break;       // nothing fits even on an empty line
          lines.push(line); line = ""; // try again on a fresh line
          continue;
        }
        lines.push(room + word.slice(0, p) + "-");
        line = "";
        word = word.slice(p);
      }
    }
    if (fits(word)) { push(word); continue; }
    lines.letterBroken = true;
    let chunk = "";
    for (const ch of word) {
      if (!fits(chunk + ch + "-") && chunk) { push(chunk + "-"); chunk = ""; }
      chunk += ch;
    }
    if (chunk) push(chunk);
  }
  if (line) lines.push(line);
  return lines;
}

// Largest font size that fits the box. Splitting words with a hyphen is only used
// when it keeps the text noticeably bigger than fitting whole words.
function fitText(ctx, text, family, weight, start, maxW, maxH) {
  const best = hyphenate => {
    for (let size = start; size >= 12; size -= 1) {
      ctx.font = `${weight} ${size}px ${family}`;
      const lines = wrapLines(ctx, text, maxW, hyphenate);
      const clean = !lines.letterBroken && lines.every(l => ctx.measureText(l).width <= maxW);
      if (clean && lines.length * size * 1.15 <= maxH) return { size, lines };
    }
    return null;
  };
  const plain = best(false);
  const hy = best(true);
  const pick = hy && (!plain || hy.size >= plain.size * 1.2) ? hy : plain;
  if (pick) {
    ctx.font = `${weight} ${pick.size}px ${family}`;
    return pick;
  }
  ctx.font = `${weight} 12px ${family}`;
  return { size: 12, lines: wrapLines(ctx, text, maxW, true) };
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
