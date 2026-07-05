// ===================== Creator Reps: HTML templates =====================
// String-builder templates. No client framework; output is static HTML that
// assets/progress.js hydrates in the browser via localStorage.

import { pad2, renderInline, renderParagraphs, renderResurfaces } from './lib.mjs';

const HEAD_FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">`;

const APERTURE_MARK_SVG = `<svg class="brand-mark" viewBox="0 0 32 32" fill="none">
  <circle cx="16" cy="16" r="15" stroke="var(--accent)" stroke-width="1.4" opacity="0.55"/>
  <g stroke="var(--accent)" stroke-width="1.4" opacity="0.9">
    <line x1="16" y1="4" x2="16" y2="10"/><line x1="16" y1="22" x2="16" y2="28"/>
    <line x1="4" y1="16" x2="10" y2="16"/><line x1="22" y1="16" x2="28" y2="16"/>
    <line x1="7.5" y1="7.5" x2="11.8" y2="11.8"/><line x1="20.2" y1="20.2" x2="24.5" y2="24.5"/>
    <line x1="7.5" y1="24.5" x2="11.8" y2="20.2"/><line x1="20.2" y1="11.8" x2="24.5" y2="7.5"/>
  </g>
  <circle cx="16" cy="16" r="4.5" fill="var(--accent)"/>
</svg>`;

const CHECK_SVG_INLINE = `<svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const MENU_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round"/></svg>`;
const CLOSE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>`;
const STREAK_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="1.6"><path d="M12 2.5c1 3-2.5 4.6-2.5 8a4.5 4.5 0 1 0 9 0c0-1.8-.9-2.8-1.6-3.6.2 1.6-.7 2.3-1.4 2.3-1 0-1.5-.9-1.2-2C15 5.7 13.5 3.8 12 2.5z"/></svg>`;
const ARROW_LEFT = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ARROW_RIGHT = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const HOME_SVG = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 11.5L12 4l8 7.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const RESHOOT_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12a9 9 0 1 1 3 6.7" stroke-linecap="round"/><path d="M3 17v-4h4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const COACH_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8.5" r="3.2"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" stroke-linecap="round"/></svg>`;
const CELEBRATION_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const GOOD_SVG = `<svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const FAIL_SVG = `<svg viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const AUTH_GOOGLE_SVG = `<svg viewBox="0 0 18 18" width="16" height="16" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>`;

// ---------- auth widget (Google sign-in / account menu, present in every header) ----------
// Two states baked into one markup block; assets/progress.js toggles .is-signed-in
// and fills in name/email/avatar once assets/firebase.js resolves an auth session.
// Signed-out visitors see only the "Sign in" button -- zero behavior change otherwise.
function authWidgetHtml({ compact = false } = {}) {
  return `<div class="auth-widget${compact ? ' compact' : ''}" data-auth-widget>
      <button class="auth-signin-btn" data-auth-signin type="button" aria-label="Sign in with Google">${AUTH_GOOGLE_SVG}<span>Sign in</span></button>
      <div class="auth-account">
        <button class="auth-avatar-btn" data-auth-menu-toggle type="button" aria-haspopup="true" aria-label="Account menu">
          <span class="auth-avatar" data-auth-avatar></span>
          <span class="auth-firstname" data-auth-firstname></span>
        </button>
        <div class="auth-menu" data-auth-menu>
          <p class="auth-menu-email" data-auth-email></p>
          <button class="auth-menu-item" data-auth-signout type="button">Sign out</button>
        </div>
      </div>
    </div>`;
}

// ---------- content gate (lesson pages + track dashboards) ----------
// Server-rendered so the body.gated + data-gate-state="checking" state ships
// in the HTML itself: content is hidden before anything paints, no flash.
// assets/progress.js resolves one of three end states via window.SFAuth:
//   signed in -> removes .gated, reveals the page exactly as before this gate.
//   signed out -> shows the sign-in panel below.
//   Firebase unreachable -> shows the retry panel below (never the sign-in
//   panel, so a blocked network never gets mistaken for "you're logged out").
function contentGateHtml(backHref) {
  return `<div class="content-gate" data-content-gate>
    <div class="gate-card" data-gate-panel="checking">
      <div class="gate-mark gate-mark-quiet">${APERTURE_MARK_SVG}</div>
      <p class="gate-checking-text">Checking your session&hellip;</p>
    </div>
    <div class="gate-card" data-gate-panel="signedout">
      <div class="gate-mark">${APERTURE_MARK_SVG}</div>
      <p class="gate-title">Sign in to train</p>
      <button class="auth-signin-btn gate-signin-btn" data-auth-signin type="button" aria-label="Sign in with Google">${AUTH_GOOGLE_SVG}<span>Sign in with Google</span></button>
      <p class="gate-privacy">Signing in stores your name, email, and lesson progress. Nothing else.</p>
      <a class="gate-back-link" href="${backHref}">${ARROW_LEFT}<span>Back to overview</span></a>
    </div>
    <div class="gate-card" data-gate-panel="blocked">
      <div class="gate-mark gate-mark-quiet">${APERTURE_MARK_SVG}</div>
      <p class="gate-body">Can&rsquo;t verify your session right now. Check your connection and retry.</p>
      <button class="auth-signin-btn gate-signin-btn" data-gate-retry type="button">${RESHOOT_SVG}<span>Retry</span></button>
      <a class="gate-back-link" href="${backHref}">${ARROW_LEFT}<span>Back to overview</span></a>
    </div>
  </div>`;
}

function aperture({ size, progress = 0, label, labelSize, auto = true }) {
  const attrs = [
    `class="aperture"`,
    auto ? 'data-progress-auto' : '',
    `style="--ap-size:${size}px"`,
    `data-progress="${progress}"`,
    `data-blades="8"`,
    label !== undefined ? `data-label="${label}"` : '',
    labelSize ? `data-label-size="${labelSize}"` : '',
  ].filter(Boolean).join(' ');
  return `<div ${attrs}></div>`;
}

// ---------- app shell (sidebar + topbar + tabbar) used by track dashboard + lesson pages ----------

function skillTreeHtml(track) {
  return track.modules.map((mod) => {
    const items = mod.lessons.map((n) => {
      const lesson = track.lessons.find((l) => l.n === n);
      return `          <li class="lesson upcoming" data-lesson="${n}">
            <span class="lesson-index">${n}</span>
            <span class="lesson-name">${renderInline(lesson.title)}</span>
          </li>`;
    }).join('\n');
    return `      <div class="module">
        <p class="module-label">Module ${mod.n} &middot; ${renderInline(mod.name)}</p>
        <ul>
