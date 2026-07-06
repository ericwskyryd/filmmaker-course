#!/usr/bin/env node
// ===================== Creator Reps: verification harness =====================
// Runs everything the build playbook calls for before declaring the rebuild done:
//   1. Legacy localStorage migration test (seed v1 keys, load hub, confirm merge)
//   2. Check-a-box persistence test on a brand-new track lesson
//   3. Programmatic link check across every generated page (prev/next/nav/hub/redirects)
//   4. Redirect stub check (old root lesson-NN.html -> smartphone/lesson-NN.html)
//   5. Em dash grep across all generated HTML (middot separators are fine)
//   13. Data-bound greeting (no hardcoded "Eric") on hub + dashboard
//   14. Streak only records activity on check (false->true), never on uncheck
//   15. Per-lesson timestamped sync merge (reshoot survives a stale-device sync)
//   16. Celebration block's "Next" CTA (mid-track and last-lesson variants)
//   17. Track-completion dead ends: active footer card + 14/14 dashboard state
//   18. Vocabulary unification ("Reshoot" everywhere, gate back-link wording)
//
// Usage: node verify.mjs

import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, '..');
const RENDERS_DIR = path.join(SITE_ROOT, 'renders');
fs.mkdirSync(RENDERS_DIR, { recursive: true });
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8792;

async function renderShot(page, outName) {
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 2 });
  await new Promise((r) => setTimeout(r, 200)); // let aperture SVGs redraw at the new viewport
  const outPath = path.join(RENDERS_DIR, `${outName}-desktop.png`);
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`  render saved: renders/${outName}-desktop.png`);
}

async function renderShotMobile(page, outName) {
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await new Promise((r) => setTimeout(r, 200));
  const outPath = path.join(RENDERS_DIR, `${outName}-mobile.png`);
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`  render saved: renders/${outName}-mobile.png`);
}

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

// ---------- 23: design finale static checks (breadcrumb link, capstone panel) ----------

function designFinaleStaticChecks() {
  console.log('\n[23] Design finale statics: breadcrumb track link, capstone submission panel on exactly 4 pages');
  const TRACK_SLUGS = ['smartphone', 'pro-camera', 'ai-creator', 'weekend-youtuber', 'short-form', 'course-creator', 'content-strategist', 'scriptwriting'];
  const lessonPages = [];
  TRACK_SLUGS.forEach((slug) => {
    const dir = path.join(SITE_ROOT, slug);
    fs.readdirSync(dir).filter((f) => /^lesson-\d+\.html$/.test(f)).forEach((f) => {
      lessonPages.push({ slug, file: path.join(dir, f) });
    });
  });

  const missingBreadcrumbLink = [];
  lessonPages.forEach(({ file }) => {
    const html = fs.readFileSync(file, 'utf8');
    if (!/<a class="breadcrumb-link" href="index\.html">/.test(html)) missingBreadcrumbLink.push(path.relative(SITE_ROOT, file));
  });
  check('every lesson page\'s desktop breadcrumb links the track name back to index.html', missingBreadcrumbLink.length === 0, missingBreadcrumbLink.slice(0, 5).join('; '));

  const CAPSTONE_NO_MEDIA = new Set(['pro-camera:12', 'ai-creator:13', 'course-creator:13', 'short-form:11']);
  const capstonePages = [];
  const wrongPages = [];
  lessonPages.forEach(({ slug, file }) => {
    const nMatch = path.basename(file).match(/^lesson-(\d+)\.html$/);
    const n = parseInt(nMatch[1], 10);
    const html = fs.readFileSync(file, 'utf8');
    const hasPanel = html.includes('class="capstone-panel"');
    const expected = CAPSTONE_NO_MEDIA.has(`${slug}:${n}`);
    if (hasPanel) capstonePages.push(`${slug}/lesson-${nMatch[1]}.html`);
    if (hasPanel !== expected) wrongPages.push(`${slug}/lesson-${nMatch[1]}.html (hasPanel=${hasPanel}, expected=${expected})`);
  });
  check('capstone submission panel appears on exactly the 4 no-media capstones', capstonePages.length === 4 && wrongPages.length === 0, wrongPages.join('; ') || `found on: ${capstonePages.join(', ')}`);
  check('capstone panel links down to the AI Coach section (#coach) and the coach section carries that id', capstonePages.length === 0 || (() => {
    const sample = fs.readFileSync(path.join(SITE_ROOT, 'pro-camera', 'lesson-12.html'), 'utf8');
    return sample.includes('href="#coach"') && sample.includes('id="coach"');
  })());
}

// ---------- 11: AI Coach panel static checks (presence + file-input track split) ----------

function coachStaticChecks() {
  console.log('\n[11] AI Coach panel static checks (presence + file-input track split)');
  const FILM_TRACKS = ['smartphone', 'pro-camera', 'short-form', 'weekend-youtuber'];
  const TEXT_TRACKS = ['ai-creator', 'course-creator', 'content-strategist', 'scriptwriting'];

  const lessonPages = [];
  [...FILM_TRACKS, ...TEXT_TRACKS].forEach((slug) => {
    const dir = path.join(SITE_ROOT, slug);
    fs.readdirSync(dir).filter((f) => /^lesson-\d+\.html$/.test(f)).forEach((f) => {
      lessonPages.push({ slug, file: path.join(dir, f) });
    });
  });

  check('found lesson pages across all 8 tracks (expect 97)', lessonPages.length === 97, `found ${lessonPages.length}`);

  const missingPanel = [];
  const filmMissingFile = [];
  const textHasFile = [];
  lessonPages.forEach(({ slug, file }) => {
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes('data-coach-panel')) missingPanel.push(path.relative(SITE_ROOT, file));
    const hasFileInput = html.includes('data-coach-file-input');
    if (FILM_TRACKS.includes(slug) && !hasFileInput) filmMissingFile.push(path.relative(SITE_ROOT, file));
    if (TEXT_TRACKS.includes(slug) && hasFileInput) textHasFile.push(path.relative(SITE_ROOT, file));
  });

  check('AI Coach panel present on every lesson page', missingPanel.length === 0, missingPanel.slice(0, 5).join('; '));
  check('clip attach file input present on all filmmaking-track lesson pages (smartphone/pro-camera/short-form/weekend-youtuber)', filmMissingFile.length === 0, filmMissingFile.slice(0, 5).join('; '));
  check('clip attach file input absent on all text-artifact-track lesson pages (ai-creator/course-creator/content-strategist/scriptwriting)', textHasFile.length === 0, textHasFile.slice(0, 5).join('; '));
}

// ---------- 12: AI Coach offline default state (SF_COACH_URL empty) ----------

