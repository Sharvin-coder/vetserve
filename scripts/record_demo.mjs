// Records the demo-video clips: real browser, real app, one .webm per beat
// of DEMO.md, with human-paced typing and hovers. Voice-over goes on top.
//
//   node scripts/record_demo.mjs            # record every clip in order
//   node scripts/record_demo.mjs crisis hours_pdf   # just these
//
// Needs: web dev server on :3000, API on :8000, Supabase + Ollama up.
// Clips land in demo_clips/ (gitignored). Playwright comes from web/.

import { createRequire } from "node:module";
import { mkdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "web", "package.json"));
const { chromium } = require("playwright");

const BASE = "http://localhost:3000";
const SUPABASE = "http://127.0.0.1:54321";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const PASSWORD = "demo-password-1";
const VET = "vet.okafor@demo.local";
const STUDENT = "priya.n@demo.local";

const OUT = join(root, "demo_clips");
mkdirSync(OUT, { recursive: true });

const RIDE_TITLE = "Ride to my VA appointment on Friday";
const state = { verifyCode: null };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function session(email) {
  const resp = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!resp.ok) throw new Error(`sign-in failed for ${email}: ${resp.status}`);
  return resp.json();
}

/** Record one clip. `as` = email to be signed in as (injected before load). */
async function clip(name, { as = null }, run) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: OUT, size: { width: 1280, height: 800 } },
  });
  if (as) {
    const s = await session(as);
    await context.addInitScript(
      ([k, v]) => localStorage.setItem(k, v),
      ["sb-127-auth-token", JSON.stringify(s)],
    );
  }
  const page = await context.newPage();
  page.setDefaultTimeout(360_000); // CPU generation can be slow
  console.log(`▶ recording ${name}${as ? ` (as ${as})` : ""}`);
  try {
    await run(page);
    await sleep(1500); // settle on the final frame
  } finally {
    const video = page.video();
    await context.close();
    if (video) {
      const target = join(OUT, `${name}.webm`);
      try {
        renameSync(await video.path(), target);
      } catch {
        await video.saveAs(target);
      }
      console.log(`  saved ${target}`);
    }
    await browser.close();
  }
}

async function slowType(page, locator, text) {
  await locator.click();
  await locator.pressSequentially(text, { delay: 48 });
}

async function slowScroll(page, pixels, step = 120) {
  for (let done = 0; done < Math.abs(pixels); done += step) {
    await page.mouse.wheel(0, Math.sign(pixels) * step);
    await sleep(140);
  }
}

// ---------------------------------------------------------------- clips