${items}
        </ul>
      </div>`;
  }).join('\n');
}

function sidebarHtml(track, assetPrefix) {
  return `  <aside class="sidebar" id="sidebar">
    <div class="brand">
      <a class="brand-group" href="${assetPrefix}index.html">
        ${APERTURE_MARK_SVG}
        <span class="brand-word">Creator Reps</span>
      </a>
      <button class="sidebar-close" data-nav-close aria-label="Close lesson menu">${CLOSE_SVG}</button>
    </div>

    <div class="course-info">
      <p class="course-eyebrow">Track</p>
      <h2 class="course-title">${renderInline(track.title)}</h2>
    </div>

    <nav class="skill-tree">
${skillTreeHtml(track)}
    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-footer-label"><span>Track progress</span><span class="mono" data-progress-fraction>0/${track.totalLessons}</span></div>
      <div class="linear-track"><div class="linear-fill" data-progress-bar style="width:0%"></div></div>
    </div>
  </aside>
  <div class="nav-backdrop" data-nav-close></div>`;
}

function topbarMobileHtml(track) {
  return `  <header class="topbar-mobile">
    <button data-nav-open aria-label="Open lesson menu" style="display:flex;align-items:center;gap:8px;">
      ${MENU_SVG}
      <span class="brand-word">${renderInline(track.title)}</span>
    </button>
    <div class="topbar-mobile-stats">
      ${aperture({ size: 30, label: `0/${track.totalLessons}`, labelSize: 26 })}
      <div class="stat-compact">
        ${STREAK_SVG}
        <span class="mono" data-streak>0</span>
      </div>
      ${authWidgetHtml({ compact: true })}
    </div>
  </header>`;
}

function tabbarMobileHtml({ track, backHref, prevHref, nextHref, homeHref }) {
  const prev = prevHref
    ? `<a class="tab-item" href="${prevHref}">${ARROW_LEFT}Prev</a>`
    : `<a class="tab-item" href="#" aria-disabled="true" style="opacity:0.3;pointer-events:none;">${ARROW_LEFT}Prev</a>`;
  const next = nextHref
    ? `<a class="tab-item accent" href="${nextHref}">${ARROW_RIGHT}Next</a>`
    : `<a class="tab-item" href="#" aria-disabled="true" style="opacity:0.3;pointer-events:none;">${ARROW_RIGHT}Next</a>`;
  return `  <nav class="tabbar-mobile">
    ${prev}
    <a class="tab-item" href="${homeHref}">${HOME_SVG}Home</a>
    <button class="tab-item" data-nav-open type="button">${MENU_SVG}Lessons</button>
    ${next}
  </nav>`;
}

function scriptsHtml({ assetPrefix, trackSlug, itemCounts, call }) {
  return `<script src="${assetPrefix}assets/tracks-data.js"></script>
