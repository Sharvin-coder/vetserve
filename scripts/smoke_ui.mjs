// UI smoke test: every route serves and carries its key content.
//   node scripts/smoke_ui.mjs   (web dev server must be running)

const BASE = process.env.WEB_URL ?? "http://localhost:3000";

const CHECKS = [
  ["/", ["Straight answers about benefits", "Built in Katy for TX-22", "Veterans Crisis Line"]],
  // needles must exist in the server-rendered (signed-out) HTML; note the
  // curly apostrophes Next renders for ’
  ["/guide", ["VetGuide", "Ask VetGuide", "People who can help", "official advice"]],
  ["/account", ["Sign in", "Create account"]],
  // auth-dependent screens SSR differently signed-out vs loading; "a|b" = either
  ["/board", ["Task board"]],
  ["/post", ["Posting is for veterans|Post a task"]],
  ["/hours", ["hours"]],
  ["/styleguide", ["Styleguide", "Citations", "Status pills"]],
  ["/status", ["System check", "run locally"]],
  ["/verify/TEST-CODE-0000", ["Hours verification"]],
];

let failed = 0;
for (const [path, needles] of CHECKS) {
  try {
    const resp = await fetch(BASE + path);
    const html = await resp.text();
    const missing = needles.filter((n) => !n.split("|").some((alt) => html.includes(alt)));
    if (!resp.ok || missing.length) {
      failed++;
      console.log(`FAIL ${path} — status ${resp.status}${missing.length ? `, missing: ${missing.join("; ")}` : ""}`);
    } else {
      console.log(`ok   ${path}`);
    }
  } catch (e) {
    failed++;
    console.log(`FAIL ${path} — ${e.message}`);
  }
}
console.log(failed ? `\n${failed} route(s) failing` : "\nAll routes pass.");
process.exit(failed ? 1 : 0);
