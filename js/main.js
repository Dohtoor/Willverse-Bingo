// Entry point: loads the prompts, restores or creates the sheet, and wires
// up the buttons. Each part of the app lives in its own module:
//   config.js     settings and winning lines
//   storage.js    localStorage
//   prompts.js    reading prompts.txt
//   sheet.js      creating sheets, wins, progress text
//   board.js      drawing the grid on the page
//   celebrate.js  "BINGO!" banner and confetti
//   picture.js    "Save picture"
//   theme.js      light / dark button (theme-init.js sets the starting theme)

import { PROMPTS_URL, NEEDED } from "./config.js";
import { loadSheet, saveSheet } from "./storage.js";
import { loadPrompts } from "./prompts.js";
import { createSheet, isValidSheet, progressText, takeNewBingo, isBlackout } from "./sheet.js";
import { createBoard } from "./board.js";
import { celebrate } from "./celebrate.js";
import { savePicture } from "./picture.js";
import { initThemeToggle } from "./theme.js";

const $board = document.getElementById("board");
const $progress = document.getElementById("progress");
const $reroll = document.getElementById("reroll");
const $save = document.getElementById("save");
const $error = document.getElementById("error");

let prompts = [];
let fileVersion = null;
let sheet = null;

const board = createBoard($board, { onToggle: toggleSquare });

function show() {
  board.render(sheet);
  $progress.textContent = progressText(sheet);
}

function toggleSquare(i) {
  sheet.marked[i] = !sheet.marked[i];
  board.update(sheet);
  $progress.textContent = progressText(sheet);
  if (takeNewBingo(sheet)) celebrate(isBlackout(sheet));
  saveSheet(sheet);
}

// ---- New sheet: two taps to confirm instead of a browser dialog ----------
let confirmTimer = null;

function resetRerollButton() {
  clearTimeout(confirmTimer);
  $reroll.classList.remove("confirm");
  $reroll.textContent = "New sheet";
}

$reroll.addEventListener("click", () => {
  if (!$reroll.classList.contains("confirm")) {
    $reroll.classList.add("confirm");
    $reroll.textContent = "Tap again to replace your sheet";
    confirmTimer = setTimeout(resetRerollButton, 3500);
    return;
  }
  resetRerollButton();
  sheet = createSheet(prompts, fileVersion);
  saveSheet(sheet);
  show();
});

// ---- Save picture -------------------------------------------------------
$save.addEventListener("click", async () => {
  if (!sheet) return;
  $save.disabled = true;
  try {
    await savePicture(sheet);
  } catch (err) {
    console.error(err);
  } finally {
    $save.disabled = false;
  }
});

// ---- Errors -------------------------------------------------------------
function showError(title, html) {
  $board.style.display = "none";
  document.querySelector(".controls").style.display = "none";
  $error.style.display = "block";
  $error.innerHTML = `<h2>${title}</h2><div>${html}</div>`;
}

// ---- Start --------------------------------------------------------------
async function init() {
  const saved = loadSheet();

  try {
    ({ prompts, version: fileVersion } = await loadPrompts(PROMPTS_URL));
  } catch (err) {
    // If the prompts can't be loaded but a sheet is saved, still show it
    if (isValidSheet(saved)) {
      sheet = saved;
      $reroll.disabled = true;
      $reroll.title = "Prompts could not be loaded right now";
      show();
      return;
    }
    showError("Couldn't load the prompts",
      `The file <code>${PROMPTS_URL}</code> couldn't be loaded (${err.message}). ` +
      `Make sure it sits next to <code>index.html</code> and that the page is opened ` +
      `through a web server, not directly from disk.`);
    return;
  }

  if (prompts.length < NEEDED) {
    showError("Not enough prompts",
      `<code>${PROMPTS_URL}</code> has ${prompts.length} unique prompt${prompts.length === 1 ? "" : "s"}, ` +
      `but a sheet needs at least ${NEEDED} (the first one for the centre square, plus 24 more).`);
    return;
  }

  // Reuse the saved sheet unless the file's version number changed
  if (isValidSheet(saved) && (saved.version ?? null) === fileVersion) {
    sheet = saved;
    if (!Array.isArray(sheet.announced)) sheet.announced = [];
  } else {
    sheet = createSheet(prompts, fileVersion);
    saveSheet(sheet);
  }
  show();
}

initThemeToggle(document.getElementById("theme"));
init();