<script src="${assetPrefix}assets/progress.js"></script>
<script type="module" src="${assetPrefix}assets/firebase.js"></script>
<script>
  window.SF_TRACK = ${JSON.stringify(trackSlug)};
  document.addEventListener('DOMContentLoaded', function(){
    ${call}
  });
</script>`;
}

// ---------- track dashboard ----------

export function renderTrackDashboard(track) {
  const assetPrefix = '../';
  const moduleChips = track.modules.map((mod) => {
    return `        <div class="module-chip upcoming" data-module="${mod.n}">
          <span class="chip-status">${mod.n}</span>
          <span class="chip-label">${renderInline(mod.name)}</span>
          <span class="chip-frac mono">0/${mod.lessons.length}</span>
        </div>`;
  }).join('\n');

  const howtoItems = track.howto.map((item) => {
    if (item.shortLabel) {
      return `        <div class="howto-item">
          <p class="howto-item-label">${renderInline(item.label)}</p>
          <p>${renderInline(item.body)}</p>
        </div>`;
    }
    var leadPunct = /[.!?]$/.test(item.label) ? '' : '.';
    return `        <div class="howto-item">
          <p><strong>${renderInline(item.label)}${leadPunct}</strong> ${renderInline(item.body)}</p>
        </div>`;
  }).join('\n');

  const firstLessonHref = `lesson-01.html`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${renderInline(track.title)} &middot; Creator Reps</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
${HEAD_FONTS}
<link rel="stylesheet" href="${assetPrefix}assets/styles.css">
</head>
<body class="dashboard gated" data-gate-state="checking">

${contentGateHtml(`${assetPrefix}index.html`)}

${topbarMobileHtml(track)}

<div class="app">

${sidebarHtml(track, assetPrefix)}

  <main class="stage">

    <header class="statusbar">
      <div>
        <p class="greeting-eyebrow" style="font-size:var(--fs-14);color:var(--text-secondary);font-weight:500;margin:0 0 8px;">${renderInline(track.title)}</p>
        <h1 class="greeting-title" style="font-family:var(--font-display);font-size:var(--fs-39);font-weight:500;color:var(--text-primary);margin:0;letter-spacing:-0.005em;">Ready for today&rsquo;s rep, Eric?</h1>
      </div>
      <div class="stats-cluster">
        <div class="stat">
          ${aperture({ size: 52, label: `0/${track.totalLessons}` })}
          <div class="stat-copy"><span class="stat-caption">Track Progress</span></div>
        </div>
        <div class="divider-v"></div>
        ${authWidgetHtml()}
      </div>
    </header>

    <div class="content-pad">

    <section class="hero-grid">
      <article class="continue-card">
        <div class="continue-art">${APERTURE_MARK_SVG}</div>
        <div class="continue-body">
          <p class="continue-eyebrow" data-continue-eyebrow>Start Here</p>
          <h2 class="continue-title" data-continue-title>${renderInline(track.title)}</h2>
          <p class="continue-sub" data-continue-sub>Lesson 1 of ${track.totalLessons} &middot; ${renderInline(track.lessons[0].title)}</p>
          <div class="continue-progress-row">
            ${aperture({ size: 64, label: `0/${track.totalLessons}` })}
            <div class="continue-progress-copy">
              <div class="big" data-continue-big>0 of ${track.totalLessons} lessons complete</div>
              <div class="small" data-continue-small>No reps logged yet. Lesson 1 takes about ten minutes.</div>
            </div>
          </div>
          <a href="${firstLessonHref}" class="btn-primary" data-continue-cta>Start Lesson 1</a>
        </div>
      </article>

      <aside class="today-panel">
        <p class="panel-eyebrow">Your Rhythm</p>
        <div class="streak-display"><span class="num mono" data-streak>0</span><span class="unit">day streak</span></div>
        <p class="streak-copy">Every consecutive day with at least one checked box, in any track, counts. Miss a day and it starts over, that&rsquo;s the only penalty, no guilt trip attached.</p>
        <div class="week-strip" data-week-strip style="display:flex;justify-content:space-between;margin-bottom:16px;"></div>
        <div class="today-stat-row">
          <div class="today-stat"><div class="stat-value mono" data-total-complete>0</div><div class="stat-label">lessons complete</div></div>
          <div class="today-stat"><div class="stat-value mono accent" data-streak>0</div><div class="stat-label">day streak</div></div>
        </div>
      </aside>
    </section>

    <section class="howto-section">
      <div class="howto-header">
        <h3 class="howto-title">How to Use This Track</h3>
        <span class="howto-caption">From the course overview</span>
      </div>
      <div class="howto-grid">
${howtoItems}
      </div>
    </section>

    <section class="map-section">
      <div class="map-header">
        <h3 class="map-title">Your Path</h3>
        <span class="map-caption">${track.modules.length} modules &middot; ${track.totalLessons} lessons</span>
      </div>
      <div class="module-row">
${moduleChips}
      </div>
    </section>

    </div>
  </main>
</div>

<div class="dash-mobile-cta">
  <a href="${firstLessonHref}" data-continue-cta-mobile data-continue-cta>Start Lesson 1</a>
</div>

${scriptsHtml({ assetPrefix, trackSlug: track.slug, call: `SF.hydrateDashboard(${JSON.stringify(track.slug)});` })}

</body>
</html>
`;
  return html;
}

