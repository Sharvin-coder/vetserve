// WCAG contrast gate for the design tokens.
// Parses web/styles/tokens.css and fails (exit 1) if any pair used in the UI
// regresses below its threshold. Runs automatically before `next dev` and
// `next build` (see web/package.json pre-scripts).

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const tokensPath = join(dirname(fileURLToPath(import.meta.url)), "..", "web", "styles", "tokens.css");
const css = readFileSync(tokensPath, "utf8");

function token(name) {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`Token --${name} not found (or not a hex literal) in tokens.css`);
  return m[1];
}

function srgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
}

function luminance(hex) {
  const [r, g, b] = srgb(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(fg, bg) {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

// Tints are ink-text-only surfaces; mix() mirrors the color-mix() in tokens.css.
function mix(hex, pct, baseHex) {
  const c = srgb(hex).map((v) => v * 255);
  const base = srgb(baseHex).map((v) => v * 255);
  const out = c.map((v, i) => Math.round(v * pct + base[i] * (1 - pct)));
  return "#" + out.map((v) => v.toString(16).padStart(2, "0")).join("");
}

const t = {
  bg: token("bg"),
  surface: token("surface"),
  ink: token("ink"),
  inkMuted: token("ink-muted"),
  primary: token("primary"),
  primaryInk: token("primary-ink"),
  accent: token("accent"),
  success: token("success"),
  warn: token("warn"),
  danger: token("danger"),
};

const tints = {
  accentTint: mix(t.accent, 0.10, t.surface),
  successTint: mix(t.success, 0.09, t.surface),
  warnTint: mix(t.warn, 0.10, t.surface),
  dangerTint: mix(t.danger, 0.08, t.surface),
  primaryTint: mix(t.primary, 0.08, t.surface),
};

// [description, fg, bg, minimum]
// Body text targets AAA (7:1); interactive/status text targets AA (4.5:1).
// Colored text only ever sits on --surface or --bg per the component rules;
// tints carry ink text (checked below).
const pairs = [
  ["body ink on page bg", t.ink, t.bg, 7],
  ["body ink on surface", t.ink, t.surface, 7],
  ["muted ink on page bg", t.inkMuted, t.bg, 4.5],
  ["muted ink on surface", t.inkMuted, t.surface, 4.5],
  ["primary (links/buttons-as-text) on page bg", t.primary, t.bg, 4.5],
  ["primary on surface", t.primary, t.surface, 4.5],
  ["primary-ink on primary (button label)", t.primaryInk, t.primary, 4.5],
  ["accent (citation markers) on surface", t.accent, t.surface, 4.5],
  ["accent on page bg", t.accent, t.bg, 4.5],
  ["primary-ink on accent (active citation marker)", t.primaryInk, t.accent, 4.5],
  ["success text on surface", t.success, t.surface, 4.5],
  ["warn text on surface", t.warn, t.surface, 4.5],
  ["danger text on surface", t.danger, t.surface, 4.5],
  ["primary-ink on danger (danger button label)", t.primaryInk, t.danger, 4.5],
  ["ink on primary-tint (info banner text)", t.ink, tints.primaryTint, 7],
  ["ink on warn-tint (warn banner text)", t.ink, tints.warnTint, 7],
  ["ink on danger-tint (crisis banner text)", t.ink, tints.dangerTint, 7],
  ["ink on success-tint", t.ink, tints.successTint, 7],
  ["ink on accent-tint (highlighted excerpt)", t.ink, tints.accentTint, 7],
  ["danger error text on surface", t.danger, t.surface, 4.5],
];

let failed = false;
const rows = pairs.map(([desc, fg, bg, min]) => {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed = true;
  return { pair: desc, fg, bg, ratio: r.toFixed(2), min, ok: ok ? "pass" : "FAIL" };
});

console.log("\nToken contrast check (WCAG)\n");
console.table(rows);

if (failed) {
  console.error("Contrast regression: fix the token or the usage before building.");
  process.exit(1);
}
console.log("All pairs pass.\n");
