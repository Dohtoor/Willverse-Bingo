// Drawing the 5×5 grid on the page and keeping it in sync with the sheet.

import { CENTER } from "./config.js";
import { winningCells } from "./sheet.js";
import { softHyphenate } from "./hyphenate.js";

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

  // Refit once web/system fonts finish loading, since that changes text widths
  document.fonts?.ready.then(() => boardEl.children.length && fitAll());

  // Updates marked / winning states without rebuilding
  function update(sheet) {
    const win = winningCells(sheet);
    [...boardEl.children].forEach((el, i) => {
      el.classList.toggle("marked", sheet.marked[i]);
      el.classList.toggle("win", win.has(i));
      el.setAttribute("aria-pressed", sheet.marked[i] ? "true" : "false");
    });
  }

  // Shrinks the text in each square until it fits. Long words are only split
  // (with a proper hyphen, e.g. "over-powered") when that lets the text stay
  // noticeably bigger than squeezing the whole word onto one line.
  function fitAll() {
    for (const el of boardEl.children) {
      const span = el.firstChild;
      const text = span.dataset.text ?? span.textContent;
      span.dataset.text = text;
      const hyphenated = softHyphenate(text);
      const h = el.clientHeight;
      // The centre square starts larger (it's usually short, like "FREE") and shrinks to fit like the rest
      const start = el.classList.contains("free")
        ? Math.min(el.clientWidth / 3.6, 28)
        : Math.max(10, Math.min(20, el.clientWidth / 5.2));
      const padY = parseFloat(getComputedStyle(el).paddingTop) * 2;
      const range = document.createRange();
      const tooBig = () => {
        range.selectNodeContents(span);
        const r = range.getBoundingClientRect();
        // Exact (unrounded) width, with a hair of margin so a word that only just fits isn't cut
        return r.height > h - padY - 4 || r.width > span.getBoundingClientRect().width - 0.5;
      };
      // Largest size (down to 7px) at which the given text fits without cutting words
      const fit = t => {
        span.textContent = t;
        let size = start;
        el.style.fontSize = size + "px";
        while (size > 7 && tooBig()) {
          size -= 0.5;
          el.style.fontSize = size + "px";
        }
        return { size, ok: !tooBig() };
      };

      el.style.overflowWrap = "normal"; // let long words overflow so we can detect them
      const plain = fit(text);
      let best = { ...plain, t: text };
      if (hyphenated !== text && (!plain.ok || plain.size < start)) {
        const hy = fit(hyphenated);
        if ((hy.ok && !plain.ok) || hy.size >= plain.size * 1.2) best = { ...hy, t: hyphenated };
      }
      span.textContent = best.t;
      el.style.fontSize = best.size + "px";
      el.style.overflowWrap = ""; // last resort: break a word that still doesn't fit
    }
  }

  return { render, update };
}