async function coachOfflineStateTest(browser) {
  console.log('\n[12] AI Coach panel renders disabled "coming online" state when SF_COACH_URL is empty');
  const page = await browser.newPage();
  // The live config now carries the real worker URL; simulate the pre-activation
  // empty-config state by intercepting coach-config.js, so the offline code path
  // stays covered regardless of what the shipped config contains.
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.url().includes('assets/coach-config.js')) {
      req.respond({ status: 200, contentType: 'application/javascript', body: 'window.SF_COACH_URL = \"\";' });
    } else {
      req.continue();
    }
  });
  await page.goto(`http://localhost:${PORT}/smartphone/lesson-01.html`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => window.SFAuth._setUser({ uid: 'coach-test', displayName: 'Coach Test', email: 'coach-test@example.com' }));
  await new Promise((r) => setTimeout(r, 300));

  const state = await page.evaluate(() => {
    const panel = document.querySelector('[data-coach-panel]');
    const textarea = document.querySelector('[data-coach-textarea]');
    const send = document.querySelector('[data-coach-send]');
    const fileInput = document.querySelector('[data-coach-file-input]');
    const offlineNote = document.querySelector('[data-coach-offline-note]');
    return {
      coachState: panel && panel.getAttribute('data-coach-state'),
      textareaDisabled: !!textarea && textarea.disabled,
      sendDisabled: !!send && send.disabled,
      fileInputDisabled: !fileInput || fileInput.disabled,
      offlineNoteVisible: !!offlineNote && getComputedStyle(offlineNote).display !== 'none',
    };
  });
  check('coach panel state is "offline" when SF_COACH_URL is empty', state.coachState === 'offline', `got ${state.coachState}`);
  check('coach textarea is disabled in offline state', state.textareaDisabled === true);
  check('coach send button is disabled in offline state', state.sendDisabled === true);
  check('coach clip file input (where present) is disabled in offline state', state.fileInputDisabled === true);
  check('offline note ("The coach comes online shortly.") is visible', state.offlineNoteVisible);

  await page.close();
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
  // Lesson pages are gated now, so clicking the checklist needs a resolved
  // "signed in" gate state first. Block the real Firebase SDK (deterministic,
  // no dependency on live Google auth in a test) and simulate a signed-in
  // session via window.SFAuth._setUser -- this is the same reveal path a real
  // sign-in takes, it just skips the Google popup. Exercising this alongside
  // a fully-blocked Firebase also proves the underlying localStorage engine
  // still works when the cloud sync layer is unreachable.
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.url().includes('gstatic.com/firebasejs')) req.abort();
    else req.continue();
  });
  const fakeUser = { uid: 'verify-test-uid', displayName: 'Verify Test', email: 'verify-test@example.com' };
  const simulateSignIn = () => page.evaluate((u) => window.SFAuth._setUser(u), fakeUser);

  await page.goto(`http://localhost:${PORT}/scriptwriting/lesson-02.html`, { waitUntil: 'networkidle0' });
  await simulateSignIn();
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await simulateSignIn();
  await new Promise((r) => setTimeout(r, 200));

  await page.click('.checklist[data-lesson-checklist="2"] input[type=checkbox]');
  await new Promise((r) => setTimeout(r, 150));

  const checkedBeforeReload = await page.evaluate(() => {
    return document.querySelector('.checklist[data-lesson-checklist="2"] input[type=checkbox]').checked;
  });
  check('checkbox shows checked immediately after click', checkedBeforeReload);

  await page.reload({ waitUntil: 'networkidle0' });
  await simulateSignIn();
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
  const pages = ['index.html', 'smartphone/lesson-01.html', 'scriptwriting/lesson-01.html', 'admin.html'];
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

// ---------- 7: firebase.js blocked/offline -> gate shows retry, no white screen, no content leak ----------
// The gate changes what "degrades gracefully" means here: pre-gate, a blocked
// Firebase fell back to showing full content with local-only progress. Now
// the whole point of the gate is that a blocked network must NOT be treated
// as an all-clear to show lesson content -- it shows the retry panel instead.
// The "local progress still works when Firebase is unreachable" invariant
// this used to check is now covered by persistenceTest (which runs with
// gstatic blocked + a simulated signed-in session).

async function offlineDegradeTest(browser) {
  console.log('\n[7] gstatic blocked (offline Firebase) -> gate shows retry panel, no white screen, no content leak');
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.url().includes('gstatic.com/firebasejs')) req.abort();
    else req.continue();
  });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto(`http://localhost:${PORT}/smartphone/lesson-03.html`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800)); // firebase.js's own import() rejects fast; blocked state should resolve well under the 5s fallback

  const gateState = await page.evaluate(() => document.body.getAttribute('data-gate-state'));
  check('blocked gate state resolves quickly (does not wait for the 5s fallback timer)', gateState === 'blocked', `got ${gateState}`);

  const blockedPanelVisible = await page.evaluate(() => {
    const el = document.querySelector('[data-gate-panel="blocked"]');
    return !!el && getComputedStyle(el).display !== 'none';
  });
  check('blocked panel is visible (no white screen)', blockedPanelVisible);

  const contentHidden = await page.evaluate(() => {
    const app = document.querySelector('.app');
    return !app || getComputedStyle(app).display === 'none';
  });
  check('lesson content stays hidden while Firebase is unreachable (no content leak)', contentHidden);

  check('no uncaught JS exceptions with gstatic blocked', pageErrors.length === 0, pageErrors.slice(0, 5).join(' | '));

  // Retry button must not throw when clicked in the degraded state.
  let clickError = null;
  try {
    await page.click('[data-gate-retry]');
  } catch (e) {
    clickError = e.message;
  }
  check('clicking "Retry" with Firebase unreachable does not throw', clickError === null, clickError);

  await page.close();
}

// ---------- 8: content gate visibility (hub storefront vs. gated content pages) ----------

async function gateVisibilityTest(browser) {
  console.log('\n[8] Content gate: hub storefront stays browsable signed out; lesson content stays hidden until sign-in');
  const page = await browser.newPage();

  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0' });
  const hubTrackCardsVisible = await page.evaluate(() => {
    const cards = document.querySelectorAll('.track-card');
    return cards.length > 0 && Array.prototype.every.call(cards, (c) => getComputedStyle(c).display !== 'none');
  });
  check('hub shows all track cards while signed out (storefront stays browsable)', hubTrackCardsVisible);

  const hubShowsSignInPitch = await page.evaluate(() => {
    const el = document.querySelector('[data-hub-signedout]');
    return !!el && getComputedStyle(el).display !== 'none' && !!el.querySelector('[data-auth-signin]');
  });
  check('hub shows the signed-out pitch + Google sign-in CTA', hubShowsSignInPitch);

  await page.goto(`http://localhost:${PORT}/smartphone/lesson-02.html`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2500)); // let the real (unblocked) Firebase SDK resolve to "no user"

  const gateState = await page.evaluate(() => document.body.getAttribute('data-gate-state'));
  check('signed-out lesson page resolves the gate to "signedout" (not stuck checking, not blocked)', gateState === 'signedout', `got ${gateState}`);

  const contentHiddenSignedOut = await page.evaluate(() => {
    const app = document.querySelector('.app');
    return !app || getComputedStyle(app).display === 'none';
  });
  check('signed-out lesson page keeps lesson content hidden (no content leak)', contentHiddenSignedOut);

  const signinPanelVisible = await page.evaluate(() => {
    const el = document.querySelector('[data-gate-panel="signedout"]');
    return !!el && getComputedStyle(el).display !== 'none' && !!el.querySelector('[data-auth-signin]') && !!el.querySelector('.gate-privacy');
  });
  check('signed-out lesson page shows the sign-in panel (Google button + privacy note)', signinPanelVisible);

  await page.close();
}

// ---------- 9: 5s safety-net timer (firebase.js itself never runs at all) ----------

