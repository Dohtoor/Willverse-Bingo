// Settings shared by the whole app.

export const PROMPTS_URL = "prompts.txt";

// localStorage keys
export const SHEET_KEY = "bingo-sheet";
export const THEME_KEY = "bingo-theme"; // also used in theme-init.js

// Board shape
export const SIZE = 5;
export const CENTER = 12; // the middle square, filled by the first prompt in prompts.txt
export const NEEDED = SIZE * SIZE; // 25: the centre prompt plus 24 more

// All 12 winning lines: 5 rows, 5 columns, 2 diagonals
export const LINES = [];
for (let r = 0; r < SIZE; r++) LINES.push([0, 1, 2, 3, 4].map(c => r * SIZE + c));
for (let c = 0; c < SIZE; c++) LINES.push([0, 1, 2, 3, 4].map(r => r * SIZE + c));
LINES.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);
