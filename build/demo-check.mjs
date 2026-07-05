import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 900 });
const targets = [
  'scriptwriting/lesson-01.html', 'smartphone/lesson-04.html', 'short-form/lesson-10.html',
  'weekend-youtuber/lesson-09.html', 'content-strategist/lesson-01.html', 'ai-creator/lesson-10.html',
  'pro-camera/lesson-07.html', 'course-creator/lesson-02.html',
];
let pass = 0, fail = 0;
for (const t of targets) {
  await page.goto('file://' + path.join(root, t), { waitUntil: 'load', timeout: 20000 });
  await new Promise((r) => setTimeout(r, 600));
  await page.evaluate(() => document.body.classList.remove('gated'));
  const hydrated = await page.evaluate(() => {
    const el = document.querySelector('[data-demo-pattern]');
    if (!el) return 'no-element';
    const built = [...el.children].filter((c) => c.tagName !== 'SCRIPT').length;
    return built > 0 ? 'hydrated' : 'not-hydrated';
  });
  console.log(`${t}: ${hydrated}`);
  hydrated === 'hydrated' ? pass++ : fail++;
  if (t === 'scriptwriting/lesson-01.html' && hydrated === 'hydrated') {
    const demoEl = await page.$('.demo-wrap');
    const outDir = path.resolve(root, '..', 'renders-archive');
    if (demoEl && fs.existsSync(outDir)) await demoEl.screenshot({ path: path.join(outDir, 'demo-scriptwriting-l1.png') });
  }
}
console.log(`RESULT: ${pass} hydrated, ${fail} failed`);
await browser.close();