// ---------- lesson page ----------

function objectiveCardHtml(objective) {
  return `        <div class="objective-card">
          <div class="objective-row"><span class="objective-tag">Behavior</span><span class="objective-text">${renderInline(objective.behavior)}</span></div>
          <div class="objective-row"><span class="objective-tag">Condition</span><span class="objective-text">${renderInline(objective.condition)}</span></div>
          <div class="objective-row"><span class="objective-tag">Criterion</span><span class="objective-text">${renderInline(objective.criterion)}</span></div>
        </div>`;
}

function watchGridHtml(watchGood, watchFail) {
  const good = watchGood.map((t) => `          <li>${renderInline(t)}</li>`).join('\n');
  const fail = watchFail.map((t) => `          <li>${renderInline(t)}</li>`).join('\n');
  return `        <div class="watch-grid">
      <div class="watch-card good">
        <p class="watch-card-title">${GOOD_SVG}Good</p>
        <ul class="watch-list">
${good}
        </ul>
      </div>
      <div class="watch-card fail">
        <p class="watch-card-title">${FAIL_SVG}Classic Failure</p>
        <ul class="watch-list">
${fail}
        </ul>
      </div>
        </div>`;
}

function checklistHtml(lesson) {
  const items = lesson.checklist.map((text, i) => {
    return `            <label class="check-item"><input type="checkbox" id="check-${lesson.n}-${i}"><span class="check-text">${renderInline(text)}</span></label>`;
  }).join('\n');
  return `        <div class="checklist-card">
          <div class="celebration" data-celebration="${lesson.n}">
            ${CELEBRATION_SVG}
            <div>
              <p class="celebration-title">Lesson complete</p>
              <p class="celebration-body">Criterion met: ${renderInline(lesson.objective.criterion)}</p>
            </div>
          </div>
          <div class="checklist-head">
            <span class="checklist-progress" data-checklist-progress="${lesson.n}">0 / ${lesson.checklist.length}</span>
          </div>
          <div class="checklist" data-lesson-checklist="${lesson.n}">
${items}
          </div>
          <div class="checklist-footer">
            <span style="font-size:12px;color:var(--text-tertiary);">Redoing a drill is part of the method, not a failure.</span>
            <button class="reshoot-btn" data-reshoot="${lesson.n}" type="button">${RESHOOT_SVG}Reshoot this lesson</button>
          </div>
        </div>`;
}

