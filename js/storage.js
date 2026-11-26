// Reading and writing localStorage.
// Every call is wrapped: storage can be missing or blocked in some browsers
// (private modes, strict settings), and the app should keep working anyway.

import { SHEET_KEY, THEME_KEY } from "./config.js";

export function loadSheet() {
  try { return JSON.parse(localStorage.getItem(SHEET_KEY)); } catch { return null; }
}

export function saveSheet(sheet) {
  try { localStorage.setItem(SHEET_KEY, JSON.stringify(sheet)); } catch { /* ignore */ }
}

export function saveTheme(theme) {
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
}
