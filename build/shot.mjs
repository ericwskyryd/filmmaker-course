#!/usr/bin/env node
// Headless-Chrome screenshot helper for self-review before showing Eric.
// Usage: node shot.mjs <relative-path-from-site-root> <out-name> [--mobile]
import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, '..');
const RENDERS_DIR = path.join(SITE_ROOT, 'renders');
fs.mkdirSync(RENDERS_DIR, { recursive: true });

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const args = process.argv.slice(2);
const mobile = args.includes('--mobile');
const filtered = args.filter((a) => a !== '--mobile');
const [relPath, outName] = filtered;

if (!relPath || !outName) {
  console.error('Usage: node shot.mjs <relative-path-from-site-root> <out-name> [--mobile]');
  process.exit(1);
}

const url = 'file://' + path.join(SITE_ROOT, relPath);

const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });
const page = await browser.newPage();
if (mobile) {
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
} else {
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 2 });
}
await page.goto(url, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 300)); // let aperture SVGs render
const outPath = path.join(RENDERS_DIR, outName + (mobile ? '-mobile' : '-desktop') + '.png');
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();
console.log('Saved', outPath);
