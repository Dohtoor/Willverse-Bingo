// Loading and reading prompts.txt.

// One prompt per line. Blank lines and lines starting with # are ignored,
// except "# version: X", which is picked up as the file's version.
export function parsePrompts(text) {
  const list = [];
  let version = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      const m = line.match(/^#\s*version\s*:\s*(.+)$/i);
      if (m) version = m[1].trim();
      continue;
    }
    list.push(line);
  }
  // Drop exact duplicates so one prompt can't appear twice on a sheet
  return { prompts: [...new Set(list)], version };
}

// Fetches and parses the prompts file. Throws if it can't be loaded.
export async function loadPrompts(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return parsePrompts(await res.text());
}