function videoStageHtml(videoPick) {
  if (!videoPick || videoPick.gap) {
    const note = videoPick ? videoPick.gapText : 'No demo video meets the bar for this one; the technique section carries it.';
    return `    <section class="video-stage">
      <div class="video-gap-note" style="margin-top:0;"><span class="warn-dot"></span><p><b>No video for this one:</b> ${note}</p></div>
    </section>`;
  }
  const twoUp = videoPick.entries.length > 1 ? ' two-up' : '';
  const blocks = videoPick.entries.map((e) => {
    const params = e.startSec !== null ? `&start=${e.startSec}&end=${e.endSec}` : '';
    const metaParts = [e.channel, e.totalLen, e.rangeDisplay].filter(Boolean);
    return `        <div class="video-block">
          <div class="video-embed">
            <iframe src="https://www.youtube-nocookie.com/embed/${e.videoId}?rel=0${params}" title="${renderInline(e.title)}" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
          </div>
          <div class="video-caption">
            <p class="video-caption-title">${renderInline(e.title)}</p>
            ${metaParts.length ? `<p class="video-caption-meta">${metaParts.map(renderInline).join(' &middot; ')}</p>` : ''}
            ${e.why ? `<p class="video-caption-why">${renderInline(e.why)}</p>` : ''}
          </div>
        </div>`;
  }).join('\n');
  return `    <section class="video-stage">
      <div class="video-grid${twoUp}">
${blocks}
      </div>
    </section>`;
}

