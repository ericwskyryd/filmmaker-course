import puppeteer from 'puppeteer-core';
import path from 'path';
import http from 'http';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8794;
const server = http.createServer((req, res) => {
  let f = path.join(root, req.url.split('?')[0].replace(/\/$/, '/index.html'));
  if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
  const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' }[path.extname(f)] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime }); res.end(readFileSync(f));
}).listen(PORT);
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const page = await browser.newPage();
await page.setRequestInterception(true);
page.on('request', (req) => { if (req.url().includes('gstatic.com') || req.url().includes('googleapis.com/identitytoolkit') || req.url().includes('firestore')) { req.abort(); } else { req.continue(); } });
const shots = [
  ['/', 'current-hub', 1440],
  ['/smartphone/index.html', 'current-track-dashboard', 1440],
  ['/smartphone/lesson-01.html', 'current-lesson', 1440],
  ['/scriptwriting/lesson-01.html', 'current-lesson-demo', 1440],
  ['/pro-camera/lesson-12.html', 'current-capstone', 1440],
  ['/', 'current-hub-mobile', 390],
];
for (const [url, name, width] of shots) {
  await page.setViewport({ width, height: width === 390 ? 844 : 1000 });
  await page.goto(`http://localhost:${PORT}${url}`, { waitUntil: 'load', timeout: 25000 });
  await new Promise((r) => setTimeout(r, 6500));
  await page.evaluate(() => { document.body.classList.remove('gated'); if (window.SFAuth && window.SFAuth._setUser) window.SFAuth._setUser({ uid: 'review', displayName: 'Jordan Reviewer', email: 'jordan@example.com' }); });
  await new Promise((r) => setTimeout(r, 700));
  await page.screenshot({ path: path.join(root, 'renders', `${name}.png`), fullPage: true });
  console.log(`captured ${name}`);
}
await browser.close(); server.close();