async function safetyNetTimerTest(browser) {
  console.log('\n[9] 5s safety-net timer resolves the gate even if firebase.js itself never loads');
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.url().endsWith('/assets/firebase.js')) req.abort();
    else req.continue();
  });

  await page.goto(`http://localhost:${PORT}/smartphone/lesson-04.html`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2000));
  const stateEarly = await page.evaluate(() => document.body.getAttribute('data-gate-state'));
  check('gate stays on "checking" before the 5s safety net fires', stateEarly === 'checking', `got ${stateEarly}`);

  await new Promise((r) => setTimeout(r, 3500)); // total ~5.5s
  const stateLate = await page.evaluate(() => document.body.getAttribute('data-gate-state'));
  check('5s safety-net timer resolves the gate to "blocked" when firebase.js never runs at all', stateLate === 'blocked', `got ${stateLate}`);

  await page.close();
}

// ---------- 10: gate reveal path (simulated sign-in removes the gate in place) ----------
// Exercises the code path a real Google sign-in takes once assets/firebase.js
// calls window.SFAuth._setUser(user) -- live sign-in through the Google popup
// itself remains a manual check (see the returned 3-step test for Eric).

async function signInRevealTest(browser) {
  console.log('\n[10] Gate reveal: a resolved sign-in removes the gate and shows content in place (no redirect)');
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/smartphone/lesson-05.html`, { waitUntil: 'domcontentloaded' });
  const urlBefore = page.url();

  await page.evaluate(() => window.SFAuth._setUser({ uid: 'reveal-test', displayName: 'Reveal Test', email: 'reveal-test@example.com' }));
  await new Promise((r) => setTimeout(r, 200));

  const revealed = await page.evaluate(() => {
    const app = document.querySelector('.app');
    return !document.body.classList.contains('gated') && !!app && getComputedStyle(app).display !== 'none';
  });
  check('a resolved sign-in removes the gate and reveals lesson content', revealed);

  const urlAfter = page.url();
  check('reveal happens in place, no redirect/navigation', urlAfter === urlBefore, `before=${urlBefore} after=${urlAfter}`);

  await page.close();
}

// ---------- 13: data-bound greeting (no hardcoded "Eric") ----------

async function greetingTest(browser) {
  console.log('\n[13] Data-bound greeting: no hardcoded "Eric", shows the signed-in user\'s first name');
  const auditUser = { uid: 'audit-tester-uid', displayName: 'Audit Tester', email: 'audit-tester@example.com' };

  // Hub: sign in as "Audit Tester" and confirm the headline greeting shows
  // "Audit", never "Eric" -- this is the render Eric asked to see.
  const hubPage = await browser.newPage();
  await hubPage.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0' });
  await hubPage.evaluate((u) => window.SFAuth._setUser(u), auditUser);
  await new Promise((r) => setTimeout(r, 300));
  const hubGreeting = await hubPage.evaluate(() => {
    const el = document.querySelector('[data-hub-greeting-title]');
    return el ? el.textContent.trim() : null;
  });
  check('hub greeting shows "Audit" for a signed-in user named Audit Tester', !!hubGreeting && hubGreeting.includes('Audit'), `got "${hubGreeting}"`);
  check('hub greeting never hardcodes "Eric"', !!hubGreeting && !hubGreeting.includes('Eric'), `got "${hubGreeting}"`);
  await renderShot(hubPage, 'hub-greeting-nonEric');
  await hubPage.close();

  // Track dashboard: same data-bound span, same assertion.
  const dashPage = await browser.newPage();
  await dashPage.goto(`http://localhost:${PORT}/smartphone/index.html`, { waitUntil: 'networkidle0' });
  await dashPage.evaluate((u) => window.SFAuth._setUser(u), auditUser);
  await new Promise((r) => setTimeout(r, 300));
  const dashGreeting = await dashPage.evaluate(() => {
    const el = document.querySelector('.greeting-title');
    return el ? el.textContent.trim() : null;
  });
  check('dashboard greeting shows "Audit" for a signed-in user named Audit Tester', !!dashGreeting && dashGreeting.includes('Audit'), `got "${dashGreeting}"`);
  check('dashboard greeting never hardcodes "Eric"', !!dashGreeting && !dashGreeting.includes('Eric'), `got "${dashGreeting}"`);

  // No-displayName fallback: signed in, but no name to bind -- copy falls
  // back to the exact server-rendered default, never a blank/broken string.
  await dashPage.evaluate(() => window.SFAuth._setUser({ uid: 'no-name-uid', email: 'no-name@example.com' }));
  await new Promise((r) => setTimeout(r, 300));
  const fallbackGreeting = await dashPage.evaluate(() => {
    const el = document.querySelector('.greeting-title');
    return el ? el.textContent.trim() : null;
  });
  check('greeting falls back to "Ready for today\'s rep?" when no displayName is present', fallbackGreeting === 'Ready for today’s rep?', `got "${fallbackGreeting}"`);
  await dashPage.close();
}

// ---------- 14: streak only records activity on check, never on uncheck ----------

