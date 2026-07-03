/* ===================== Smartphone Filmmaker: Progress Engine ===================== */
/* All state lives in localStorage. No server, no backend. */
(function(){
  'use strict';

  var STORAGE_KEY = 'sf_progress_v1';
  var TOTAL_LESSONS = 14;

  var COURSE = [
    { n:1,  title:'Grip and Stabilization',                 module:1 },
    { n:2,  title:'Framing With Intention',                 module:1 },
    { n:3,  title:'Reading Light Before You Shoot',         module:1 },
    { n:4,  title:'Exposure Lock for Moving Subjects',      module:2 },
    { n:5,  title:'Focus Pulls Without a Follow Focus',     module:2 },
    { n:6,  title:'Composing Vertical vs. Horizontal',      module:2 },
    { n:7,  title:'Capturing Clean Audio On the Fly',       module:3 },
    { n:8,  title:'Pans, Tilts and Walk-and-Talk',          module:3 },
    { n:9,  title:'Exposure Lock in Low Light',             module:4 },
    { n:10, title:'Color Temperature and White Balance',    module:4 },
    { n:11, title:'Editing In-Camera: Shot Discipline',     module:5 },
    { n:12, title:'Building a Scene From Three Shots',      module:5 },
    { n:13, title:'Sound Design With What You Have',        module:5 },
    { n:14, title:'Capstone',                                module:6 }
  ];

  var MODULES = [
    { n:1, name:'Hold &amp; Frame',       lessons:[1,2,3] },
    { n:2, name:'Exposure &amp; Focus',   lessons:[4,5,6] },
    { n:3, name:'Sound &amp; Motion',     lessons:[7,8] },
    { n:4, name:'Light &amp; Color',      lessons:[9,10] },
    { n:5, name:'Story &amp; Edit',       lessons:[11,12,13] },
    { n:6, name:'Capstone',              lessons:[14] }
  ];

  var CHECK_SVG = '<svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function todayStr(d){
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  function loadState(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return { lessons:{}, activityDates:[] };
      var parsed = JSON.parse(raw);
      if(!parsed.lessons) parsed.lessons = {};
      if(!parsed.activityDates) parsed.activityDates = [];
      return parsed;
    }catch(e){
      return { lessons:{}, activityDates:[] };
    }
  }

  function saveState(state){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getChecks(state, lessonNum, itemCount){
    var key = String(lessonNum);
    var arr = (state.lessons[key] && state.lessons[key].checks) || [];
    var out = [];
    for(var i=0;i<itemCount;i++){ out.push(!!arr[i]); }
    return out;
  }

  function isLessonComplete(state, lessonNum, itemCount){
    if(itemCount === undefined){
      var entry = state.lessons[String(lessonNum)];
      if(!entry || !entry.checks || !entry.checks.length) return false;
      itemCount = entry.checks.length;
    }
    var checks = getChecks(state, lessonNum, itemCount);
    if(itemCount === 0) return false;
    for(var i=0;i<checks.length;i++){ if(!checks[i]) return false; }
    return true;
  }

  function setCheck(lessonNum, itemIndex, checked, itemCount){
    var state = loadState();
    var key = String(lessonNum);
    if(!state.lessons[key]) state.lessons[key] = { checks: [] };
    var checks = getChecks(state, lessonNum, itemCount);
    checks[itemIndex] = checked;
    state.lessons[key].checks = checks;
    recordActivity(state);
    saveState(state);
    return state;
  }

  function resetLesson(lessonNum){
    var state = loadState();
    var key = String(lessonNum);
    state.lessons[key] = { checks: [] };
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

  function getCompletedCount(state, itemCounts){
    var count = 0;
    for(var n=1;n<=TOTAL_LESSONS;n++){
      var ic = itemCounts[n];
      if(ic && isLessonComplete(state, n, ic)) count++;
    }
    return count;
  }

  function getFirstIncomplete(state, itemCounts){
    for(var n=1;n<=TOTAL_LESSONS;n++){
      var ic = itemCounts[n];
      if(!ic || !isLessonComplete(state, n, ic)) return n;
    }
    return null; // all complete
  }

  /* ===================== Aperture ring builder ===================== */
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

  /* ===================== Page hydration ===================== */
  function hydrateNav(activeLessonNum){
    var itemCounts = window.SF_ITEM_COUNTS || {};
    var state = loadState();
    var completed = getCompletedCount(state, itemCounts);
    var firstIncomplete = getFirstIncomplete(state, itemCounts);
    var resolvedActive = activeLessonNum || firstIncomplete || 1;

    document.querySelectorAll('[data-lesson]').forEach(function(li){
      var n = parseInt(li.getAttribute('data-lesson'), 10);
      var ic = itemCounts[n];
      var complete = ic ? isLessonComplete(state, n, ic) : false;
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
      var moduleDef = MODULES.filter(function(md){ return md.n === m; })[0];
      if(!moduleDef) return;
      var lessonsInModule = moduleDef.lessons;
      var moduleComplete = lessonsInModule.every(function(n){ var ic = itemCounts[n]; return ic && isLessonComplete(state, n, ic); });
      var containsActive = lessonsInModule.indexOf(resolvedActive) !== -1;
      chip.classList.remove('complete','current','upcoming');
      var statusEl = chip.querySelector('.chip-status');
      var fracEl = chip.querySelector('.chip-frac');
      var doneInModule = lessonsInModule.filter(function(n){ var ic = itemCounts[n]; return ic && isLessonComplete(state, n, ic); }).length;
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

    var frac = completed + '/' + TOTAL_LESSONS;
    var pct = completed / TOTAL_LESSONS;
    document.querySelectorAll('[data-progress-fraction]').forEach(function(el){ el.textContent = frac; });
    document.querySelectorAll('[data-progress-bar]').forEach(function(el){ el.style.width = (pct*100) + '%'; });
    document.querySelectorAll('.aperture[data-progress-auto]').forEach(function(el){
      el.dataset.progress = pct;
      if(el.dataset.label !== undefined) el.dataset.label = frac;
    });

    var streak = getStreak(state);
    document.querySelectorAll('[data-streak]').forEach(function(el){ el.textContent = streak; });

    refreshApertures();

    return { state:state, completed:completed, firstIncomplete:firstIncomplete, streak:streak, resolvedActive:resolvedActive };
  }

  function hydrateChecklist(lessonNum, criterionText){
    var list = document.querySelector('.checklist[data-lesson-checklist="' + lessonNum + '"]');
    if(!list) return;
    var inputs = Array.prototype.slice.call(list.querySelectorAll('input[type="checkbox"]'));
    var itemCount = inputs.length;
    var state = loadState();
    var checks = getChecks(state, lessonNum, itemCount);

    function render(){
      var s = loadState();
      var c = getChecks(s, lessonNum, itemCount);
      var doneCount = c.filter(Boolean).length;
      inputs.forEach(function(input, i){ input.checked = c[i]; });
      var progressEl = document.querySelector('[data-checklist-progress="' + lessonNum + '"]');
      if(progressEl) progressEl.textContent = doneCount + ' / ' + itemCount;
      var celebration = document.querySelector('[data-celebration="' + lessonNum + '"]');
      var complete = isLessonComplete(s, lessonNum, itemCount);
      if(celebration){
        celebration.classList.toggle('show', complete);
      }
      hydrateNav(lessonNum);
    }

    inputs.forEach(function(input, i){
      input.checked = checks[i];
      input.addEventListener('change', function(){
        setCheck(lessonNum, i, input.checked, itemCount);
        render();
      });
    });

    var resetBtn = document.querySelector('[data-reshoot="' + lessonNum + '"]');
    if(resetBtn){
      resetBtn.addEventListener('click', function(){
        var ok = window.confirm('Clear this lesson’s checklist and reshoot? Your other lessons stay untouched.');
        if(!ok) return;
        resetLesson(lessonNum);
        render();
      });
    }

    render();
  }

  var DAY_LETTERS = ['S','M','T','W','T','F','S'];

  function hydrateDashboard(){
    var itemCounts = window.SF_ITEM_COUNTS || {};
    var nav = hydrateNav(null);
    var state = nav.state;

    // Continue card
    var subEl = document.querySelector('[data-continue-sub]');
    var ctaEls = document.querySelectorAll('[data-continue-cta]');
    var eyebrowEl = document.querySelector('[data-continue-eyebrow]');
    var titleEl = document.querySelector('[data-continue-title]');
    var bigEl = document.querySelector('[data-continue-big]');
    var smallEl = document.querySelector('[data-continue-small]');

    if(nav.firstIncomplete){
      var lesson = COURSE[nav.firstIncomplete - 1];
      var idStr = String(nav.firstIncomplete).padStart(2,'0');
      if(eyebrowEl) eyebrowEl.textContent = nav.completed === 0 ? 'Start Here' : 'Continue';
      if(titleEl) titleEl.textContent = 'Smartphone Filmmaker';
      if(subEl) subEl.textContent = 'Lesson ' + nav.firstIncomplete + ' of 14 · ' + lesson.title;
      ctaEls.forEach(function(el){ el.textContent = (nav.completed === 0 ? 'Start Lesson ' : 'Continue Lesson ') + nav.firstIncomplete; el.setAttribute('href', 'lesson-' + idStr + '.html'); });
      if(bigEl) bigEl.textContent = nav.completed + ' of 14 lessons complete';
      if(smallEl) smallEl.textContent = nav.completed === 0 ? 'No reps logged yet. Lesson 1 takes about ten minutes.' : 'Pick up right where the last checked box left off.';
    } else {
      if(eyebrowEl) eyebrowEl.textContent = 'All Clear';
      if(titleEl) titleEl.textContent = 'Course Complete';
      if(subEl) subEl.textContent = 'All 14 lessons passed. The skill you trust least is the one worth reshooting this week.';
      ctaEls.forEach(function(el){ el.textContent = 'Reshoot Lesson 1'; el.setAttribute('href', 'lesson-01.html'); });
      if(bigEl) bigEl.textContent = '14 of 14 lessons complete';
      if(smallEl) smallEl.textContent = 'Weekly redo: go back to whichever lesson felt shakiest.';
    }

    // Week strip (real activity dates, last 7 calendar days ending today)
    var stripEl = document.querySelector('[data-week-strip]');
    if(stripEl){
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

    document.querySelectorAll('[data-total-complete]').forEach(function(el){ el.textContent = nav.completed; });
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
    COURSE: COURSE,
    MODULES: MODULES,
    loadState: loadState,
    isLessonComplete: isLessonComplete,
    getCompletedCount: getCompletedCount,
    getFirstIncomplete: getFirstIncomplete,
    getStreak: getStreak,
    hydrateNav: hydrateNav,
    hydrateChecklist: hydrateChecklist,
    hydrateDashboard: hydrateDashboard,
    initMobileNav: initMobileNav,
    refreshApertures: refreshApertures,
    TOTAL_LESSONS: TOTAL_LESSONS
  };

  document.addEventListener('DOMContentLoaded', function(){
    initMobileNav();
  });
})();
