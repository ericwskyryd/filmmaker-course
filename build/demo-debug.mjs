import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('CONSOLE:', m.type(), m.text().slice(0, 200)); });
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 300)));
await page.goto('file://' + path.join(root, 'scriptwriting/lesson-01.html'), { waitUntil: 'load', timeout: 20000 });
await new Promise((r) => setTimeout(r, 800));
const diag = await page.evaluate(() => ({
  sfDemos: typeof window.SFDemos,
  demoScriptTag: !!document.querySelector('script[src*="demos.js"]'),
  demoEl: !!document.querySelector('[data-demo-pattern]'),
  pattern: document.querySelector('[data-demo-pattern]')?.getAttribute('data-demo-pattern'),
  cfgParses: (() => { try { JSON.parse(document.querySelector('script[data-demo-config]').textContent); return true; } catch (e) { return String(e).slice(0, 120); } })(),
}));
console.log(JSON.stringify(diag, null, 1));
await browser.close();