async function streakCheckOnlyTest(browser) {
  console.log('\n[14] Streak activity records only on check (false->true), never on uncheck');
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.url().includes('gstatic.com/firebasejs')) req.abort();
    else req.continue();
  });
  const fakeUser = { uid: 'streak-test-uid', displayName: 'Streak Test', email: 'streak-test@example.com' };
  const simulateSignIn = () => page.evaluate((u) => window.SFAuth._setUser(u), fakeUser);

  await page.goto(`http://localhost:${PORT}/content-strategist/lesson-03.html`, { waitUntil: 'networkidle0' });
  await simulateSignIn();
  await page.evaluate(() => localStorage.clear());
  // Seed item 0 already checked (as if from a prior day), with NO activity
  // dates recorded yet -- reproduces "a lesson is already checked, today
  // hasn't been touched" without ever calling setCheck (which would itself
  // record activity and defeat the test).
  await page.evaluate(() => {
    const state = { tracks: { 'content-strategist': { lessons: { '3': { checks: [true, false, false], updatedAt: Date.now() - 86400000 } } } }, activityDates: [], migratedFromV1: false, schemaVersion: 3 };
    localStorage.setItem('sf_progress_v2', JSON.stringify(state));
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await simulateSignIn();
  await new Promise((r) => setTimeout(r, 300));

  const beforeAny = await page.evaluate(() => (JSON.parse(localStorage.getItem('sf_progress_v2') || 'null') || {}).activityDates || []);
  check('seeded state starts with zero activity dates', beforeAny.length === 0, `got ${JSON.stringify(beforeAny)}`);

  // Uncheck the already-checked item 0 (true -> false): must NOT record activity.
  await page.click('.checklist[data-lesson-checklist="3"] input[type=checkbox]:nth-of-type(1)');
  await new Promise((r) => setTimeout(r, 150));
  const afterUncheck = await page.evaluate(() => JSON.parse(localStorage.getItem('sf_progress_v2') || 'null').activityDates);
  check('unchecking a box records no streak activity', afterUncheck.length === 0, `got ${JSON.stringify(afterUncheck)}`);

  // Check a different item (false -> true): MUST record today's activity.
  const inputs = await page.$$('.checklist[data-lesson-checklist="3"] input[type=checkbox]');
  await inputs[1].click();
  await new Promise((r) => setTimeout(r, 150));
  const todayKey = (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
  const afterCheck = await page.evaluate(() => JSON.parse(localStorage.getItem('sf_progress_v2') || 'null').activityDates);
  check('checking a box (false->true) records today\'s streak activity', afterCheck.includes(todayKey), `got ${JSON.stringify(afterCheck)}`);

  await page.close();
}

// ---------- 15: per-lesson timestamped sync merge (reshoot survives a stale sync) ----------

async function syncMergeTest(browser) {
  console.log('\n[15] Sync merge: per-lesson updatedAt, not union-only (reshoots survive a stale-device sync)');
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0' });

  const results = await page.evaluate(() => {
    const out = {};

    // Case 1: reshoot-on-A-then-sync-B keeps the lesson cleared. A reshoots
    // (clears) lesson 5 AFTER B's last known state (all checked, older
    // timestamp). Newer wins per-lesson, so the clear must survive the merge.
    const tA1 = 2000, tB1 = 1000;
    const a1 = { tracks: { smartphone: { lessons: { '5': { checks: [false, false, false, false], updatedAt: tA1 } } } }, activityDates: [] };
    const b1 = { tracks: { smartphone: { lessons: { '5': { checks: [true, true, true, true], updatedAt: tB1 } } } }, activityDates: [] };
    const merged1 = window.SF.mergeStates(a1, b1);
    out.reshootSurvives = merged1.tracks.smartphone.lessons['5'].checks;

    // Case 2: legacy no-timestamp merge still unions (today's behavior for
    // untouched pre-v3 data must not change).
    const a2 = { tracks: { smartphone: { lessons: { '7': { checks: [true, false] } } } }, activityDates: [] };
    const b2 = { tracks: { smartphone: { lessons: { '7': { checks: [false, true] } } } }, activityDates: [] };
    const merged2 = window.SF.mergeStates(a2, b2);
    out.legacyUnions = merged2.tracks.smartphone.lessons['7'].checks;

    // Case 3: fresh check on stale device B after A's reshoot wins if B's
    // check is newer. A reshoots at t=1000; B (unaware of the reshoot) checks
    // a box at t=2000, strictly after A's reshoot -- B's newer state wins.
    const tA3 = 1000, tB3 = 2000;
    const a3 = { tracks: { smartphone: { lessons: { '9': { checks: [false, false], updatedAt: tA3 } } } }, activityDates: [] };
    const b3 = { tracks: { smartphone: { lessons: { '9': { checks: [true, false], updatedAt: tB3 } } } }, activityDates: [] };
    const merged3 = window.SF.mergeStates(a3, b3);
    out.newerCheckWinsOverOlderReshoot = merged3.tracks.smartphone.lessons['9'].checks;

    return out;
  });

  check('reshoot-on-A-then-sync-B keeps the lesson cleared (newer clear beats older stale checks)', JSON.stringify(results.reshootSurvives) === JSON.stringify([false, false, false, false]), `got ${JSON.stringify(results.reshootSurvives)}`);
  check('legacy no-timestamp merge still unions (untouched pre-v3 data behaves exactly as before)', JSON.stringify(results.legacyUnions) === JSON.stringify([true, true]), `got ${JSON.stringify(results.legacyUnions)}`);
  check('a fresh, newer check on a stale device wins over an older reshoot', JSON.stringify(results.newerCheckWinsOverOlderReshoot) === JSON.stringify([true, false]), `got ${JSON.stringify(results.newerCheckWinsOverOlderReshoot)}`);

  await page.close();
}

// ---------- 16: celebration block's "Next" CTA ----------

async function celebrationNextCtaTest(browser) {
  console.log('\n[16] Celebration block has an interactive "Next" CTA (mid-track + last-lesson variants)');
  const fakeUser = { uid: 'celebration-test-uid', displayName: 'Celebration Test', email: 'celebration-test@example.com' };
  const simulateSignIn = (page) => page.evaluate((u) => window.SFAuth._setUser(u), fakeUser);

  // Mid-track lesson: completing it should surface "Next: Lesson N: {title}".
  const midPage = await browser.newPage();
  await midPage.goto(`http://localhost:${PORT}/smartphone/lesson-02.html`, { waitUntil: 'networkidle0' });
  await simulateSignIn(midPage);
  await midPage.evaluate(() => localStorage.clear());
  await midPage.reload({ waitUntil: 'networkidle0' });
  await simulateSignIn(midPage);
  await new Promise((r) => setTimeout(r, 200));
  // Dispatch real "change" events (the same event hydrateChecklist listens
  // for) rather than puppeteer mouse clicks: with 11+ checklist items,
  // checking the last one reflows the celebration block above the list
  // in-place, and a loop of real mouse clicks can lose track of a checkbox's
  // moving on-screen position mid-loop. Dispatching is deterministic either way.
  await midPage.evaluate(() => {
    document.querySelectorAll('.checklist[data-lesson-checklist="2"] input[type=checkbox]').forEach((input) => {
      if (!input.checked) { input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true })); }
    });
  });
  await new Promise((r) => setTimeout(r, 200));

  const midState = await midPage.evaluate(() => {
    const celebration = document.querySelector('[data-celebration="2"]');
    const cta = document.querySelector('[data-celebration-next]');
    return {
      celebrationVisible: !!celebration && getComputedStyle(celebration).display !== 'none',
      ctaText: cta ? cta.textContent.trim() : null,
      ctaHref: cta ? cta.getAttribute('href') : null,
    };
  });
  check('completing a mid-track lesson shows the celebration block', midState.celebrationVisible);
  check('celebration "Next" CTA reads "Next: Lesson 3: ..."', !!midState.ctaText && midState.ctaText.startsWith('Next: Lesson 3:'), `got "${midState.ctaText}"`);
  check('celebration "Next" CTA links to lesson-03.html', midState.ctaHref === 'lesson-03.html', `got "${midState.ctaHref}"`);

  await midPage.evaluate(() => document.querySelector('[data-celebration="2"]').scrollIntoView({ block: 'center' }));
  await renderShot(midPage, 'celebration-next-cta');
  await midPage.close();

  // Last lesson of a track: CTA should point back to the track dashboard, labeled accordingly.
  const lastPage = await browser.newPage();
  await lastPage.goto(`http://localhost:${PORT}/smartphone/lesson-14.html`, { waitUntil: 'networkidle0' });
  await simulateSignIn(lastPage);
  await lastPage.evaluate(() => localStorage.clear());
  await lastPage.reload({ waitUntil: 'networkidle0' });
  await simulateSignIn(lastPage);
  await new Promise((r) => setTimeout(r, 200));
  await lastPage.evaluate(() => {
    document.querySelectorAll('.checklist[data-lesson-checklist="14"] input[type=checkbox]').forEach((input) => {
      if (!input.checked) { input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true })); }
    });
  });
  await new Promise((r) => setTimeout(r, 200));

  const lastState = await lastPage.evaluate(() => {
    const cta = document.querySelector('[data-celebration-next]');
    return { ctaText: cta ? cta.textContent.trim() : null, ctaHref: cta ? cta.getAttribute('href') : null };
  });
  check('celebration "Next" CTA on the last lesson reads "Back to {track} dashboard"', !!lastState.ctaText && lastState.ctaText.startsWith('Back to Smartphone Filmmaker dashboard'), `got "${lastState.ctaText}"`);
  check('celebration "Next" CTA on the last lesson links to the track dashboard', lastState.ctaHref === 'index.html', `got "${lastState.ctaHref}"`);

  await lastPage.close();
}

// ---------- 17: track-completion dead ends (active footer card + 14/14 dashboard state) ----------

