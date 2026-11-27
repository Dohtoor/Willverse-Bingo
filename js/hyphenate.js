// Lightweight hyphenation for long words, so they wrap as "over-powered"
// instead of being cut anywhere ("overpowere / d"). It works on the browser's
// own soft hyphens (U+00AD), which always show a "-" when a line breaks there,
// so it doesn't depend on the browser shipping a hyphenation dictionary.

export const SHY = "­";

const VOWEL = /[aeiouyàáâäæãåāèéêëēėęîïíīįìôöòóœøōõûüùúůűěýÿ]/i;
// Consonant pairs that sound like one letter and shouldn't be split
const DIGRAPHS = new Set(["th", "ch", "sh", "ph", "wh", "gh", "ck", "qu", "ng"]);
const MIN_WORD = 6;   // shorter words are never hyphenated
const MIN_LEFT = 2;   // letters kept before the hyphen
const MIN_RIGHT = 3;  // letters carried to the next line

const isVowel = (ch, i) => VOWEL.test(ch) && !(i === 0 && /y/i.test(ch));

// Positions where a word may be split (a break goes before word[p])
export function breakPoints(word) {
  const n = word.length;
  if (n < MIN_WORD) return [];
  const v = [...word].map(isVowel);
  const points = [];
  for (let p = MIN_LEFT; p <= n - MIN_RIGHT; p++) {
    const right = word.slice(p);
    if (!v.slice(0, p).some(Boolean) || !v.slice(p).some(Boolean)) continue;
    // Don't strand an ending like "-red" / "-les" / "-ed" (powe-red)
    if (/^[^aeiouy]?e[dsr]?$/i.test(right)) continue;
    const pair = (word[p - 1] + word[p]).toLowerCase();
    if (DIGRAPHS.has(pair)) continue;
    // ma-gic: vowel, consonant, vowel → break before the consonant
    const vcv = v[p - 1] && !v[p] && v[p + 1];
    // mon-ster, over-powered: break after the first consonant of a cluster
    const vccv = p >= 2 && v[p - 2] && !v[p - 1] && !v[p];
    if (vcv || vccv) points.push(p);
  }
  // Long words with no natural split still get a hyphen somewhere sensible
  if (!points.length && n >= 8) {
    for (let p = 3; p <= n - 3; p++) points.push(p);
  }
  return points;
}

// Inserts soft hyphens into every long word of the text
export function softHyphenate(text) {
  return text.replace(/\S+/g, token =>
    tokenBreakPoints(token).reduceRight((w, p) => w.slice(0, p) + SHY + w.slice(p), token)
  );
}

// Break positions within a whole space-free token like "Time(line)",
// hyphenating each run of letters on its own
export function tokenBreakPoints(token) {
  const points = [];
  for (const m of token.matchAll(/\p{L}+/gu)) {
    for (const p of breakPoints(m[0])) points.push(m.index + p);
  }
  return points;
}
