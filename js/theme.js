// The light / dark toggle button.
// The starting theme is set earlier by theme-init.js, before the page paints.

import { saveTheme } from "./storage.js";

export function initThemeToggle(button) {
  const root = document.documentElement;
  const nextTheme = () => (root.dataset.theme === "dark" ? "light" : "dark");

  function syncLabel() {
    const label = `Switch to ${nextTheme()} mode`;
    button.setAttribute("aria-label", label);
    button.title = label;
  }

  button.addEventListener("click", () => {
    const next = nextTheme();
    root.dataset.theme = next;
    saveTheme(next);
    syncLabel();
  });

  syncLabel();
}