async function trackCompletionTest(browser) {
  console.log('\n[17] Track completion no longer dead-ends (active footer card + 14/14 dashboard state)');
  const fakeUser = { uid: 'track-complete-uid', displayName: 'Track Complete Test', email: 'track-complete@example.com' };
  const simulateSignIn = (page) => page.evaluate((u) => window.SFAuth._setUser(u), fakeUser);

  // Last lesson's footer "Track Complete" card must be an active link, not a disabled dead end.
  const lastPage = await browser.newPage();
  await lastPage.goto(`http://localhost:${PORT}/smartphone/lesson-14.html`, { waitUntil: 'networkidle0' });
  await simulateSignIn(lastPage);
  await new Promise((r) => setTimeout(r, 200));
  const footerState = await lastPage.evaluate(() => {
    const card = document.querySelector('.footer-nav-card.next');
    return {
      isDisabledClass: !!card && card.classList.contains('disabled'),
      pointerEvents: card ? getComputedStyle(card).pointerEvents : null,
      href: card ? card.getAttribute('href') : null,
      title: card ? card.querySelector('.footer-nav-title').textContent.trim() : null,
    };
  });
  check('last-lesson footer "Track Complete" card has no disabled class', footerState.isDisabledClass === false);
  check('last-lesson footer "Track Complete" card is clickable (pointer-events not none)', footerState.pointerEvents !== 'none', `got ${footerState.pointerEvents}`);
  check('last-lesson footer "Track Complete" card reads "Back to Track Dashboard"', footerState.title === 'Back to Track Dashboard', `got "${footerState.title}"`);
  check('last-lesson footer "Track Complete" card links to the track dashboard', footerState.href === 'index.html', `got "${footerState.href}"`);
  await lastPage.close();

  // 14/14: the dashboard continue card celebrates the criterion and suggests
  // the natural next track (progression order) instead of a dead end.
  const dashPage = await browser.newPage();
  await dashPage.goto(`http://localhost:${PORT}/smartphone/index.html`, { waitUntil: 'networkidle0' });
  await simulateSignIn(dashPage);
  await dashPage.evaluate(() => localStorage.clear());
  await dashPage.evaluate(() => {
    const itemCounts = window.SF_TRACKS.smartphone.itemCounts;
    const lessons = {};
    Object.keys(itemCounts).forEach((n) => { lessons[n] = { checks: Array(itemCounts[n]).fill(true), updatedAt: Date.now() }; });
    const state = { tracks: { smartphone: { lessons } }, activityDates: [], migratedFromV1: false, schemaVersion: 3 };
    localStorage.setItem('sf_progress_v2', JSON.stringify(state));
  });
  await dashPage.reload({ waitUntil: 'networkidle0' });
  await simulateSignIn(dashPage);
  await new Promise((r) => setTimeout(r, 300));

  const dashState = await dashPage.evaluate(() => {
    const expectedNextName = window.SF_TRACKS['pro-camera'].name;
    return {
      title: document.querySelector('[data-continue-title]').textContent.trim(),
      eyebrow: document.querySelector('[data-continue-eyebrow]').textContent.trim(),
      cardComplete: document.querySelector('.continue-card').classList.contains('complete'),
      ctaText: document.querySelector('[data-continue-cta]').textContent.trim(),
      ctaHref: document.querySelector('[data-continue-cta]').getAttribute('href'),
      expectedNextName,
    };
  });
  check('14/14 dashboard celebrates the criterion ("Every lesson passed")', dashState.title === 'Every lesson passed', `got "${dashState.title}"`);
  check('14/14 dashboard eyebrow reads "Track Complete"', dashState.eyebrow === 'Track Complete', `got "${dashState.eyebrow}"`);
  check('14/14 dashboard continue card carries a .complete state class', dashState.cardComplete === true);
  check('14/14 dashboard suggests the natural next track in progression order (Pro Camera)', dashState.ctaText.includes(dashState.expectedNextName), `got "${dashState.ctaText}"`);
  check('14/14 dashboard CTA links to the suggested next track\'s dashboard', dashState.ctaHref === '../pro-camera/index.html', `got "${dashState.ctaHref}"`);

  await renderShot(dashPage, 'dashboard-track-complete');
  await dashPage.close();
}

// ---------- 18: vocabulary unification ----------

async function vocabularyTest(browser) {
  console.log('\n[18] Vocabulary unification: "Reshoot" everywhere for redo actions, gate back-link wording');

  // Static: "Back to overview" must be gone from every generated page; the
  // gate back-link now reads "Back to Creator Reps" (same href, new label).
  const htmlFiles = [];
  (function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'build' && entry.name !== 'renders' && entry.name !== '.git') walk(p);
      else if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(p);
    });
  })(SITE_ROOT);
  const staleBackLink = htmlFiles.filter((f) => fs.readFileSync(f, 'utf8').includes('Back to overview'));
  check('no page still says "Back to overview"', staleBackLink.length === 0, staleBackLink.slice(0, 5).map((f) => path.relative(SITE_ROOT, f)).join('; '));
  const hasNewBackLink = htmlFiles.some((f) => fs.readFileSync(f, 'utf8').includes('Back to Creator Reps'));
  check('gate back-link reads "Back to Creator Reps"', hasNewBackLink);

  // Live: hub track card CTA says "Reshoot" (not "Review") once a track is fully complete.
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => window.SFAuth._setUser({ uid: 'vocab-test-uid', displayName: 'Vocab Test', email: 'vocab-test@example.com' }));
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => {
    const itemCounts = window.SF_TRACKS.scriptwriting.itemCounts;
    const lessons = {};
    Object.keys(itemCounts).forEach((n) => { lessons[n] = { checks: Array(itemCounts[n]).fill(true), updatedAt: Date.now() }; });
    const state = { tracks: { scriptwriting: { lessons } }, activityDates: [], migratedFromV1: false, schemaVersion: 3 };
    localStorage.setItem('sf_progress_v2', JSON.stringify(state));
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.evaluate(() => window.SFAuth._setUser({ uid: 'vocab-test-uid', displayName: 'Vocab Test', email: 'vocab-test@example.com' }));
  await new Promise((r) => setTimeout(r, 300));
  const ctaLabel = await page.evaluate(() => {
    const cta = document.querySelector('[data-track-card="scriptwriting"] [data-track-cta]');
    return cta ? cta.textContent.trim() : null;
  });
  check('hub card CTA for a fully complete track says "Reshoot" (not "Review")', ctaLabel === 'Reshoot', `got "${ctaLabel}"`);

  await page.close();
}

// ---------- 19: confidence tap stores, persists, and resets on reshoot ----------

