#!/usr/bin/env node
// ===================== Creator Reps: verification harness =====================
// Runs everything the build playbook calls for before declaring the rebuild done:
//   1. Legacy localStorage migration test (seed v1 keys, load hub, confirm merge)
//   2. Check-a-box persistence test on a brand-new track lesson
//   3. Programmatic link check across every generated page (prev/next/nav/hub/redirects)
//   4. Redirect stub check (old root lesson-NN.html -> smartphone/lesson-NN.html)
//   5. Em dash grep across all generated HTML (middot separators are fine)
//
// Usage: node verify.mjs

import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, '..');
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8792;

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json',
};

function startServer() {
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    const filePath = path.join(SITE_ROOT, urlPath);
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('404'); return; }
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

let pass = 0, fail = 0;
function check(label, ok, detail) {
  if (ok) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}${detail ? ' -- ' + detail : ''}`); }
}

// ---------- 3 + 4: static link check (no browser needed) ----------

function linkCheck() {
  console.log('\n[3+4] Link check + redirect stubs (static)');
  const htmlFiles = [];
  (function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'build' && entry.name !== 'renders' && entry.name !== '.git') walk(p);
      else if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(p);
    });
  })(SITE_ROOT);

  let totalLinks = 0;
  let brokenLinks = 0;
  const broken = [];

  htmlFiles.forEach((file) => {
    const html = fs.readFileSync(file, 'utf8');
    const dir = path.dirname(file);
    const hrefRe = /href="([^"]+)"/g;
    const srcRe = /src="(assets\/[^"]+|\.\.\/assets\/[^"]+)"/g;
    let m;
    [hrefRe, srcRe].forEach((re) => {
      while ((m = re.exec(html))) {
        const href = m[1];
        if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) continue;
        totalLinks++;
        const target = path.join(dir, href);
        if (!fs.existsSync(target)) {
          brokenLinks++;
          broken.push(`${path.relative(SITE_ROOT, file)} -> ${href}`);
        }
      }
    });
  });

  check(`${htmlFiles.length} HTML pages found (expect 97 lessons + 8 dashboards + 1 hub + 14 redirects + 1 admin = 121)`, htmlFiles.length === 121, `found ${htmlFiles.length}`);
  check(`all ${totalLinks} internal links/asset refs resolve`, brokenLinks === 0, broken.slice(0, 10).join('; '));

  // Redirect stub content check
  let redirectsOk = true;
  const redirectIssues = [];
  for (let n = 1; n <= 14; n++) {
    const nn = String(n).padStart(2, '0');
    const stubPath = path.join(SITE_ROOT, `lesson-${nn}.html`);
    if (!fs.existsSync(stubPath)) { redirectsOk = false; redirectIssues.push(`missing lesson-${nn}.html`); continue; }
    const content = fs.readFileSync(stubPath, 'utf8');
    const target = `smartphone/lesson-${nn}.html`;
    if (!content.includes(target)) { redirectsOk = false; redirectIssues.push(`lesson-${nn}.html does not reference ${target}`); }
    if (!fs.existsSync(path.join(SITE_ROOT, target))) { redirectsOk = false; redirectIssues.push(`${target} missing`); }
  }
  check('all 14 root redirect stubs point to smartphone/lesson-NN.html, target exists', redirectsOk, redirectIssues.join('; '));

  return { htmlFiles, totalLinks, brokenLinks };
}

// ---------- 5: em dash grep ----------

function emDashGrep() {
  console.log('\n[5] Em dash grep across generated HTML (middot separators are fine)');
  const htmlFiles = [];
  (function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'build' && entry.name !== 'renders' && entry.name !== '.git') walk(p);
      else if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(p);
    });
  })(SITE_ROOT);

  // Only the true em dash character counts. A bare "--" also shows up inside
  // legitimate YouTube video IDs (e.g. "H--CKVTfsL8"), which isn't typographic
  // em-dash usage and isn't copy we wrote, so it's not part of this check.
  const hits = [];
  htmlFiles.forEach((file) => {
    const html = fs.readFileSync(file, 'utf8');
    if (html.includes('—') || /&mdash;/i.test(html)) {
      const lines = html.split('\n');
      lines.forEach((line, i) => {
        if (line.includes('—') || /&mdash;/i.test(line)) hits.push(`${path.relative(SITE_ROOT, file)}:${i + 1}`);
      });
    }
  });
  check('no em dashes in generated HTML', hits.length === 0, hits.slice(0, 10).join('; '));
  return hits;
}

// ---------- 1: legacy migration test ----------

async function migrationTest(browser) {
  console.log('\n[1] Legacy progress migration test');
  const page = await browser.newPage();

  // Seed a legacy v1 blob for the Smartphone Filmmaker course: lessons 1-3 fully
  // checked (item counts 4,4,4 per the old SF_ITEM_COUNTS), plus one activity date.
  const legacy = {
    lessons: {
      '1': { checks: [true, true, true, true] },
      '2': { checks: [true, true, true, true] },
      '3': { checks: [true, true, true, true] },
    },
    activityDates: ['2026-06-30'],
  };

  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((legacyState) => {
    localStorage.setItem('sf_progress_v1', JSON.stringify(legacyState));
  }, legacy);

  // Reload the hub -- this is where migration is expected to run.
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 300));

  const v2 = await page.evaluate(() => JSON.parse(localStorage.getItem('sf_progress_v2') || 'null'));
  const migrated = !!(v2 && v2.migratedFromV1 && v2.tracks && v2.tracks.smartphone);
  check('sf_progress_v2 created with migratedFromV1 flag', migrated);

  const smartphoneLessons = v2 && v2.tracks.smartphone ? v2.tracks.smartphone.lessons : {};
  const lessonsMigrated = ['1', '2', '3'].every((k) => smartphoneLessons[k] && smartphoneLessons[k].checks.every(Boolean));
  check('lessons 1-3 checks carried over into tracks.smartphone', lessonsMigrated);

  const activityMerged = v2 && v2.activityDates && v2.activityDates.includes('2026-06-30');
  check('legacy activity date merged into shared activityDates', activityMerged);

  // Confirm the hub ring for the smartphone track card reflects the migrated count.
  const ringLabel = await page.evaluate(() => {
    const card = document.querySelector('[data-track-card="smartphone"]');
    const ring = card && card.querySelector('.aperture');
    return ring ? ring.dataset.label : null;
  });
  check('hub smartphone track card ring shows migrated count (3/14)', ringLabel === '3/14', `got ${ringLabel}`);

  // Confirm the actual smartphone lesson-01 checklist page reflects checked state.
  await page.goto(`http://localhost:${PORT}/smartphone/lesson-01.html`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 300));
  const allChecked = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('.checklist[data-lesson-checklist="1"] input[type=checkbox]'));
    return inputs.length > 0 && inputs.every((i) => i.checked);
  });
  check('smartphone/lesson-01.html shows all checkboxes checked after migration', allChecked);

  await page.close();
}