export function renderLessonPage(track, lesson, prevLesson, nextLesson) {
  const assetPrefix = '../';
  const nn = pad2(lesson.n);
  const prevHref = prevLesson ? `lesson-${pad2(prevLesson.n)}.html` : null;
  const nextHref = nextLesson ? `lesson-${pad2(nextLesson.n)}.html` : null;
  const videoPick = track.videoPicks.get(lesson.n);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${renderInline(track.title)} &middot; Lesson ${lesson.n}: ${renderInline(lesson.title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
${HEAD_FONTS}
<link rel="stylesheet" href="${assetPrefix}assets/styles.css">
</head>
<body class="gated" data-gate-state="checking">

${contentGateHtml(`${assetPrefix}index.html`)}

${topbarMobileHtml(track)}
<div class="breadcrumb-row-mobile">Module ${lesson.moduleNum} <span class="current">&middot; Lesson ${lesson.n} of ${track.totalLessons}</span></div>

<div class="app">

${sidebarHtml(track, assetPrefix)}

  <main class="stage">

    <header class="statusbar">
      <div class="breadcrumb">${renderInline(track.title)} <span class="sep">/</span> <span class="current">Module ${lesson.moduleNum} &middot; Lesson ${lesson.n} of ${track.totalLessons}</span></div>
      <div class="stats-cluster">
        <div class="stat">
          ${aperture({ size: 52, label: `0/${track.totalLessons}` })}
          <div class="stat-copy"><span class="stat-caption">Track Progress</span></div>
        </div>
        <div class="divider-v"></div>
        <div class="stat">
          ${STREAK_SVG}
          <div class="stat-copy"><span class="stat-value mono" data-streak>0</span><span class="stat-label">day streak</span></div>
        </div>
        <div class="divider-v"></div>
        ${prevHref ? `<a class="btn-nav" href="${prevHref}">${ARROW_LEFT}Prev</a>` : `<span class="btn-nav" disabled>${ARROW_LEFT}Prev</span>`}
        ${nextHref ? `<a class="btn-nav" href="${nextHref}">Next${ARROW_RIGHT}</a>` : `<span class="btn-nav" disabled>Next${ARROW_RIGHT}</span>`}
        <div class="divider-v"></div>
        ${authWidgetHtml()}
      </div>
    </header>

    <div class="content-pad">

    <section class="lesson-head">
      <p class="lesson-eyebrow">Lesson ${lesson.n} of ${track.totalLessons} &middot; Module ${lesson.moduleNum}: ${renderInline(lesson.moduleName)}</p>
      <h1 class="lesson-title">${renderInline(lesson.title)}</h1>
      <p class="lesson-objective">${renderInline(lesson.objective.behavior)}</p>
    </section>

${videoStageHtml(videoPick)}

    <div class="content-col">

      <section class="section">
        <p class="section-eyebrow">Objective</p>
${objectiveCardHtml(lesson.objective)}
      </section>

      <section class="section">
        <p class="section-eyebrow">Why This Matters</p>
        <div class="prose">${renderParagraphs(lesson.whyMatters)}</div>
      </section>

      <section class="section">
        <p class="section-eyebrow">The Technique</p>
        <div class="prose">${renderParagraphs(lesson.technique)}</div>
      </section>

      <section class="section">
        <p class="section-eyebrow">Watch For This</p>
${watchGridHtml(lesson.watchGood, lesson.watchFail)}
      </section>

      <section class="section">
        <p class="section-eyebrow">Your Drill</p>
        <div class="card drill-card">
          <div class="prose" style="font-size:var(--fs-16);color:var(--text-primary);">${renderParagraphs(lesson.drill)}</div>
        </div>
      </section>

      <section class="section">
        <p class="section-eyebrow">Pass Checklist</p>
${checklistHtml(lesson)}
      </section>

      <section class="section">
        <p class="section-eyebrow">Coach Note</p>
        <div class="coach-card">
          <div class="coach-note-row">
            <div class="coach-avatar">${COACH_SVG}</div>
            <p class="coach-text">${renderInline(lesson.coachNote)}</p>
          </div>
        </div>
      </section>

    <section class="section">
      <p class="section-eyebrow">Resurfaces In</p>
      <p class="resurfaces-row">${renderResurfaces(lesson.resurfacesRaw, track.totalLessons)}</p>
    </section>

    <nav class="lesson-footer-nav">
      <a class="footer-nav-card prev" href="index.html"><span class="footer-nav-label">${ARROW_LEFT}Back to</span><span class="footer-nav-title">Track Dashboard</span></a>
      ${nextLesson ? `<a class="footer-nav-card next" href="${nextHref}"><span class="footer-nav-label">Next${ARROW_RIGHT}</span><span class="footer-nav-title">Lesson ${nextLesson.n}: ${renderInline(nextLesson.title)}</span></a>` : `<a class="footer-nav-card next disabled" href="index.html"><span class="footer-nav-label">Track Complete${ARROW_RIGHT}</span><span class="footer-nav-title">Back to ${renderInline(track.title)}</span></a>`}
    </nav>

    </div>
    </div>
  </main>
</div>

${tabbarMobileHtml({ track, prevHref, nextHref, homeHref: 'index.html' })}

${scriptsHtml({
  assetPrefix,
  trackSlug: track.slug,
  call: `SF.hydrateChecklist(${JSON.stringify(track.slug)}, ${lesson.n});`,
})}

</body>
</html>
`;
  return html;
}

// ---------- redirect stub (old root lesson-NN.html -> smartphone/lesson-NN.html) ----------

export function renderRedirectStub(targetHref, label) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Redirecting&hellip; &middot; Creator Reps</title>
<meta http-equiv="refresh" content="0; url=${targetHref}">
<link rel="canonical" href="${targetHref}">
<meta name="robots" content="noindex">
<style>body{background:#0B0F12;color:#F2EFE9;font-family:Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
a{color:#E8A33D;}</style>
</head>
<body>
<script>window.location.replace(${JSON.stringify(targetHref)});</script>
<p>This lesson moved. Redirecting to <a href="${targetHref}">${label}</a>&hellip;</p>
</body>
</html>
`;
}

// ---------- hub ----------

export function renderHub(tracks) {
  const totalAcademyLessons = tracks.reduce((sum, t) => sum + t.totalLessons, 0);

  const trackCards = tracks.map((t) => {
    return `        <a class="track-card" href="${t.slug}/index.html" data-track-card="${t.slug}">
          <div class="track-card-top">
            ${aperture({ size: 56, label: `0/${t.totalLessons}`, labelSize: 15 })}
            <div class="track-card-heading">
              <p class="track-card-eyebrow">Track</p>
              <h3 class="track-card-title">${renderInline(t.title)}</h3>
            </div>
          </div>
          <p class="track-card-desc">${renderInline(t.tagline)}</p>
          <div class="track-card-foot">
            <span class="track-card-modules">${t.modules.length} modules &middot; ${t.totalLessons} lessons</span>
            <span class="track-card-cta" data-track-cta>Start<span class="cta-arrow">${ARROW_RIGHT}</span></span>
          </div>
        </a>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Creator Reps &middot; Academy</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
${HEAD_FONTS}
<link rel="stylesheet" href="assets/styles.css">
</head>
<body class="hub">

  <header class="topbar-mobile">
    <div style="display:flex;align-items:center;gap:8px;">
      ${APERTURE_MARK_SVG}
      <span class="brand-word">Creator Reps</span>
    </div>
    <div class="topbar-mobile-stats">
      <div class="stat-compact">
        ${STREAK_SVG}
        <span class="mono" data-streak>0</span>
      </div>
      ${authWidgetHtml({ compact: true })}
    </div>
  </header>

  <div class="hub-shell">

    <header class="hub-header">
      <a class="brand-group" href="index.html">
        ${APERTURE_MARK_SVG}
        <span class="brand-word">Creator Reps</span>
      </a>
      <div class="stats-cluster">
        <div class="stat">
          ${STREAK_SVG}
          <div class="stat-copy"><span class="stat-value mono" data-streak>0</span><span class="stat-label">day streak</span></div>
        </div>
        <div class="divider-v"></div>
        ${authWidgetHtml()}
      </div>
    </header>

    <section class="hub-greeting">
      <div class="hub-greeting-signedout" data-hub-signedout>
        <p class="greeting-eyebrow" style="font-size:var(--fs-14);color:var(--text-secondary);font-weight:500;margin:0 0 8px;">Creator Reps Academy</p>
        <h1 class="greeting-title" style="font-family:var(--font-display);font-size:var(--fs-39);font-weight:500;color:var(--text-primary);margin:0 0 12px;letter-spacing:-0.005em;">Creator skills, built one rep at a time.</h1>
        <p class="hub-pitch">Filmmaking, AI content, YouTube, short-form, strategy, and scriptwriting: ${tracks.length} tracks, ${tracks.reduce((n, t) => n + t.totalLessons, 0)} lessons, one rule. Every lesson ends with something real you made. Sign in with Google to save your progress and pick up where you left off.</p>
        <button class="auth-signin-btn gate-signin-btn" data-auth-signin type="button" aria-label="Sign in with Google">${AUTH_GOOGLE_SVG}<span>Sign in with Google</span></button>
      </div>
      <div class="hub-greeting-signedin" data-hub-signedin>
        <p class="greeting-eyebrow" style="font-size:var(--fs-14);color:var(--text-secondary);font-weight:500;margin:0 0 8px;">Creator Reps Academy</p>
        <h1 class="greeting-title" style="font-family:var(--font-display);font-size:var(--fs-39);font-weight:500;color:var(--text-primary);margin:0 0 24px;letter-spacing:-0.005em;">Ready for today&rsquo;s rep, Eric?</h1>
        <div class="hub-stat-row">
          ${aperture({ size: 88, label: `0/${totalAcademyLessons}`, labelSize: 22 })}
          <div class="hub-stat-copy">
            <div class="big" data-academy-complete>0 of ${totalAcademyLessons} lessons complete</div>
            <div class="small">Across all 8 tracks. Pick one up where you left off, or start something new.</div>
          </div>
        </div>
      </div>
    </section>

    <section class="track-grid-section">
      <div class="map-header">
        <h3 class="map-title">Your Tracks</h3>
        <span class="map-caption">${tracks.length} tracks &middot; ${totalAcademyLessons} lessons total</span>
      </div>
      <div class="track-grid">
${trackCards}
      </div>
    </section>

  </div>

<script src="assets/tracks-data.js"></script>
<script src="assets/progress.js"></script>
<script type="module" src="assets/firebase.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function(){
    SF.hydrateHub();
  });
</script>

</body>
</html>
`;
}
