import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { readFileSync, existsSync } from 'fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8791;
const server = http.createServer((req, res) => {
  let f = path.join(root, req.url.split('?')[0].replace(/\/$/, '/index.html'));
  if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
  const ext = path.extname(f);
  const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' }[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  res.end(readFileSync(f));
}).listen(PORT);

const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const page = await browser.newPage();
let mode = 'fail'; let captured = null;
await page.setRequestInterception(true);
page.on('request', (req) => {
  if (req.url().includes('/coach') && req.method() === 'POST') {
    captured = JSON.parse(req.postData());
    if (mode === 'fail') req.respond({ status: 500, contentType: 'application/json', body: '{"error":true,"message":"boom"}' });
    else req.respond({ status: 429, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: true, message: 'limit', remaining: { text: 0, video: 0 }, resetsAtUtc: new Date(Date.now() + 3600000).toISOString() }) });
    return;
  }
  if (req.url().includes('coach-config.js')) {
    req.respond({ status: 200, contentType: 'application/javascript', body: `window.SF_COACH_URL = "http://localhost:${PORT}/mock";` });
    return;
  }
  req.continue();
});
await page.goto(`http://localhost:${PORT}/smartphone/lesson-01.html`, { waitUntil: 'networkidle0' });
await page.evaluate(() => { document.body.classList.remove('gated'); window.SFAuth._setUser({ uid: 'ux-test', displayName: 'UX Tester', email: 'ux@example.com' }); });
await new Promise((r) => setTimeout(r, 400));
// check two checklist boxes so checkedState carries signal
await page.evaluate(() => { const boxes = document.querySelectorAll('.checklist input[type=checkbox]'); boxes[0].click(); });
// Test 1: failed send preserves input
await page.type('[data-coach-textarea]', 'my drill result here');
await page.click('[data-coach-send]');
await new Promise((r) => setTimeout(r, 800));
const t1 = await page.evaluate(() => ({
  textareaKept: document.querySelector('[data-coach-textarea]').value,
  errorShown: document.querySelector('[data-coach-error-note]').classList.contains('is-visible'),
  userBubbles: document.querySelectorAll('.coach-msg-user').length,
}));
console.log('failed-send: textarea kept =', JSON.stringify(t1.textareaKept), '| error shown =', t1.errorShown, '| optimistic bubble removed =', t1.userBubbles === 0);
console.log('checkedState in payload =', Array.isArray(captured.checkedState), '| first item checked =', captured.checkedState && captured.checkedState[0] && captured.checkedState[0].checked === true, '| items =', captured.checkedState.length);
// Test 2: 429 disables composer with local reset time
mode = '429';
await page.click('[data-coach-send]');
await new Promise((r) => setTimeout(r, 800));
const t2 = await page.evaluate(() => ({
  state: document.querySelector('[data-coach-panel]').getAttribute('data-coach-state'),
  textareaDisabled: document.querySelector('[data-coach-textarea]').disabled,
  sendDisabled: document.querySelector('[data-coach-send]').disabled,
  errorText: document.querySelector('[data-coach-error-note]').textContent,
  remaining: document.querySelector('[data-coach-remaining]').textContent,
}));
console.log('429: state =', t2.state, '| textarea disabled =', t2.textareaDisabled, '| send disabled =', t2.sendDisabled);
console.log('429: error =', JSON.stringify(t2.errorText));
console.log('429: remaining =', JSON.stringify(t2.remaining));
await browser.close(); server.close();
const pass = t1.textareaKept === 'my drill result here' && t1.errorShown && t1.userBubbles === 0 && captured.checkedState.length > 0 && t2.state === 'limited' && t2.textareaDisabled && t2.sendDisabled && /Resets at/.test(t2.errorText);
console.log(pass ? 'ALL COACH UX CHECKS PASS' : 'FAILURES PRESENT');
