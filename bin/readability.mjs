// Readability of a short text, no dependencies. These are numbers to watch, not grades to
// pass, and sentence and word splitting is simple on purpose.
//
// Flesch reading ease, Flesch (1948), "A new readability yardstick", Journal of Applied
// Psychology 32(3), counts syllables per word and words per sentence in English.
// Ateşman (1997), "Türkçede okunabilirliğin ölçülmesi", Dil Dergisi 58, is the Turkish
// recalibration of the same shape. LIX, Björnsson (1968), counts long words instead of
// syllables.
//
// All three are defined on an alphabet whose words are separated by spaces and whose
// syllables can be counted from runs of Latin vowels. Every other script breaks at least one
// of those assumptions: some are written without spaces between words, some without the
// vowels being counted, and for the rest, including Cyrillic, Greek and Devanagari, no
// calibration of these formulas is implemented here. So this module scores Latin script and
// refuses everything else by name, because rule 5 of the skill is that a number comes from a
// count, and a refusal is more useful than a confident zero.
// A sentence ends where a run of `.!?` meets whitespace or the end of the text. The split
// happens at the whitespace after one punctuation mark, so a long run of `!` is read once;
// `[.!?]+(\s|$)` retried that run from every position inside it, which is quadratic.
const sentencesOf = (t) => t.split(/(?<=[.!?])(?:\s+|$)/).map((s) => s.trim()).filter((s) => /[\p{L}\p{N}]/u.test(s));
const wordsOf = (t) => t.match(/[\p{L}\p{N}']+/gu) ?? [];

export function syllablesEn(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  let n = (w.replace(/e$/, "").match(/[aeiouy]+/g) ?? []).length;
  if (/le$/.test(w) && !/[aeiouy]le$/.test(w)) n++;
  return Math.max(1, n);
}

export function syllablesTr(word) {
  return Math.max(1, (word.toLowerCase().match(/[aeıioöuüâîû]/g) ?? []).length);
}

export function lix(text) {
  const words = wordsOf(text), sentences = sentencesOf(text);
  if (!words.length || !sentences.length) return 0;
  const long = words.filter((w) => w.length > 6).length;
  return words.length / sentences.length + (100 * long) / words.length;
}

export function flesch(text) {
  const words = wordsOf(text), sentences = sentencesOf(text);
  if (!words.length || !sentences.length) return 0;
  const syl = words.reduce((s, w) => s + syllablesEn(w), 0);
  return 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syl / words.length);
}

export function atesman(text) {
  const words = wordsOf(text), sentences = sentencesOf(text);
  if (!words.length || !sentences.length) return 0;
  const syl = words.reduce((s, w) => s + syllablesTr(w), 0);
  return 198.825 - 40.175 * (syl / words.length) - 2.61 * (words.length / sentences.length);
}

const band = (score, easyAbove, hardBelow) => (score >= easyAbove ? "easy" : score < hardBelow ? "hard" : "medium");

/** Why a script is refused, in the words a reader can check. */
const UNREADABLE = {
  Japanese: "Japanese is not separated into words by spaces, and its syllables are not the vowel runs these formulas count",
  Han: "Chinese is not separated into words by spaces, and its characters carry no vowel syllables to count",
  Hangul: "Korean syllables are written as blocks, not as the vowel runs these formulas count",
  Arabic: "Arabic is normally written without the short vowels these formulas count",
  Hebrew: "Hebrew is normally written without the vowels these formulas count",
  Thai: "Thai is written without spaces between words",
  Cyrillic: "the syllable count here reads Latin letters only, and the Russian recalibration of Flesch is not implemented here",
  Greek: "the syllable count here reads Latin letters only, and no Greek scale is implemented here",
  Devanagari: "the syllable count here reads Latin letters only, and no Hindi or Marathi scale is implemented here",
};

/**
 * Scripts named so a refusal can say which one it saw. Anything with letters outside this
 * list is refused as well, under "another script": the list decides how good the message is,
 * never whether the text is scored.
 */
const SCRIPTS = [
  "Latin", "Cyrillic", "Greek", "Han", "Hiragana", "Katakana", "Hangul", "Arabic", "Hebrew", "Thai",
  "Devanagari", "Bengali", "Gujarati", "Gurmukhi", "Kannada", "Malayalam", "Oriya", "Sinhala", "Tamil", "Telugu",
  "Armenian", "Georgian", "Ethiopic", "Khmer", "Lao", "Myanmar", "Tibetan", "Syriac", "Thaana", "Adlam", "Nko",
  "Mongolian", "Cherokee", "Tifinagh", "Javanese", "Balinese", "Yi", "Vai",
];

/**
 * The script most of the letters are in, or "Latin" when there are no letters at all.
 * Kana anywhere means Japanese, even when kanji outnumber it, which is the usual case.
 * Letters in a script this list does not name return "another script", which is refused too:
 * before that, a paragraph in Hindi, Tamil or Greek fell through to "Latin" and was scored.
 */
export function scriptOf(text) {
  const counts = new Map();
  for (const name of SCRIPTS) {
    const n = (text.match(new RegExp(`\\p{Script=${name}}`, "gu")) ?? []).length;
    if (n) counts.set(name, n);
  }
  if (!counts.size) return /\p{L}/u.test(text) ? "another script" : "Latin";
  if (counts.has("Hiragana") || counts.has("Katakana")) return "Japanese";
  const [top, topCount] = [...counts].sort((a, b) => b[1] - a[1])[0];
  const letters = (text.match(/\p{L}/gu) ?? []).length;
  // A named script that is not even half the letters means the rest are unnamed ones.
  return topCount * 2 >= letters ? top : "another script";
}

/**
 * { name, score, band, lix } for the block; name is the language-specific scale.
 * For a script no scale here covers, { name: null, script, reason } and no numbers.
 */
export function readability(text, lang = "en") {
  const script = scriptOf(text);
  if (script !== "Latin") {
    const reason = UNREADABLE[script] ?? "these formulas are defined on the Latin alphabet, and the syllable count here reads Latin letters only";
    return { name: null, score: null, band: null, lix: null, script, reason };
  }
  const l = lix(text);
  if (lang === "tr") {
    const s = atesman(text);
    return { name: "Ateşman", score: Math.round(s), band: band(s, 70, 50), lix: Math.round(l), script };
  }
  const s = flesch(text);
  return { name: "Flesch", score: Math.round(s), band: band(s, 60, 30), lix: Math.round(l), script };
}
