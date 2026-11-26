// Runs in <head> before the page paints, so there's no flash of the wrong theme.
// This is a plain (non-module) script on purpose: modules run too late for this.
// Uses the saved choice if there is one, otherwise the device's light/dark setting.
(function () {
  var t = null;
  try { t = localStorage.getItem("bingo-theme"); } catch (e) {}
  if (t !== "light" && t !== "dark") {
    t = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.dataset.theme = t;
})();