async function confidenceTapTest(browser) {
  console.log('\n[19] Confidence tap: stores confidence + timestamp, persists across reload, resets on reshoot');
  const page = await browser.newPage();
  const fakeUser = { uid: 'confidence-test-uid', displayName: 'Confidence Test', email: 'confidence-test@example.com' };
  const simulateSignIn = () => page.evaluate((u) => window.SFAuth._setUser(u), fakeUser);

  await page.goto(`http://localhost:${PORT}/weekend-youtuber/lesson-04.html`, { waitUntil: 'networkidle0' });
  await simulateSignIn();
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await simulateSignIn();
  await new Promise((r) => setTimeout(r, 200));

  await page.evaluate(() => {
    document.querySelectorAll('.checklist[data-lesson-checklist="4"] input[type=checkbox]').forEach((input) => {
      if (!input.checked) { input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true })); }
    });
  });
  await new Promise((r) => setTimeout(r, 200));

  const askingState = await page.evaluate(() => {
    const wrap = document.querySelector('[data-celebration-confidence="4"]');
    return wrap ? wrap.getAttribute('data-confidence-state') : null;
  });
  check('confidence prompt shows the "asking" state right after completion', askingState === 'asking', `got ${askingState}`);

  const buttonsVisible = await page.evaluate(() => {
    const ask = document.querySelector('[data-celebration-confidence="4"] [data-confidence-ask]');
    const noted = document.querySelector('[data-celebration-confidence="4"] [data-confidence-noted]');
    return ask && noted ? { askShown: getComputedStyle(ask).display !== 'none', notedShown: getComputedStyle(noted).display !== 'none' } : null;
  });
  check('the three quiet buttons are visible and the "Noted." confirmation is not, before any tap', !!buttonsVisible && buttonsVisible.askShown && !buttonsVisible.notedShown, JSON.stringify(buttonsVisible));

  await page.click('[data-celebration-confidence="4"] [data-confidence-btn="1"]');
  await new Promise((r) => setTimeout(r, 150));

  const ratedState = await page.evaluate(() => {
    const wrap = document.querySelector('[data-celebration-confidence="4"]');
    const noted = document.querySelector('[data-celebration-confidence="4"] [data-confidence-noted]');
    return { state: wrap ? wrap.getAttribute('data-confidence-state') : null, notedShown: noted ? getComputedStyle(noted).display !== 'none' : false };
  });
  check('tapping "Shaky" flips to the "rated" state', ratedState.state === 'rated', `got ${ratedState.state}`);
  check('the "Noted." confirmation replaces the buttons after a tap', ratedState.notedShown === true);

  const stored = await page.evaluate(() => {
    const v2 = JSON.parse(localStorage.getItem('sf_progress_v2') || 'null');
    const entry = v2 && v2.tracks['weekend-youtuber'] && v2.tracks['weekend-youtuber'].lessons['4'];
    return entry ? { confidence: entry.confidence, hasConfidenceTimestamp: typeof entry.confidenceAt === 'number' } : null;
  });
  check('confidence=1 (Shaky) is stored on the lesson entry', !!stored && stored.confidence === 1, `got ${JSON.stringify(stored)}`);
  check('a confidence timestamp is stored alongside the rating', !!stored && stored.hasConfidenceTimestamp);

  await page.reload({ waitUntil: 'networkidle0' });
  await simulateSignIn();
  await new Promise((r) => setTimeout(r, 300));
  const persistedState = await page.evaluate(() => {
    const wrap = document.querySelector('[data-celebration-confidence="4"]');
    return wrap ? wrap.getAttribute('data-confidence-state') : null;
  });
  check('the confidence confirmation persists after a reload (no nag, no re-ask)', persistedState === 'rated', `got ${persistedState}`);

  await page.evaluate(() => document.querySelector('[data-celebration="4"]').scrollIntoView({ block: 'center' }));
  await renderShot(page, 'celebration-confidence');
  await renderShotMobile(page, 'celebration-confidence');

  // Reshoot: confidence resets so re-completing asks again.
  await page.evaluate(() => { window.confirm = () => true; });
  await page.click('[data-reshoot="4"]');
  await new Promise((r) => setTimeout(r, 150));
  await page.evaluate(() => {
    document.querySelectorAll('.checklist[data-lesson-checklist="4"] input[type=checkbox]').forEach((input) => {
      if (!input.checked) { input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true })); }
    });
  });
  await new Promise((r) => setTimeout(r, 200));
  const askedAgain = await page.evaluate(() => {
    const wrap = document.querySelector('[data-celebration-confidence="4"]');
    return wrap ? wrap.getAttribute('data-confidence-state') : null;
  });
  check('re-completing after a reshoot asks again (confidence resets to "asking")', askedAgain === 'asking', `got ${askedAgain}`);

  await page.close();
}

// ---------- 20: redo target picking (lowest confidence, tie-break oldest) ----------

async function redoTargetPickingTest(browser) {
  console.log('\n[20] Weekly redo target: lowest confidence first (unrated=2), tie-break oldest updatedAt');
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0' });

  const shakyWins = await page.evaluate(() => {
    const itemCounts = window.SF_TRACKS['course-creator'].itemCounts;
    const now = Date.now();
    const lessons = {
      '1': { checks: Array(itemCounts['1']).fill(true), updatedAt: now - 5 * 86400000 }, // unrated (2), oldest touch
      '2': { checks: Array(itemCounts['2']).fill(true), updatedAt: now - 1000, confidence: 2, confidenceAt: now - 1000 },
      '3': { checks: Array(itemCounts['3']).fill(true), updatedAt: now - 500, confidence: 1, confidenceAt: now - 500 }, // Shaky
      '4': { checks: Array(itemCounts['4']).fill(true), updatedAt: now, confidence: 3, confidenceAt: now },
    };
    const state = { tracks: { 'course-creator': { lessons } }, activityDates: [], migratedFromV1: false, schemaVersion: 3 };
    const pick = window.SF.pickRedoTarget(state, 'course-creator');
    const redo = window.SF.getWeeklyRedo(state, 'course-creator');
    return { pick, reason: redo ? redo.reason : null };
  });
  check('the Shaky-rated lesson (3) is picked over unrated/Solid/Nailed-it lessons', shakyWins.pick === 3, `got lesson ${shakyWins.pick}`);
  check('the redo reason for a Shaky pick is confidence-based ("shaky")', shakyWins.reason === 'shaky', `got "${shakyWins.reason}"`);

  const oldestTieBreak = await page.evaluate(() => {
    const itemCounts = window.SF_TRACKS['course-creator'].itemCounts;
    const now = Date.now();
    const lessons = {
      '1': { checks: Array(itemCounts['1']).fill(true), updatedAt: now - 10 * 86400000 }, // unrated, oldest touch
      '2': { checks: Array(itemCounts['2']).fill(true), updatedAt: now - 1000, confidence: 2, confidenceAt: now - 1000 },
      '3': { checks: Array(itemCounts['3']).fill(true), updatedAt: now, confidence: 3, confidenceAt: now },
    };
    const state = { tracks: { 'course-creator': { lessons } }, activityDates: [], migratedFromV1: false, schemaVersion: 3 };
    const pick = window.SF.pickRedoTarget(state, 'course-creator');
    const redo = window.SF.getWeeklyRedo(state, 'course-creator');
    return { pick, reason: redo ? redo.reason : null };
  });
  check('with no Shaky rating present, the oldest-touched lesson (1) wins the tie-break', oldestTieBreak.pick === 1, `got lesson ${oldestTieBreak.pick}`);
  check('the redo reason for an oldest-touch pick reads as recency-based ("oldest")', oldestTieBreak.reason === 'oldest', `got "${oldestTieBreak.reason}"`);

  const noCompletedLessons = await page.evaluate(() => {
    const state = { tracks: { 'course-creator': { lessons: {} } }, activityDates: [], migratedFromV1: false, schemaVersion: 3 };
    return window.SF.getWeeklyRedo(state, 'course-creator');
  });
  check('a track with zero completed lessons has no redo target', noCompletedLessons === null, `got ${JSON.stringify(noCompletedLessons)}`);

  // Live dashboard render: the redo card surfaces the actual picked lesson + CTA.
  const dashPage = await browser.newPage();
  const fakeUser = { uid: 'redo-card-uid', displayName: 'Redo Card Test', email: 'redo-card@example.com' };
  await dashPage.goto(`http://localhost:${PORT}/course-creator/index.html`, { waitUntil: 'networkidle0' });
  await dashPage.evaluate((u) => window.SFAuth._setUser(u), fakeUser);
  await dashPage.evaluate(() => localStorage.clear());
  await dashPage.evaluate(() => {
    const itemCounts = window.SF_TRACKS['course-creator'].itemCounts;
    const now = Date.now();
    const lessons = {
      '1': { checks: Array(itemCounts['1']).fill(true), updatedAt: now - 5 * 86400000 },
      '2': { checks: Array(itemCounts['2']).fill(true), updatedAt: now - 1000, confidence: 3, confidenceAt: now - 1000 },
      '3': { checks: Array(itemCounts['3']).fill(true), updatedAt: now - 500, confidence: 1, confidenceAt: now - 500 },
    };
    const state = { tracks: { 'course-creator': { lessons } }, activityDates: [], migratedFromV1: false, schemaVersion: 3 };
    localStorage.setItem('sf_progress_v2', JSON.stringify(state));
  });
  await dashPage.reload({ waitUntil: 'networkidle0' });
  await dashPage.evaluate((u) => window.SFAuth._setUser(u), fakeUser);
  await new Promise((r) => setTimeout(r, 300));

  const card = await dashPage.evaluate(() => {
    const el = document.querySelector('[data-redo-card]');
    const title = document.querySelector('[data-redo-title]');
    const reason = document.querySelector('[data-redo-reason]');
    const cta = document.querySelector('[data-redo-cta]');
    const ctaLabel = document.querySelector('[data-redo-cta-label]');
    return {
      hidden: el ? el.hasAttribute('hidden') : true,
      title: title ? title.textContent.trim() : null,
      reason: reason ? reason.textContent.trim() : null,
      ctaHref: cta ? cta.getAttribute('href') : null,
      ctaLabel: ctaLabel ? ctaLabel.textContent.trim() : null,
    };
  });
  check('the redo card is visible once the track has a completed lesson', card.hidden === false);
  check('the redo card eyebrow/reason names lesson 3 (the Shaky pick) as the target', card.ctaHref === 'lesson-03.html', `got href="${card.ctaHref}"`);
  check('the redo card reason reads "You rated this one Shaky."', card.reason === 'You rated this one Shaky.', `got "${card.reason}"`);
  check('the redo CTA reads "Reshoot Lesson 3"', card.ctaLabel === 'Reshoot Lesson 3', `got "${card.ctaLabel}"`);
  check('the redo card title is a real lesson title, not empty', !!card.title && card.title.length > 0, `got "${card.title}"`);

  await renderShot(dashPage, 'dashboard-redo-card');

  await dashPage.close();
  await page.close();
}