// ---------- 2: persistence test on a brand-new track ----------

async function persistenceTest(browser) {
  console.log('\n[2] Check-a-box persistence test (scriptwriting, a new track)');
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/scriptwriting/lesson-02.html`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 200));

  await page.click('.checklist[data-lesson-checklist="2"] input[type=checkbox]');
  await new Promise((r) => setTimeout(r, 150));

  const checkedBeforeReload = await page.evaluate(() => {
    return document.querySelector('.checklist[data-lesson-checklist="2"] input[type=checkbox]').checked;
  });
  check('checkbox shows checked immediately after click', checkedBeforeReload);

  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 300));
  const checkedAfterReload = await page.evaluate(() => {
    return document.querySelector('.checklist[data-lesson-checklist="2"] input[type=checkbox]').checked;
  });
  check('checkbox stays checked after reload (localStorage persistence)', checkedAfterReload);

  const storedShape = await page.evaluate(() => {
    const v2 = JSON.parse(localStorage.getItem('sf_progress_v2') || 'null');
    return v2 && v2.tracks && v2.tracks.scriptwriting && v2.tracks.scriptwriting.lessons['2'] ? 'namespaced-ok' : 'missing';
  });
  check('checked state stored under namespaced tracks.scriptwriting key', storedShape === 'namespaced-ok');

  // Streak should have recorded today's activity from this interaction.
  const streakToday = await page.evaluate(() => {
    const v2 = JSON.parse(localStorage.getItem('sf_progress_v2') || 'null');
    const today = new Date();
    const key = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    return v2 && v2.activityDates && v2.activityDates.includes(key);
  });
  check('shared streak recorded today\'s activity from the scriptwriting check', streakToday);

  await page.close();
}

// ---------- 6: no JS console errors on load (hub, a lesson page, admin.html) ----------

async function consoleErrorTest(browser) {
  console.log('\n[6] No JS console errors on load (hub, lesson, admin)');
  const pages = ['index.html', 'smartphone/lesson-01.html', 'admin.html'];
  for (const rel of pages) {
    const page = await browser.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    await page.goto(`http://localhost:${PORT}/${rel}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800)); // let the firebase.js module + auth state settle
    check(`${rel}: no console errors on load`, errors.length === 0, errors.slice(0, 5).join(' | '));
    await page.close();
  }
}

// ---------- 7: firebase.js blocked/offline -> no white screen, degrades to localStorage ----------

async function offlineDegradeTest(browser) {
  console.log('\n[7] gstatic blocked (offline Firebase) -> site still works, no white screen');
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.url().includes('gstatic.com/firebasejs')) req.abort();
    else req.continue();
  });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto(`http://localhost:${PORT}/smartphone/lesson-03.html`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 5500)); // let the progress.js safety-net timeout resolve auth to signed-out

  const bodyHasContent = await page.evaluate(() => document.querySelectorAll('.checklist-card, .lesson-title').length > 0);
  check('lesson page still renders full content with gstatic blocked (no white screen)', bodyHasContent);
  check('no uncaught JS exceptions with gstatic blocked', pageErrors.length === 0, pageErrors.slice(0, 5).join(' | '));

  // Checklist + localStorage persistence must still work with Firebase fully unreachable.
  await page.click('.checklist[data-lesson-checklist="3"] input[type=checkbox]');
  await new Promise((r) => setTimeout(r, 200));
  const checkedNow = await page.evaluate(() => document.querySelector('.checklist[data-lesson-checklist="3"] input[type=checkbox]').checked);
  check('checkbox still checks with gstatic blocked', checkedNow);

  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 300));
  const checkedAfterReload = await page.evaluate(() => document.querySelector('.checklist[data-lesson-checklist="3"] input[type=checkbox]').checked);
  check('checkbox survives reload with gstatic blocked (localStorage fallback intact)', checkedAfterReload);

  // Sign-in button must not throw when clicked in the degraded state.
  let clickError = null;
  try {
    await page.click('[data-auth-signin]');
  } catch (e) {
    clickError = e.message;
  }
  check('clicking "Sign in" with Firebase unreachable does not throw', clickError === null, clickError);

  await page.close();
}

async function main() {
  const server = await startServer();
  console.log(`Local server on http://localhost:${PORT}`);

  linkCheck();
  emDashGrep();

  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });
  await migrationTest(browser);
  await persistenceTest(browser);
  await consoleErrorTest(browser);
  await offlineDegradeTest(browser);
  await browser.close();
  server.close();

  console.log(`\n=================\n${pass} passed, ${fail} failed\n=================`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