const CLIPS = {
  // 0:00 landing — hero, live cards, the two halves, offices, footer
  landing: async (page) => {
    await page.goto(BASE);
    await page.getByRole("heading", { name: /Straight answers/ }).waitFor();
    await sleep(3500);
    await slowScroll(page, 900);
    await sleep(2000);
    await slowScroll(page, 900);
    await sleep(2000);
    await slowScroll(page, 900);
    await sleep(2500);
  },

  // 0:30 VetGuide — starter question, streamed answer, citation hovers
  vetguide_answer: async (page) => {
    await page.goto(`${BASE}/guide`);
    await page.getByRole("button", { name: "Who qualifies for VA health care?" }).click();
    // wait for the VALIDATED answer: confidence line appears with the sources
    await page.getByText(/^Confidence:/).waitFor();
    await sleep(2500);
    const markers = page.locator('sup button[aria-label^="Source "]');
    const n = Math.min(await markers.count(), 3);
    for (let i = 0; i < n; i++) {
      await markers.nth(i).hover();
      await sleep(1800);
    }
    await sleep(1500);
  },

  // 1:05 honest refusal
  refusal: async (page) => {
    await page.goto(`${BASE}/guide`);
    await slowType(
      page,
      page.locator("#guide-input"),
      "Can veterans get free concert tickets?",
    );
    await sleep(600);
    await page.getByRole("button", { name: "Ask VetGuide" }).click();
    await page.getByText(/couldn't find this in the official sources/i).waitFor();
    await sleep(3000);
  },

  // 1:20 crisis handling — instant, never reaches the model
  crisis: async (page) => {
    await page.goto(`${BASE}/guide`);
    await slowType(page, page.locator("#guide-input"), "I don't want to be here anymore");
    await sleep(600);
    await page.getByRole("button", { name: "Ask VetGuide" }).click();
    await page.getByText("Veterans Crisis Line").first().waitFor();
    await sleep(4000);
  },

  // 1:35 veteran posts a task — tiles, form, preview, posted steps
  post_task: async (page) => {
    await page.goto(`${BASE}/post`);
    await page.getByRole("button", { name: "A ride" }).click();
    await sleep(800);
    await slowType(page, page.getByLabel("What do you need?"), RIDE_TITLE);
    await slowType(
      page,
      page.getByLabel("Any details? (optional)"),
      "Appointment at 10:30. Takes about an hour.",
    );
    await slowType(page, page.getByLabel("ZIP code"), "77450");
    const hours = page.getByLabel("About how many hours?");
    await hours.fill("");
    await slowType(page, hours, "2");
    await slowType(page, page.getByLabel("Address (optional)"), "88 Demo Court, Katy TX");
    await sleep(800);
    await page.getByRole("button", { name: "Preview task" }).click();
    await page.getByText("This is what students will see.").waitFor();
    await sleep(3000);
    await page.getByRole("button", { name: "Post this task" }).click();
    await page.getByText("Your task is posted.").waitFor();
    await sleep(3500);
  },

  // student claims it from the board
  claim: async (page) => {
    await page.goto(`${BASE}/board`);
    const card = page.locator("article", { hasText: RIDE_TITLE }).first();
    await card.waitFor();
    await sleep(2000);
    await slowScroll(page, 150);
    await card.getByRole("button", { name: "Claim task" }).click();
    await page.getByText("Task claimed.").waitFor();
    await sleep(3000);
  },

  // veteran accepts — the only moment the address unlocks
  accept: async (page) => {
    await page.goto(`${BASE}/tasks/${state.taskId ?? (await findRideTaskId())}`);
    await page.getByRole("button", { name: /^Accept .*help$/ }).waitFor();
    await sleep(2500);
    await page.getByRole("button", { name: /^Accept .*help$/ }).click();
    await page.getByText("can now see the address").waitFor();
    await sleep(3000);
  },

  // student now sees the address; marks done
  address_done: async (page) => {
    await page.goto(`${BASE}/tasks/${state.taskId ?? (await findRideTaskId())}`);
    await page.getByText("Address (visible to you)").waitFor();
    await sleep(3000);
    await page.getByRole("button", { name: "Mark as done" }).click();
    await page.getByText("Marked done. The veteran will confirm.").waitFor();
    await sleep(2500);
  },

  // veteran confirms — note the exact-PDF-line copy on screen
  confirm: async (page) => {
    await page.goto(`${BASE}/tasks/${state.taskId ?? (await findRideTaskId())}`);
    await page.getByText(/Confirming adds this line/).waitFor();
    await sleep(3000);
    await page.getByRole("button", { name: "Confirm this was done" }).click();
    await page.getByText("Confirmed — thank you.").waitFor();
    await sleep(3000);
  },

  // hours table, PDF download, verification code
  hours_pdf: async (page) => {
    await page.goto(`${BASE}/hours`);
    await page.getByText("Your service hours").waitFor();
    await sleep(2500);
    const downloadP = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download verified PDF" }).click();
    const download = await downloadP;
    await download.saveAs(join(OUT, "vetserve-hours.pdf"));
    const code = page.getByText(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    await code.waitFor();
    state.verifyCode = (await code.textContent()).trim();
    console.log(`  verification code: ${state.verifyCode}`);
    await sleep(3500);
  },

  // public verify page for that code
  verify: async (page) => {
    if (!state.verifyCode) throw new Error("run hours_pdf first (needs the code)");
    await page.goto(`${BASE}/verify/${state.verifyCode}`);
    await page.getByText("Hours verification").waitFor();
    await page.getByText(/hours$/).first().waitFor();
    await sleep(4500);
    await slowScroll(page, 300);
    await sleep(2000);
  },
};

const WHO = {
  landing: null,
  vetguide_answer: null,
  refusal: null,
  crisis: null,
  post_task: VET,
  claim: STUDENT,
  accept: VET,
  address_done: STUDENT,
  confirm: VET,
  hours_pdf: STUDENT,
  verify: null,
};

async function findRideTaskId() {
  const s = await session(VET);
  const resp = await fetch("http://localhost:8000/tasks/mine", {
    headers: { Authorization: `Bearer ${s.access_token}` },
  });
  const { posted } = await resp.json();
  const t = posted.find((t) => t.title === RIDE_TITLE && t.status !== "cancelled");
  if (!t) throw new Error("ride task not found — run post_task first");
  state.taskId = t.id;
  return t.id;
}

const order = Object.keys(CLIPS);
const wanted = process.argv.slice(2);
const todo = wanted.length ? order.filter((c) => wanted.includes(c)) : order;
const unknown = wanted.filter((w) => !order.includes(w));
if (unknown.length) {
  console.error(`unknown clip(s): ${unknown.join(", ")}\nknown: ${order.join(", ")}`);
  process.exit(1);
}

for (const name of todo) {
  await clip(name, { as: WHO[name] }, CLIPS[name]);
}
console.log(`\nDone. Clips in ${OUT}`);
