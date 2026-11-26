// Drawing the 5×5 grid on the page and keeping it in sync with the sheet.

import { CENTER } from "./config.js";
import { winningCells } from "./sheet.js";

export function createBoard(boardEl, { onToggle }) {
  // One click listener for the whole board
  boardEl.addEventListener("click", e => {
    const el = e.target.closest(".cell");
    if (el) onToggle(Number(el.dataset.i));
  });

  // Refit text when the window size changes
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitAll, 120);
  });

  // Builds the squares from scratch (on load and after a new sheet)
  function render(sheet) {
    boardEl.innerHTML = "";
    sheet.cells.forEach((text, i) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "cell";
      el.dataset.i = i;
      el.setAttribute("role", "gridcell");
      const span = document.createElement("span");
      span.className = "txt";
      span.textContent = text;
      el.appendChild(span);
      if (i === CENTER) el.classList.add("free");
      boardEl.appendChild(el);
    });
    update(sheet);
    requestAnimationFrame(fitAll);
  }

  // Updates marked / winning states without rebuilding
  function update(sheet) {
    const win = winningCells(sheet);
    [...boardEl.children].forEach((el, i) => {
      el.classList.toggle("marked", sheet.marked[i]);
      el.classList.toggle("win", win.has(i));
      el.setAttribute("aria-pressed", sheet.marked[i] ? "true" : "false");
    });
  }

  // Shrinks the text in each square until it fits
  function fitAll() {
    for (const el of boardEl.children) {
      const span = el.firstChild;
      const h = el.clientHeight, w = el.clientWidth;
      // The centre square starts larger (it's usually short, like "FREE") and shrinks to fit like the rest
      let size = el.classList.contains("free")
        ? Math.min(w / 3.6, 28)
        : Math.max(10, Math.min(20, w / 5.2));
      el.style.fontSize = size + "px";
      const padY = parseFloat(getComputedStyle(el).paddingTop) * 2;
      const range = document.createRange();
      range.selectNodeContents(span);
      const tooBig = () => {
        const r = range.getBoundingClientRect();
        return r.height > h - padY - 4 || r.width > span.clientWidth + 0.5;
      };
      el.style.overflowWrap = "normal"; // let long words overflow so we can detect them
      while (size > 7 && tooBig()) {
        size -= 0.5;
        el.style.fontSize = size + "px";
      }
      // Last resort at minimum size: hyphenate, then break very long words
      el.style.hyphens = tooBig() ? "auto" : "";
      el.style.overflowWrap = "";
    }
  }

  return { render, update };
}
