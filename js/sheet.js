// The bingo sheet itself: creating one, checking it, and working out wins.
// A sheet is a plain object, so it can be saved as JSON:
// { version, cells: string[25], marked: bool[25], announced: number[], created }

import { CENTER, NEEDED, LINES } from "./config.js";

function randomInt(max) {
  if (window.crypto && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / max) * max; // avoids bias
    do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
    return buf[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// The first prompt always goes in the centre; 24 random others fill the rest.
export function createSheet(prompts, version) {
  const [centre, ...rest] = prompts;
  const picked = shuffle(rest).slice(0, NEEDED - 1);
  const cells = [...picked.slice(0, CENTER), centre, ...picked.slice(CENTER)];
  return {
    version,
    cells,
    marked: cells.map(() => false),
    announced: [],
    created: Date.now()
  };
}

export function isValidSheet(s) {
  return !!s && Array.isArray(s.cells) && s.cells.length === NEEDED &&
         Array.isArray(s.marked) && s.marked.length === NEEDED;
}

// Indexes (into LINES) of every completed line
export function completedLines(sheet) {
  return LINES.map((line, i) => line.every(idx => sheet.marked[idx]) ? i : -1).filter(i => i >= 0);
}

// Set of square indexes that are part of a completed line
export function winningCells(sheet) {
  return new Set(completedLines(sheet).flatMap(i => LINES[i]));
}

export function markedCount(sheet) {
  return sheet.marked.filter(Boolean).length;
}

export function isBlackout(sheet) {
  return markedCount(sheet) === sheet.cells.length;
}

// "7/25 marked · 1 bingo"
export function progressText(sheet) {
  const lines = completedLines(sheet).length;
  return `${markedCount(sheet)}/${sheet.cells.length} marked` +
    (lines ? ` · ${lines} bingo${lines > 1 ? "s" : ""}` : "");
}

// Returns true if a line was completed that hasn't been celebrated yet,
// and records it. Lines that are no longer complete are forgotten, so
// un-marking and re-marking a square celebrates again.
export function takeNewBingo(sheet) {
  if (!Array.isArray(sheet.announced)) sheet.announced = [];
  const done = completedLines(sheet);
  const fresh = done.filter(i => !sheet.announced.includes(i));
  sheet.announced = sheet.announced.filter(i => done.includes(i)).concat(fresh);
  return fresh.length > 0;
}
