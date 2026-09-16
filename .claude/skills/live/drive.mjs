/* Vorlage zum Bedienen der laufenden App. Siehe .claude/skills/live/SKILL.md.
   Aufruf:  node .claude/skills/live/drive.mjs [halbjahr] [hold]
   Kopieren und anpassen, statt die Helfer jedes Mal neu zu schreiben. */
import { chromium } from "playwright";
import fs from "fs";

const PORT = fs.existsSync("/tmp/pel-live-port")
  ? fs.readFileSync("/tmp/pel-live-port", "utf8").trim() : "3333";
const OUT = process.env.OUT || "/tmp";

/* --no-proxy-server: sonst gehen auch die 127.0.0.1-Anfragen in den
   Agent-Proxy und die Seite bleibt halb geladen. */
export async function open(hy = 8, hold = false) {
  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    args: ["--no-proxy-server"],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));
  page.on("console", (m) => {
    // Supabase-Realtime und Google Fonts scheitern hier immer — siehe SKILL.md
    if (m.type() === "error" && !/supabase|WebSocket|net::ERR|Failed to load resource|403/i.test(m.text())) {
      errs.push("CONSOLE: " + m.text());
    }
  });
  await page.goto(`http://127.0.0.1:${PORT}/live-test?hy=${hy}${hold ? "&hold=1" : ""}`,
    { waitUntil: "load", timeout: 90000 });
  return { browser, page, errs };
}

/* Auf Hydration warten, indem wirklich ein Tab gewechselt wird. Ein bloßes
   waitForTimeout reicht nicht: Ohne Hydration nimmt die Seite Klicks
   klaglos entgegen und tut nichts. 0 = Dealflow, 1 = Portfolio, 2 = Peer Group. */
export async function tab(page, idx) {
  const namen = ["Dealflow", "Portfolio", "Peer Group"];
  const btn = page.locator(".tabs button").nth(idx);
  for (let i = 0; i < 30; i++) {
    await btn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
    const an = await page.locator(".tabs button.on").first()
      .evaluate((e, n) => (e.textContent || "").includes(n), namen[idx]).catch(() => false);
    if (an) return true;
  }
  return false;
}

/* Regler bedienen. NICHT über el.value — React verfolgt den Wert über einen
   eigenen Setter und ignoriert die Zuweisung. Tastatur ist echte Eingabe. */
export async function press(scope, idx, key, times = 1) {
  const r = scope.locator("input[type=range]").nth(idx);
  await r.focus();
  for (let k = 0; k < times; k++) await r.press(key);
  await scope.page().waitForTimeout(400);
}

/* Läuft irgendetwas aus seiner Karte? Die Ansicht ist auf 390 px ausgelegt. */
export async function overflow(page) {
  return page.evaluate(() => {
    const out = [];
    document.querySelectorAll(".card, table, .news, .bar, .modal .card").forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 1) out.push(`${el.tagName}.${el.className} ${el.scrollWidth}>${el.clientWidth}`);
    });
    return { over: out, doc: document.documentElement.scrollWidth };
  });
}

export const shot = (page, name) => page.screenshot({ path: `${OUT}/live-${name}.png` });

/* Eine Kennzahlenzeile aus einer Tabelle lesen, an der Beschriftung erkannt. */
export const row = async (scope, label) =>
  (await scope.locator("tr").filter({ hasText: label }).first().locator("td").nth(1).innerText())
    .replace(/\s+/g, " ").trim();

if (import.meta.url === `file://${process.argv[1]}`) {
  const { browser, page, errs } = await open(Number(process.argv[2]) || 8, process.argv[3] === "hold");
  console.log("hydriert:", await tab(page, 1));
  console.log("FEED:\n" + (await page.locator(".news").innerText().catch(() => "(keine)")));
  console.log("ÜBERLAUF:", JSON.stringify(await overflow(page)));
  await shot(page, "portfolio");
  console.log(errs.length ? "FEHLER:\n" + errs.join("\n") : "keine JS-Fehler");
  await browser.close();
}
