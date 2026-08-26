// Copies NEXT_PUBLIC_* values from the repo-root .env into web/.env.local,
// where Next.js actually reads them. Runs automatically before `npm run dev`
// and `npm run build` (see web/package.json) so the README's "everything in
// one .env" promise holds.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, ".env");
const dest = join(root, "web", ".env.local");

if (!existsSync(src)) {
  console.log("[sync_env] no root .env yet — copy .env.example first");
  process.exit(0);
}

const lines = readFileSync(src, "utf8")
  .split(/\r?\n/)
  .filter((l) => /^NEXT_PUBLIC_[A-Z0-9_]+=/.test(l.trim()));

const banner = "# generated from the repo-root .env by scripts/sync_env.mjs — edit that file instead\n";
const next = banner + lines.join("\n") + "\n";
const prev = existsSync(dest) ? readFileSync(dest, "utf8") : "";
if (next !== prev) {
  writeFileSync(dest, next);
  console.log(`[sync_env] wrote ${lines.length} NEXT_PUBLIC_* value(s) to web/.env.local`);
}