// ---------- 21: dismiss ("Skip this week") hides the redo for the rest of the week ----------

async function redoDismissTest(browser) {
  console.log('\n[21] Redo dismiss ("Skip this week") shows the done state for the rest of the ISO week');
  const page = await browser.newPage();
  const fakeUser = { uid: 'redo-dismiss-uid', displayName: 'Redo Dismiss Test', email: 'redo-dismiss@example.com' };
  await page.goto(`http://localhost:${PORT}/short-form/index.html`, { waitUntil: 'networkidle0' });
  await page.evaluate((u) => window.SFAuth._setUser(u), fakeUser);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => {
    const itemCounts = window.SF_TRACKS['short-form'].itemCounts;
    const lessons = { '1': { checks: Array(itemCounts['1']).fill(true), updatedAt: Date.now() - 86400000 } };
    const state = { tracks: { 'short-form': { lessons } }, activityDates: [], migratedFromV1: false, schemaVersion: 3 };
    localStorage.setItem('sf_progress_v2', JSON.stringify(state));
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.evaluate((u) => window.SFAuth._setUser(u), fakeUser);
  await new Promise((r) => setTimeout(r, 300));

  const beforeDismiss = await page.evaluate(() => {
    const body = document.querySelector('[data-redo-card-body]');
    const done = document.querySelector('[data-redo-done-body]');
    return { bodyHidden: body ? body.hasAttribute('hidden') : true, doneHidden: done ? done.hasAttribute('hidden') : true };
  });
  check('before dismissing, the redo card shows the pending target, not the done state', beforeDismiss.bodyHidden === false && beforeDismiss.doneHidden === true, JSON.stringify(beforeDismiss));

  await page.click('[data-redo-skip]');
  await new Promise((r) => setTimeout(r, 150));

  const afterDismiss = await page.evaluate(() => {
    const card = document.querySelector('[data-redo-card]');
    const body = document.querySelector('[data-redo-card-body]');
    const done = document.querySelector('[data-redo-done-body]');
    const doneText = document.querySelector('.redo-done-text');
    return {
      cardHidden: card ? card.hasAttribute('hidden') : true,
      bodyHidden: body ? body.hasAttribute('hidden') : true,
      doneHidden: done ? done.hasAttribute('hidden') : true,
      doneText: doneText ? doneText.textContent.trim() : null,
    };
  });
  check('after "Skip this week", the card stays visible but switches to the done state', afterDismiss.cardHidden === false && afterDismiss.bodyHidden === true && afterDismiss.doneHidden === false, JSON.stringify(afterDismiss));
  check('the done state reads "Redo done. Skills keep."', afterDismiss.doneText === 'Redo done. Skills keep.', `got "${afterDismiss.doneText}"`);

  const dismissedForWeek = await page.evaluate(() => {
    const v2 = JSON.parse(localStorage.getItem('sf_progress_v2') || 'null');
    const rw = v2 && v2.tracks['short-form'] && v2.tracks['short-form'].redoWeekly;
    return rw ? { dismissed: rw.dismissed, week: rw.week, matchesCurrentWeek: rw.week === window.SF.isoWeekKey() } : null;
  });
  check('the dismissal is stored per track for the current ISO week (small, sync-safe)', !!dismissedForWeek && dismissedForWeek.dismissed === true && dismissedForWeek.matchesCurrentWeek === true, `got ${JSON.stringify(dismissedForWeek)}`);

  // Reload: done state persists for the rest of the week (no reappearing nag).
  await page.reload({ waitUntil: 'networkidle0' });
  await page.evaluate((u) => window.SFAuth._setUser(u), fakeUser);
  await new Promise((r) => setTimeout(r, 300));
  const persistedAfterReload = await page.evaluate(() => {
    const done = document.querySelector('[data-redo-done-body]');
    return done ? !done.hasAttribute('hidden') : false;
  });
  check('the done state persists after a reload (stays skipped for the rest of the week)', persistedAfterReload === true);

  await page.close();
}

// ---------- 22: hub redo-pending line ----------

async function hubRedoLineTest(browser) {
  console.log('\n[22] Hub: one quiet redo-pending line, pointing at the oldest-waiting track');
  const page = await browser.newPage();
  const fakeUser = { uid: 'hub-redo-uid', displayName: 'Hub Redo Test', email: 'hub-redo@example.com' };
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0' });
  await page.evaluate((u) => window.SFAuth._setUser(u), fakeUser);
  await page.evaluate(() => localStorage.clear());

  const noRedoAnywhere = await page.evaluate(() => {
    const line = document.querySelector('[data-hub-redo-line]');
    return line ? line.hasAttribute('hidden') : true;
  });
  check('hub redo line stays hidden when no track has any completed lesson', noRedoAnywhere === true);

  // Two tracks with a pending redo, assigned at different times -- the older
  // assignment (ai-creator) should win the "at most one" slot over the newer
  // one (scriptwriting), even though scriptwriting is alphabetically earlier.
  await page.evaluate(() => {
    const now = Date.now();
    const scriptItemCounts = window.SF_TRACKS['scriptwriting'].itemCounts;
    const aiItemCounts = window.SF_TRACKS['ai-creator'].itemCounts;
    const state = {
      tracks: {
        'scriptwriting': {
          lessons: { '1': { checks: Array(scriptItemCounts['1']).fill(true), updatedAt: now - 2 * 86400000 } },
          redoWeekly: { week: window.SF.isoWeekKey(), lessonN: 1, dismissed: false, assignedAt: now - 1000, updatedAt: now - 1000 },
        },
        'ai-creator': {
          lessons: { '1': { checks: Array(aiItemCounts['1']).fill(true), updatedAt: now - 2 * 86400000 } },
          redoWeekly: { week: window.SF.isoWeekKey(), lessonN: 1, dismissed: false, assignedAt: now - 50000, updatedAt: now - 50000 },
        },
      },
      activityDates: [], migratedFromV1: false, schemaVersion: 3,
    };
    localStorage.setItem('sf_progress_v2', JSON.stringify(state));
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.evaluate((u) => window.SFAuth._setUser(u), fakeUser);
  await new Promise((r) => setTimeout(r, 300));

  const line = await page.evaluate(() => {
    const el = document.querySelector('[data-hub-redo-line]');
    const trackName = document.querySelector('[data-hub-redo-track]');
    return { hidden: el ? el.hasAttribute('hidden') : true, href: el ? el.getAttribute('href') : null, text: el ? el.textContent.trim() : null, trackName: trackName ? trackName.textContent.trim() : null };
  });
  check('hub redo line is visible when a track has a pending redo', line.hidden === false, JSON.stringify(line));
  // Copy no longer names the track (creative direction round 2); the href assertion below still proves the oldest-redo track is targeted.
  check('hub redo line links to that track\'s dashboard', line.href === 'ai-creator/index.html', `got "${line.href}"`);
  check('hub redo line reads the fixed queue copy', !!line.text && line.text.indexOf('A weekly redo is waiting in your queue') === 0, `got "${line.text}"`);

  // Dismissing the winning track's redo should hand the hub line to the
  // remaining pending track instead of hiding it outright.
  await page.evaluate(() => { window.SF.dismissWeeklyRedo('ai-creator'); });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.evaluate((u) => window.SFAuth._setUser(u), fakeUser);
  await new Promise((r) => setTimeout(r, 300));
  const lineAfterDismiss = await page.evaluate(() => {
    const el = document.querySelector('[data-hub-redo-line]');
    return { hidden: el ? el.hasAttribute('hidden') : true, href: el ? el.getAttribute('href') : null };
  });
  check('once the oldest track\'s redo is dismissed, the hub line falls back to the remaining pending track', lineAfterDismiss.hidden === false && lineAfterDismiss.href === 'scriptwriting/index.html', JSON.stringify(lineAfterDismiss));

  await page.close();
}

// ---------- 24: hub track-card deep-link (first incomplete lesson, dashboard fallback) ----------

async function hubDeepLinkTest(browser) {
  console.log('\n[24] Hub track-card deep-link: jumps to the first incomplete lesson once progress exists, dashboard for a fresh track');
  const page = await browser.newPage();
  const fakeUser = { uid: 'deeplink-test-uid', displayName: 'Deep Link Test', email: 'deeplink-test@example.com' };
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0' });
  await page.evaluate((u) => window.SFAuth._setUser(u), fakeUser);
  await page.evaluate(() => localStorage.clear());

  await page.evaluate(() => {
    const itemCounts = window.SF_TRACKS['content-strategist'].itemCounts;
    const lessons = {
      '1': { checks: Array(itemCounts['1']).fill(true), updatedAt: Date.now() },
      '2': { checks: Array(itemCounts['2']).fill(true), updatedAt: Date.now() },
    };
    const state = { tracks: { 'content-strategist': { lessons } }, activityDates: [], migratedFromV1: false, schemaVersion: 3 };
    localStorage.setItem('sf_progress_v2', JSON.stringify(state));
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.evaluate((u) => window.SFAuth._setUser(u), fakeUser);
  await new Promise((r) => setTimeout(r, 300));

  const hrefs = await page.evaluate(() => {
    return {
      inProgress: document.querySelector('[data-track-card="content-strategist"]').getAttribute('href'),
      untouched: document.querySelector('[data-track-card="scriptwriting"]').getAttribute('href'),
    };
  });
  check('a track with 2/11 done deep-links straight to lesson-03.html (the first incomplete lesson)', hrefs.inProgress === 'content-strategist/lesson-03.html', `got "${hrefs.inProgress}"`);
  check('a track with zero progress still links to its dashboard, not lesson-01.html', hrefs.untouched === 'scriptwriting/index.html', `got "${hrefs.untouched}"`);

  // A fully complete track (Reshoot state) also falls back to the dashboard --
  // there's no single "next" lesson to deep-link to once everything has passed.
  await page.evaluate(() => {
    const itemCounts = window.SF_TRACKS['scriptwriting'].itemCounts;
    const lessons = {};
    Object.keys(itemCounts).forEach((n) => { lessons[n] = { checks: Array(itemCounts[n]).fill(true), updatedAt: Date.now() }; });
    const state = JSON.parse(localStorage.getItem('sf_progress_v2'));
    state.tracks['scriptwriting'] = { lessons };
    localStorage.setItem('sf_progress_v2', JSON.stringify(state));
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.evaluate((u) => window.SFAuth._setUser(u), fakeUser);
  await new Promise((r) => setTimeout(r, 300));
  const completeHref = await page.evaluate(() => document.querySelector('[data-track-card="scriptwriting"]').getAttribute('href'));
  check('a fully complete track (Reshoot) links to its dashboard, not a specific lesson', completeHref === 'scriptwriting/index.html', `got "${completeHref}"`);

  await page.close();
}

async function main() {
  const server = await startServer();
  console.log(`Local server on http://localhost:${PORT}`);

  linkCheck();
  emDashGrep();
  coachStaticChecks();
  designFinaleStaticChecks();

  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });
  await migrationTest(browser);
  await persistenceTest(browser);
  await consoleErrorTest(browser);
  await offlineDegradeTest(browser);
  await gateVisibilityTest(browser);
  await safetyNetTimerTest(browser);
  await signInRevealTest(browser);
  await coachOfflineStateTest(browser);
  await greetingTest(browser);
  await streakCheckOnlyTest(browser);
  await syncMergeTest(browser);
  await celebrationNextCtaTest(browser);
  await trackCompletionTest(browser);
  await vocabularyTest(browser);
  await confidenceTapTest(browser);
  await redoTargetPickingTest(browser);
  await redoDismissTest(browser);
  await hubRedoLineTest(browser);
  await hubDeepLinkTest(browser);
  await browser.close();
  server.close();

  console.log(`\n=================\n${pass} passed, ${fail} failed\n=================`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
