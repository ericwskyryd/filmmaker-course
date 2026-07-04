/* ===================== Creator Reps: Progress Engine (multi-track) ===================== */
/* All state lives in localStorage. No server, no backend. */
/* Depends on assets/tracks-data.js (window.SF_TRACKS) being loaded first. */
(function(){
  'use strict';

  var STORAGE_KEY_V2 = 'sf_progress_v2';
  var LEGACY_KEY_V1 = 'sf_progress_v1';   // old single-course (Smartphone Filmmaker) key
  var LEGACY_TRACK = 'smartphone';

  var CHECK_SVG = '<svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function tracksData(){ return window.SF_TRACKS || {}; }

  function todayStr(d){
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  /* ===================== State load / save / migrate ===================== */

  function blankState(){
    return { tracks: {}, activityDates: [], migratedFromV1: false };
  }

  function readRawV2(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY_V2);
      if(!raw) return null;
      var parsed = JSON.parse(raw);
      if(!parsed.tracks) parsed.tracks = {};
      if(!parsed.activityDates) parsed.activityDates = [];
      return parsed;
    }catch(e){
      return null;
    }
  }

  function saveState(state){
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state));
  }

  /* Migrate legacy single-course progress (sf_progress_v1, un-namespaced,
     always the Smartphone Filmmaker course) into the namespaced v2 scheme.
     Idempotent and non-destructive: only fills in lessons/dates the v2 state
     doesn't already have, never overwrites newer v2 progress, and is safe to
     call on every page load. */
  function migrateLegacy(state){
    var raw;
    try{ raw = localStorage.getItem(LEGACY_KEY_V1); }catch(e){ raw = null; }
    if(!raw) return state;
    var legacy;
    try{ legacy = JSON.parse(raw); }catch(e){ return state; }
    if(!legacy || !legacy.lessons) return state;

    if(!state.tracks[LEGACY_TRACK]) state.tracks[LEGACY_TRACK] = { lessons: {} };
    var destLessons = state.tracks[LEGACY_TRACK].lessons;
    var changed = false;

    Object.keys(legacy.lessons).forEach(function(lessonKey){
      if(!destLessons[lessonKey]){
        var legacyChecks = (legacy.lessons[lessonKey] && legacy.lessons[lessonKey].checks) || [];
        if(legacyChecks.some(Boolean)){
          destLessons[lessonKey] = { checks: legacyChecks.slice() };
          changed = true;
        }
      }
    });

    (legacy.activityDates || []).forEach(function(d){
      if(state.activityDates.indexOf(d) === -1){
        state.activityDates.push(d);
        changed = true;
      }
    });

    if(changed || !state.migratedFromV1){
      state.migratedFromV1 = true;
      saveState(state);
    }
    return state;
  }

  function loadState(){
    var state = readRawV2() || blankState();
    state = migrateLegacy(state);
    return state;
  }

  function getTrackState(state, slug){
    if(!state.tracks[slug]) state.tracks[slug] = { lessons: {} };
    return state.tracks[slug];
  }

  /* ===================== Checklist state ===================== */

  function getChecks(trackState, lessonNum, itemCount){
    var key = String(lessonNum);
    var arr = (trackState.lessons[key] && trackState.lessons[key].checks) || [];
    var out = [];
    for(var i=0;i<itemCount;i++){ out.push(!!arr[i]); }
    return out;
  }

  function isLessonComplete(trackState, lessonNum, itemCount){
    if(!itemCount) return false;
    var checks = getChecks(trackState, lessonNum, itemCount);
    for(var i=0;i<checks.length;i++){ if(!checks[i]) return false; }
    return true;
  }

  function setCheck(slug, lessonNum, itemIndex, checked, itemCount){
    var state = loadState();
    var trackState = getTrackState(state, slug);
    var key = String(lessonNum);
    if(!trackState.lessons[key]) trackState.lessons[key] = { checks: [] };
    var checks = getChecks(trackState, lessonNum, itemCount);
    checks[itemIndex] = checked;
    trackState.lessons[key].checks = checks;
    recordActivity(state);
    saveState(state);
    return state;
  }

  function resetLesson(slug, lessonNum){
    var state = loadState();
    var trackState = getTrackState(state, slug);
    trackState.lessons[String(lessonNum)] = { checks: [] };
    saveState(state);
    return state;
  }

  function recordActivity(state){
    var t = todayStr();
    if(state.activityDates.indexOf(t) === -1){
      state.activityDates.push(t);
      if(state.activityDates.length > 400){
        state.activityDates = state.activityDates.slice(-400);
      }
    }
  }

  function getStreak(state){
    var set = {};
    state.activityDates.forEach(function(d){ set[d]=true; });
    var d = new Date();
    if(!set[todayStr(d)]){
      d.setDate(d.getDate()-1);
    }
    var streak = 0;
    while(set[todayStr(d)]){
      streak++;
      d.setDate(d.getDate()-1);
    }
    return streak;
  }

  /* ===================== Per-track + academy-wide rollups ===================== */

  function getCompletedCount(state, slug){
    var td = tracksData()[slug];
    if(!td) return 0;
    var trackState = getTrackState(state, slug);
    var count = 0;
    for(var n=1;n<=td.totalLessons;n++){
      var ic = td.itemCounts[n];
      if(ic && isLessonComplete(trackState, n, ic)) count++;
    }
    return count;
  }

  function getFirstIncomplete(state, slug){
    var td = tracksData()[slug];
    if(!td) return null;
    var trackState = getTrackState(state, slug);
    for(var n=1;n<=td.totalLessons;n++){
      var ic = td.itemCounts[n];
      if(!ic || !isLessonComplete(trackState, n, ic)) return n;
    }
    return null;
  }

  function getAcademyCompleted(state){
    var total = 0;
    Object.keys(tracksData()).forEach(function(slug){
      total += getCompletedCount(state, slug);
    });
    return total;
  }

  function getAcademyTotal(){
    var total = 0;
    Object.keys(tracksData()).forEach(function(slug){ total += tracksData()[slug].totalLessons; });
    return total;
  }

  /* ===================== Aperture ring builder (signature element) ===================== */
  function buildAperture(el){
    var SVGNS = 'http://www.w3.org/2000/svg';
    function polar(cx, cy, r, angleDeg){ var rad = angleDeg * Math.PI / 180; return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]; }
    function sectorPath(cx, cy, rOuter, rInner, a0, a1){
      var p1 = polar(cx, cy, rOuter, a0), p2 = polar(cx, cy, rOuter, a1), p3 = polar(cx, cy, rInner, a1), p4 = polar(cx, cy, rInner, a0);
      var largeArc = (a1 - a0) > 180 ? 1 : 0;
      return 'M ' + p1[0] + ' ' + p1[1] + ' A ' + rOuter + ' ' + rOuter + ' 0 ' + largeArc + ' 1 ' + p2[0] + ' ' + p2[1] +
        ' L ' + p3[0] + ' ' + p3[1] + ' A ' + rInner + ' ' + rInner + ' 0 ' + largeArc + ' 0 ' + p4[0] + ' ' + p4[1] + ' Z';
    }
    var progress = Math.max(0, Math.min(1, parseFloat(el.dataset.progress) || 0));
    var blades = parseInt(el.dataset.blades, 10) || 8;
    var hasLabel = el.dataset.label !== undefined;
    var cx = 50, cy = 50, rOuter = 47, rInner = hasLabel ? 29 : 34;
    var gap = 2.6, bladeAngle = 360 / blades;
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
    var ring = document.createElementNS(SVGNS, 'circle');
    ring.setAttribute('cx', cx); ring.setAttribute('cy', cy); ring.setAttribute('r', rOuter + 1.5);
    ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', 'rgba(255,255,255,0.10)'); ring.setAttribute('stroke-width', '1');
    svg.appendChild(ring);
    for (var i = 0; i < blades; i++){
      var bladeStart = -90 + i * bladeAngle + gap / 2, bladeEnd = -90 + (i + 1) * bladeAngle - gap / 2;
      var fracStart = i / blades, fracEnd = (i + 1) / blades;
      var basePath = document.createElementNS(SVGNS, 'path');
      basePath.setAttribute('d', sectorPath(cx, cy, rOuter, rInner, bladeStart, bladeEnd));
      basePath.setAttribute('fill', 'rgba(255,255,255,0.07)'); basePath.setAttribute('stroke', 'rgba(255,255,255,0.05)'); basePath.setAttribute('stroke-width', '0.5');
      svg.appendChild(basePath);
      if (progress > fracStart){
        var amberFrac = Math.min(1, (progress - fracStart) / (fracEnd - fracStart));
        var amberEnd = bladeStart + (bladeEnd - bladeStart) * amberFrac;
        var amberPath = document.createElementNS(SVGNS, 'path');
        amberPath.setAttribute('d', sectorPath(cx, cy, rOuter, rInner, bladeStart, amberEnd));
        amberPath.setAttribute('fill', (i % 2 === 0) ? '#E8A33D' : '#E5A544');
        amberPath.setAttribute('stroke', 'rgba(11,15,18,0.35)'); amberPath.setAttribute('stroke-width', '0.6');
        amberPath.setAttribute('class', 'ap-blade-amber');
        svg.appendChild(amberPath);
      }
    }
    var hole = document.createElementNS(SVGNS, 'circle');
    hole.setAttribute('cx', cx); hole.setAttribute('cy', cy); hole.setAttribute('r', rInner - 1);
    hole.setAttribute('fill', el.dataset.holeColor || '#0B0F12');
    svg.appendChild(hole);
    if (hasLabel){
      var text = document.createElementNS(SVGNS, 'text');
      text.setAttribute('x', cx); text.setAttribute('y', cy + 5); text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-family', "'IBM Plex Mono', monospace"); text.setAttribute('font-size', el.dataset.labelSize || '16'); text.setAttribute('font-weight', '600'); text.setAttribute('fill', '#F2EFE9');
      text.textContent = el.dataset.label;
      svg.appendChild(text);
    }
    el.innerHTML = '';
    el.appendChild(svg);
  }

  function refreshApertures(){
    document.querySelectorAll('.aperture[data-progress]').forEach(buildAperture);
  }

  /* ===================== Track page hydration (sidebar nav + module map) ===================== */
  function hydrateNav(slug, activeLessonNum){
    var td = tracksData()[slug];
    if(!td) return null;
    var state = loadState();
    var trackState = getTrackState(state, slug);
    var completed = getCompletedCount(state, slug);
    var firstIncomplete = getFirstIncomplete(state, slug);
    var resolvedActive = activeLessonNum || firstIncomplete || 1;

    document.querySelectorAll('[data-lesson]').forEach(function(li){
      var n = parseInt(li.getAttribute('data-lesson'), 10);
      var ic = td.itemCounts[n];
      var complete = ic ? isLessonComplete(trackState, n, ic) : false;
      li.classList.remove('complete','active','upcoming');
      var idxEl = li.querySelector('.lesson-index, .chip-status');
      if(complete){
        li.classList.add('complete');
        if(idxEl) idxEl.innerHTML = CHECK_SVG;
      } else if(n === resolvedActive){
        li.classList.add('active');
        if(idxEl) idxEl.textContent = n;
      } else {
        li.classList.add('upcoming');
        if(idxEl) idxEl.textContent = n;
      }
    });

    document.querySelectorAll('[data-module]').forEach(function(chip){
      var m = parseInt(chip.getAttribute('data-module'), 10);
      var moduleDef = td.modules.filter(function(md){ return md.n === m; })[0];
      if(!moduleDef) return;
      var lessonsInModule = moduleDef.lessons;
      var moduleComplete = lessonsInModule.every(function(n){ var ic = td.itemCounts[n]; return ic && isLessonComplete(trackState, n, ic); });
      var containsActive = lessonsInModule.indexOf(resolvedActive) !== -1;
      chip.classList.remove('complete','current','upcoming');
      var statusEl = chip.querySelector('.chip-status');
      var fracEl = chip.querySelector('.chip-frac');
      var doneInModule = lessonsInModule.filter(function(n){ var ic = td.itemCounts[n]; return ic && isLessonComplete(trackState, n, ic); }).length;
      if(moduleComplete){
        chip.classList.add('complete');
        if(statusEl) statusEl.innerHTML = CHECK_SVG;
      } else if(containsActive){
        chip.classList.add('current');
        if(statusEl) statusEl.textContent = resolvedActive;
      } else {
        chip.classList.add('upcoming');
        if(statusEl) statusEl.innerHTML = '<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.4" fill="currentColor"/></svg>';
      }
      if(fracEl) fracEl.textContent = doneInModule + '/' + lessonsInModule.length;
    });

    var frac = completed + '/' + td.totalLessons;
    var pct = completed / td.totalLessons;
    document.querySelectorAll('[data-progress-fraction]').forEach(function(el){ el.textContent = frac; });
    document.querySelectorAll('[data-progress-bar]').forEach(function(el){ el.style.width = (pct*100) + '%'; });
    document.querySelectorAll('.aperture[data-progress-auto]').forEach(function(el){
      el.dataset.progress = pct;
      if(el.dataset.label !== undefined) el.dataset.label = frac;
    });

    var streak = getStreak(state);
    document.querySelectorAll('[data-streak]').forEach(function(el){ el.textContent = streak; });

    refreshApertures();

    return { state:state, trackState:trackState, completed:completed, firstIncomplete:firstIncomplete, streak:streak, resolvedActive:resolvedActive };
  }

  function hydrateChecklist(slug, lessonNum){
    var list = document.querySelector('.checklist[data-lesson-checklist="' + lessonNum + '"]');
    if(!list) return;
    var inputs = Array.prototype.slice.call(list.querySelectorAll('input[type="checkbox"]'));
    var itemCount = inputs.length;

    function render(){
      var state = loadState();
      var trackState = getTrackState(state, slug);
      var c = getChecks(trackState, lessonNum, itemCount);
      var doneCount = c.filter(Boolean).length;
      inputs.forEach(function(input, i){ input.checked = c[i]; });
      var progressEl = document.querySelector('[data-checklist-progress="' + lessonNum + '"]');
      if(progressEl) progressEl.textContent = doneCount + ' / ' + itemCount;
      var celebration = document.querySelector('[data-celebration="' + lessonNum + '"]');
      var complete = isLessonComplete(trackState, lessonNum, itemCount);
      if(celebration){
        celebration.classList.toggle('show', complete);
      }
      hydrateNav(slug, lessonNum);
    }

    inputs.forEach(function(input, i){
      input.addEventListener('change', function(){
        setCheck(slug, lessonNum, i, input.checked, itemCount);
        render();
      });
    });

    var resetBtn = document.querySelector('[data-reshoot="' + lessonNum + '"]');
    if(resetBtn){
      resetBtn.addEventListener('click', function(){
        var ok = window.confirm('Clear this lesson’s checklist and reshoot? Your other lessons stay untouched.');
        if(!ok) return;
        resetLesson(slug, lessonNum);
        render();
      });
    }

    render();
  }

  var DAY_LETTERS = ['S','M','T','W','T','F','S'];

  function renderWeekStrip(stripEl, state){
    if(!stripEl) return;
    var set = {};
    state.activityDates.forEach(function(d){ set[d]=true; });
    stripEl.innerHTML = '';
    for(var i=6;i>=0;i--){
      var d = new Date();
      d.setDate(d.getDate()-i);
      var key = todayStr(d);
      var isToday = (i===0);
      var done = !!set[key];
      var cell = document.createElement('div');
      cell.className = 'week-day' + (done ? ' done' : (isToday ? ' today' : ' future'));
      var label = document.createElement('span');
      label.className = 'day-label';
      label.textContent = DAY_LETTERS[d.getDay()];
      var dot = document.createElement('span');
      dot.className = 'day-dot';
      if(done) dot.innerHTML = CHECK_SVG;
      cell.appendChild(label);
      cell.appendChild(dot);
      stripEl.appendChild(cell);
    }
  }

  function hydrateDashboard(slug){
    var td = tracksData()[slug];
    if(!td) return;
    var nav = hydrateNav(slug, null);
    var state = nav.state;

    var subEl = document.querySelector('[data-continue-sub]');
    var ctaEls = document.querySelectorAll('[data-continue-cta]');
    var eyebrowEl = document.querySelector('[data-continue-eyebrow]');
    var titleEl = document.querySelector('[data-continue-title]');
    var bigEl = document.querySelector('[data-continue-big]');
    var smallEl = document.querySelector('[data-continue-small]');

    if(nav.firstIncomplete){
      var lesson = td.lessons[nav.firstIncomplete - 1];
      var idStr = String(nav.firstIncomplete).padStart(2,'0');
      if(eyebrowEl) eyebrowEl.textContent = nav.completed === 0 ? 'Start Here' : 'Continue';
      if(titleEl) titleEl.textContent = td.name;
      if(subEl) subEl.textContent = 'Lesson ' + nav.firstIncomplete + ' of ' + td.totalLessons + ' · ' + (lesson ? lesson.title : '');
      ctaEls.forEach(function(el){ el.textContent = (nav.completed === 0 ? 'Start Lesson ' : 'Continue Lesson ') + nav.firstIncomplete; el.setAttribute('href', 'lesson-' + idStr + '.html'); });
      if(bigEl) bigEl.textContent = nav.completed + ' of ' + td.totalLessons + ' lessons complete';
      if(smallEl) smallEl.textContent = nav.completed === 0 ? 'No reps logged yet. Lesson 1 takes about ten minutes.' : 'Pick up right where the last checked box left off.';
    } else {
      if(eyebrowEl) eyebrowEl.textContent = 'All Clear';
      if(titleEl) titleEl.textContent = 'Track Complete';
      if(subEl) subEl.textContent = 'All ' + td.totalLessons + ' lessons passed. The skill you trust least is the one worth reshooting this week.';
      ctaEls.forEach(function(el){ el.textContent = 'Reshoot Lesson 1'; el.setAttribute('href', 'lesson-01.html'); });
      if(bigEl) bigEl.textContent = td.totalLessons + ' of ' + td.totalLessons + ' lessons complete';
      if(smallEl) smallEl.textContent = 'Weekly redo: go back to whichever lesson felt shakiest.';
    }

    renderWeekStrip(document.querySelector('[data-week-strip]'), state);
    document.querySelectorAll('[data-total-complete]').forEach(function(el){ el.textContent = nav.completed; });
  }

  /* ===================== Hub hydration (academy-wide) ===================== */
  function hydrateHub(){
    var state = loadState(); // runs migrateLegacy()
    var streak = getStreak(state);
    document.querySelectorAll('[data-streak]').forEach(function(el){ el.textContent = streak; });

    var academyCompleted = getAcademyCompleted(state);
    var academyTotal = getAcademyTotal();
    document.querySelectorAll('[data-academy-complete]').forEach(function(el){
      el.textContent = academyCompleted + ' of ' + academyTotal + ' lessons complete';
    });
    document.querySelectorAll('.aperture[data-progress-auto]').forEach(function(el){
      // Hub-level ring (not inside a track-card) shows academy-wide progress.
      if(el.closest('[data-track-card]')) return;
      var pct = academyTotal ? academyCompleted / academyTotal : 0;
      el.dataset.progress = pct;
      if(el.dataset.label !== undefined) el.dataset.label = academyCompleted + '/' + academyTotal;
    });

    document.querySelectorAll('[data-track-card]').forEach(function(card){
      var slug = card.getAttribute('data-track-card');
      var td = tracksData()[slug];
      if(!td) return;
      var completed = getCompletedCount(state, slug);
      var pct = td.totalLessons ? completed / td.totalLessons : 0;
      var ring = card.querySelector('.aperture');
      if(ring){
        ring.dataset.progress = pct;
        if(ring.dataset.label !== undefined) ring.dataset.label = completed + '/' + td.totalLessons;
      }
      var cta = card.querySelector('[data-track-cta]');
      var firstIncomplete = getFirstIncomplete(state, slug);
      card.classList.toggle('complete', firstIncomplete === null);
      if(cta){
        var label = firstIncomplete === null ? 'Review' : (completed === 0 ? 'Start' : 'Continue');
        var arrow = cta.querySelector('.cta-arrow');
        cta.textContent = label;
        if(arrow) cta.appendChild(arrow);
      }
    });

    refreshApertures();
  }

  function initMobileNav(){
    var openBtns = document.querySelectorAll('[data-nav-open]');
    var closeBtns = document.querySelectorAll('[data-nav-close]');
    var backdrop = document.querySelector('.nav-backdrop');
    openBtns.forEach(function(b){ b.addEventListener('click', function(){ document.body.classList.add('nav-open'); }); });
    closeBtns.forEach(function(b){ b.addEventListener('click', function(){ document.body.classList.remove('nav-open'); }); });
    if(backdrop){ backdrop.addEventListener('click', function(){ document.body.classList.remove('nav-open'); }); }
  }

  window.SF = {
    loadState: loadState,
    migrateLegacy: migrateLegacy,
    getTrackState: getTrackState,
    isLessonComplete: isLessonComplete,
    getCompletedCount: getCompletedCount,
    getFirstIncomplete: getFirstIncomplete,
    getAcademyCompleted: getAcademyCompleted,
    getAcademyTotal: getAcademyTotal,
    getStreak: getStreak,
    setCheck: setCheck,
    resetLesson: resetLesson,
    hydrateNav: hydrateNav,
    hydrateChecklist: hydrateChecklist,
    hydrateDashboard: hydrateDashboard,
    hydrateHub: hydrateHub,
    initMobileNav: initMobileNav,
    refreshApertures: refreshApertures
  };

  document.addEventListener('DOMContentLoaded', function(){
    initMobileNav();
  });
})();
