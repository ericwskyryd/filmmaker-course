/* ===================== Creator Reps: Progress Engine (multi-track) ===================== */
/* All state lives in localStorage. No server, no backend. */
/* Depends on assets/tracks-data.js (window.SF_TRACKS) being loaded first. */
(function(){
  'use strict';

  var STORAGE_KEY_V2 = 'sf_progress_v2';
  var LEGACY_KEY_V1 = 'sf_progress_v1';   // old single-course (Smartphone Filmmaker) key
  var LEGACY_TRACK = 'smartphone';
  var LAST_ACTIVE_PUSH_KEY = 'sf_last_active_push_at';

  // Schema v3: every lesson entry can carry an updatedAt (epoch ms), stamped by
  // setCheck/resetLesson, so a cross-device sync can merge PER LESSON on
  // "newest wins" instead of a blind union of every checked box (v2's bug: a
  // reshoot -- clearing a lesson to redo it -- got silently undone the moment
  // any stale device with the old checks synced back in). Same storage key,
  // same shape otherwise, so old (schemaVersion-less) data keeps loading with
  // no migration step: a lesson entry with no updatedAt is just treated as
  // older than any timestamped entry but on par with another untimestamped
  // one, which reproduces the old union-only behavior for untouched legacy
  // data. See mergeStates()/pickLesson() below.
  var SCHEMA_VERSION = 3;

  // Fixed track order used to suggest "what's next" once a track hits 14/14:
  // smartphone (foundation) -> pro-camera -> short-form -> weekend-youtuber ->
  // ai-creator -> scriptwriting -> content-strategist -> course-creator.
  var TRACK_PROGRESSION = ['smartphone', 'pro-camera', 'short-form', 'weekend-youtuber', 'ai-creator', 'scriptwriting', 'content-strategist', 'course-creator'];

  var CHECK_SVG = '<svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function tracksData(){ return window.SF_TRACKS || {}; }

  /* ===================== Auth interface (stub until assets/firebase.js loads) =====================
     Defined here, not in firebase.js, because progress.js is a plain synchronous
     script that always runs before firebase.js (a deferred module). Every page
     can therefore call window.SFAuth immediately without an existence check, and
     if firebase.js never loads (offline, blocked, ad blocker), these no-ops keep
     the site behaving exactly as it always has: localStorage only, no crashes. */
  window.SFAuth = (function(){
    var listeners = [];
    var currentUser = null;
    var resolved = false;
    var blocked = false;
    function notify(){
      listeners.forEach(function(cb){
        try{ cb(currentUser, { blocked: blocked }); }catch(e){ /* one bad listener shouldn't break the rest */ }
      });
    }
    return {
      // opts.blocked distinguishes "we couldn't verify" (Firebase/network
      // unreachable -- assets/firebase.js's own catch block, or the 5s
      // safety-net below) from a real "signed out" resolution. Gated content
      // pages use this to show a retry panel instead of a sign-in panel, so a
      // blocked network is never mistaken for a login problem.
      _setUser: function(u, opts){ currentUser = u; resolved = true; blocked = !!(opts && opts.blocked); notify(); },
      onChange: function(cb){ listeners.push(cb); if(resolved) cb(currentUser, { blocked: blocked }); },
      getUser: function(){ return currentUser; },
      isBlocked: function(){ return blocked; },
      isResolved: function(){ return resolved; },
      signIn: function(){ console.warn('[Creator Reps] Sign-in is unavailable right now (offline or blocked). Progress keeps saving locally.'); },
      signOut: function(){},
      isAdmin: function(){ return false; },
      pullProgress: function(){ return Promise.resolve(null); },
      pushProgress: function(){},
      getIdToken: function(){ return Promise.resolve(null); }
    };
  })();

  // Defense in depth: assets/firebase.js normally resolves the auth state (to a
  // real user, or explicitly to null/blocked) within a second or two. If that
  // script never even runs at all -- fully blocked request, ad blocker killing
  // the <script> tag outright, whatever -- nothing would ever call _setUser,
  // and anything waiting on window.SFAuth.onChange (admin.html, a gated lesson
  // page) would hang on a loading state forever. This forces a resolution
  // after 5s so every page always reaches a final, correct-looking state. If
  // nothing resolved it by then, that silence itself is the signal something
  // is blocked, not proof the visitor is signed out -- so it resolves to the
  // same "blocked" state as a caught Firebase-unreachable error, never a bare
  // "signed out".
  setTimeout(function(){
    if(!window.SFAuth.isResolved()){
      window.SFAuth._setUser(null, { blocked: true });
    }
  }, 5000);

  function todayStr(d){
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  /* ===================== State load / save / migrate ===================== */

  function blankState(){
    return { tracks: {}, activityDates: [], migratedFromV1: false, schemaVersion: SCHEMA_VERSION };
  }

  function readRawV2(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY_V2);
      if(!raw) return null;
      var parsed = JSON.parse(raw);
      if(!parsed.tracks) parsed.tracks = {};
      if(!parsed.activityDates) parsed.activityDates = [];
      // Pre-v3 data has no schemaVersion at all -- leave it unset rather than
      // stamping SCHEMA_VERSION here, so per-lesson entries with no updatedAt
      // are correctly recognized as legacy (untimestamped) by pickLesson().
      // saveState() upgrades the top-level marker transparently on next write.
      return parsed;
    }catch(e){
      return null;
    }
  }

  function shouldTouchActive(){
    try{
      var last = parseInt(localStorage.getItem(LAST_ACTIVE_PUSH_KEY) || '0', 10);
      if(Date.now() - last > 60 * 60 * 1000){
        localStorage.setItem(LAST_ACTIVE_PUSH_KEY, String(Date.now()));
        return true;
      }
    }catch(e){ /* ignore, just skip the lastActiveAt touch this time */ }
    return false;
  }

  /* Single write path for both storage backends (the "thin storage adapter"):
     every save always writes localStorage first (instant, offline-safe), then
     -- only if a user is signed in -- also schedules a debounced Firestore
     write of the same object. Callers never need to know which backend(s) are
     live; localStorage stays the write-through cache either way. */
  function saveState(state, opts){
    state.schemaVersion = SCHEMA_VERSION;
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state));
    var user = window.SFAuth.getUser();
    if(user){
      var pushOpts = { touchActive: shouldTouchActive() };
      if(opts && opts.immediate) pushOpts.immediate = true;
      window.SFAuth.pushProgress(state, pushOpts);
    }
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
    var wasChecked = !!trackState.lessons[key].checks[itemIndex];
    var checks = getChecks(trackState, lessonNum, itemCount);
    checks[itemIndex] = checked;
    trackState.lessons[key].checks = checks;
    // Stamp per-lesson updatedAt on every write so a cross-device sync can
    // merge "newest wins" instead of unioning stale checks back on top of a
    // deliberate reshoot (see mergeStates()/pickLesson()).
    trackState.lessons[key].updatedAt = Date.now();
    // Streak activity is a rep credit, not a checkbox toggle: only the
    // false -> true transition (actually checking something off) counts.
    // Unchecking a box (e.g. correcting a mis-click, or starting a reshoot)
    // must never itself extend or restart the streak.
    if(checked && !wasChecked) recordActivity(state);
    saveState(state);
    return state;
  }

  function resetLesson(slug, lessonNum){
    var state = loadState();
    var trackState = getTrackState(state, slug);
    // Replacing the whole entry (rather than clearing checks in place) also
    // drops any prior confidence/confidenceAt: "re-completing after a
    // reshoot asks again" falls out of this for free, no extra flag needed.
    trackState.lessons[String(lessonNum)] = { checks: [], updatedAt: Date.now() };
    saveState(state);
    return state;
  }

  // Confidence tap (celebration block, once a lesson's checklist is fully
  // checked): one optional, skippable rating stored on that lesson's entry.
  // Stamps updatedAt too -- a confidence tap is a real touch on the lesson,
  // same as a checkbox change, so it counts toward the redo picker's
  // "longest since you last touched it" tie-break and propagates correctly
  // through the per-lesson latest-wins sync merge (see mergeStates below).
  function setConfidence(slug, lessonNum, level){
    var state = loadState();
    var trackState = getTrackState(state, slug);
    var key = String(lessonNum);
    if(!trackState.lessons[key]) trackState.lessons[key] = { checks: [] };
    trackState.lessons[key].confidence = level;
    trackState.lessons[key].confidenceAt = Date.now();
    trackState.lessons[key].updatedAt = Date.now();
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

  /* ===================== Cloud sync coordination ===================== */
  // Runs once per sign-in (fresh popup OR a session Firebase silently restores
  // on page load): pull the cloud doc, union-merge it with whatever is in
  // localStorage right now so neither side ever loses a checked box or an
  // activity date, write the merged result back to both places, then refresh
  // whichever page is currently on screen.
  var _rehydrate = null;
  function setRehydrate(fn){ _rehydrate = fn; }

  function unionChecks(a, b){
    var len = Math.max(a.length, b.length), out = [];
    for(var i=0;i<len;i++){ out.push(!!a[i] || !!b[i]); }
    return out;
  }

  // Per-lesson merge rule (schema v3): newer updatedAt wins outright, so a
  // reshoot (clearing a lesson to redo it) on one device survives a sync from
  // a stale device that never saw the reshoot. Only when NEITHER side has a
  // timestamp do we fall back to the old union-of-checks behavior, which
  // keeps every pre-v3 (legacy) merge working exactly as it did before this
  // fix. A timestamped side always outranks an untimestamped one, whichever
  // way the checks actually go, because "we know when this changed" is
  // strictly more information than "we don't know when this changed."
  function pickLesson(aLesson, bLesson){
    if(!aLesson && !bLesson) return null;
    if(aLesson && !bLesson) return aLesson;
    if(bLesson && !aLesson) return bLesson;
    var aTime = aLesson.updatedAt, bTime = bLesson.updatedAt;
    var aStamped = typeof aTime === 'number', bStamped = typeof bTime === 'number';
    if(aStamped && bStamped) return (bTime > aTime) ? bLesson : aLesson;
    if(aStamped) return aLesson;
    if(bStamped) return bLesson;
    return { checks: unionChecks(aLesson.checks || [], bLesson.checks || []) };
  }

  // Latest-wins pick for small per-track metadata objects that carry their
  // own updatedAt (currently just redoWeekly). Same shape of rule as
  // pickLesson's timestamped branch, split out because it has no per-lesson
  // "legacy union" fallback to worry about -- this metadata didn't exist
  // before this feature, so there's no untimestamped legacy data to reproduce.
  function pickTrackMeta(aMeta, bMeta){
    if(!aMeta && !bMeta) return null;
    if(aMeta && !bMeta) return aMeta;
    if(bMeta && !aMeta) return bMeta;
    var aTime = aMeta.updatedAt, bTime = bMeta.updatedAt;
    var aStamped = typeof aTime === 'number', bStamped = typeof bTime === 'number';
    if(aStamped && bStamped) return (bTime > aTime) ? bMeta : aMeta;
    if(aStamped) return aMeta;
    if(bStamped) return bMeta;
    return aMeta;
  }

  function mergeStates(a, b){
    a = a || blankState();
    b = b || blankState();
    var slugs = {};
    Object.keys(a.tracks || {}).forEach(function(s){ slugs[s] = true; });
    Object.keys(b.tracks || {}).forEach(function(s){ slugs[s] = true; });
    var tracks = {};
    Object.keys(slugs).forEach(function(slug){
      var aTrack = a.tracks[slug] || {};
      var bTrack = b.tracks[slug] || {};
      var aLessons = aTrack.lessons || {};
      var bLessons = bTrack.lessons || {};
      var keys = {};
      Object.keys(aLessons).forEach(function(k){ keys[k] = true; });
      Object.keys(bLessons).forEach(function(k){ keys[k] = true; });
      var lessons = {};
      Object.keys(keys).forEach(function(k){
        var picked = pickLesson(aLessons[k], bLessons[k]);
        if(!picked) return;
        // Copy every field off the picked (whole, already-newest) entry, not
        // just checks/updatedAt: this is what lets the per-lesson entry
        // shape extend safely (confidence, confidenceAt, and any future
        // field) without a merge-specific allowlist that silently drops
        // whatever it doesn't know about yet.
        var entry = Object.assign({}, picked);
        entry.checks = (picked.checks || []).slice();
        lessons[k] = entry;
      });
      var trackOut = { lessons: lessons };
      var redoWeekly = pickTrackMeta(aTrack.redoWeekly, bTrack.redoWeekly);
      if(redoWeekly) trackOut.redoWeekly = Object.assign({}, redoWeekly);
      tracks[slug] = trackOut;
    });
    // Activity dates and streak data are append-only facts (a day either had
    // a checked box or it didn't), so these stay a plain union regardless of
    // schema version -- there's no "reshoot" concept for a calendar date.
    var dateSet = {};
    (a.activityDates || []).forEach(function(d){ dateSet[d] = true; });
    (b.activityDates || []).forEach(function(d){ dateSet[d] = true; });
    return {
      tracks: tracks,
      activityDates: Object.keys(dateSet).sort(),
      migratedFromV1: !!(a.migratedFromV1 || b.migratedFromV1),
      schemaVersion: SCHEMA_VERSION
    };
  }

  function statesEqual(a, b){
    try{ return JSON.stringify(a) === JSON.stringify(b); }catch(e){ return false; }
  }

  function onAuthChange(user){
    if(!user) return; // signed out: keep whatever is already in localStorage, unchanged
    var local = loadState();
    window.SFAuth.pullProgress().then(function(cloud){
      var merged = mergeStates(local, cloud);
      // Always re-save even if identical: cheap locally, and it's the one code
      // path that also pushes to Firestore when a user is signed in, so a
      // brand-new cloud doc gets created on first sign-in even if local === merged.
      if(!statesEqual(merged, local) || !cloud){
        saveState(merged, { immediate: true });
      }
      if(typeof _rehydrate === 'function') _rehydrate();
    }).catch(function(){ /* local state is already the safe fallback, nothing to do */ });
  }

  /* ===================== Auth widget UI wiring (header sign-in / account menu) ===================== */
  function initAuthUI(){
    document.querySelectorAll('[data-auth-signin]').forEach(function(btn){
      btn.addEventListener('click', function(){ window.SFAuth.signIn(); });
    });
    document.querySelectorAll('[data-auth-signout]').forEach(function(btn){
      btn.addEventListener('click', function(){ window.SFAuth.signOut(); });
    });
    document.querySelectorAll('[data-auth-menu-toggle]').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        var widget = btn.closest('[data-auth-widget]');
        if(widget) widget.classList.toggle('menu-open');
      });
    });
    document.addEventListener('click', function(){
      document.querySelectorAll('[data-auth-widget].menu-open').forEach(function(w){ w.classList.remove('menu-open'); });
    });

    window.SFAuth.onChange(function(user){
      // Also tracked on <body> (not just the header widget) so any page-level
      // layout, like the hub's signed-out pitch vs. signed-in greeting, can
      // key off the same signed-in/out signal with plain CSS.
      document.body.classList.toggle('is-signed-in', !!user);
      document.querySelectorAll('[data-auth-widget]').forEach(function(widget){
        widget.classList.toggle('is-signed-in', !!user);
        if(!user) return;
        var firstName = ((user.displayName || user.email || 'Account').trim().split(/\s+/)[0]) || 'Account';
        var nameEl = widget.querySelector('[data-auth-firstname]');
        var emailEl = widget.querySelector('[data-auth-email]');
        var avatarEl = widget.querySelector('[data-auth-avatar]');
        if(nameEl) nameEl.textContent = firstName;
        if(emailEl) emailEl.textContent = user.email || '';
        if(avatarEl){
          if(user.photoURL){
            avatarEl.style.backgroundImage = 'url(' + user.photoURL + ')';
            avatarEl.textContent = '';
          } else {
            avatarEl.style.backgroundImage = 'none';
            avatarEl.textContent = firstName.charAt(0).toUpperCase();
          }
        }
      });

      // Hub + dashboard greeting ("Ready for today's rep, {Name}?"): a plain
      // span the markup ships with empty, so a signed-out or nameless visitor
      // sees the fallback copy baked right into the HTML ("Ready for today's
      // rep?") with zero JS needed. Only a real displayName gets a name here;
      // an email-only account intentionally falls back rather than showing
      // "Ready for today's rep, someone@example.com?".
      document.querySelectorAll('[data-greeting-name]').forEach(function(el){
        var first = (user && user.displayName) ? user.displayName.trim().split(/\s+/)[0] : '';
        el.textContent = first ? (', ' + first) : '';
      });
    });
  }

  /* ===================== Content gate (lesson pages + track dashboards) =====================
     Server-rendered as body.gated + data-gate-state="checking" (see
     build/templates.mjs); this is the only place that ever changes that
     state. Three end states, one code path:
       - signed in  -> remove .gated entirely; the page reverts to its normal
         layout with nothing left to undo, and reveals in place (no redirect).
       - signed out -> data-gate-state="signedout", shows the sign-in panel.
       - blocked    -> data-gate-state="blocked", shows the retry panel.
     A page without body.gated (the hub, admin.html) has no [data-content-gate]
     element and this is a no-op. */
  function initContentGate(){
    if(!document.body.classList.contains('gated')) return;
    var retryBtn = document.querySelector('[data-gate-retry]');
    if(retryBtn){
      retryBtn.addEventListener('click', function(){ window.location.reload(); });
    }
    window.SFAuth.onChange(function(user, meta){
      if(user){
        document.body.classList.remove('gated');
        return;
      }
      document.body.setAttribute('data-gate-state', (meta && meta.blocked) ? 'blocked' : 'signedout');
    });
  }

  // Registered once, immediately: reacts to every sign-in (fresh or restored)
  // for the lifetime of the page, independent of which hydrate* fn is active.
  window.SFAuth.onChange(onAuthChange);

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

  // Once a track hits 14/14 (any track, fully complete), the dashboard's
  // continue card suggests where to go next instead of dead-ending on "nice
  // job." Always walks the same fixed progression list from the top and
  // returns the first track that still has an incomplete lesson -- a track
  // that's already fully complete (including whichever one the learner just
  // finished) is skipped automatically, no special-casing needed.
  function getSuggestedNextTrack(state){
    for(var i=0;i<TRACK_PROGRESSION.length;i++){
      var slug = TRACK_PROGRESSION[i];
      if(!tracksData()[slug]) continue;
      if(getFirstIncomplete(state, slug) !== null) return slug;
    }
    return null; // every track in the progression is fully complete
  }

  /* ===================== Weekly redo (confidence-driven reshoot target) =====================
     "Once a week, reshoot the lesson you passed with the least confidence."
     Picking is dynamic (lowest confidence, tie-break oldest updatedAt) but the
     actual assignment for the CURRENT ISO week is picked once and pinned to
     trackState.redoWeekly so it doesn't drift mid-week as other lessons get
     touched, and so a completed/dismissed redo can show a stable "done" state
     for the rest of the week instead of the picker just handing back a new
     target the moment the old one stops looking shakiest. */

  function isoWeekKey(d){
    d = d || new Date();
    // ISO week of the LOCAL calendar date: build a date from Y/M/D and do the
    // ISO week math against it as if it were UTC midnight, which sidesteps
    // timezone-offset edge cases while still keying off the visitor's local day.
    var date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var dayNum = date.getUTCDay() || 7; // Monday=1 ... Sunday=7
    date.setUTCDate(date.getUTCDate() + 4 - dayNum); // shift to this week's Thursday
    var yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return date.getUTCFullYear() + '-W' + String(weekNo).padStart(2, '0');
  }

  // Unrated counts as a 2 ("Solid") baseline -- worse than a real "Nailed it"
  // (3), better than an explicit "Shaky" (1), so an unrated lesson can still
  // lose the pick to a lesson someone actually flagged as shaky, but isn't
  // penalized just for never having been asked.
  function getEffectiveConfidence(lessonEntry){
    return (lessonEntry && typeof lessonEntry.confidence === 'number') ? lessonEntry.confidence : 2;
  }

  function getRedoCandidates(state, slug){
    var td = tracksData()[slug];
    if(!td) return [];
    var trackState = getTrackState(state, slug);
    var out = [];
    for(var n=1;n<=td.totalLessons;n++){
      var ic = td.itemCounts[n];
      if(!ic || !isLessonComplete(trackState, n, ic)) continue;
      var entry = trackState.lessons[String(n)] || {};
      out.push({
        n: n,
        confidence: getEffectiveConfidence(entry),
        // Untimestamped (legacy) completions read as the oldest possible
        // touch, same "we don't know when this changed, so it's not newer
        // than anything that has a timestamp" logic pickLesson() already uses.
        updatedAt: (typeof entry.updatedAt === 'number') ? entry.updatedAt : -1
      });
    }
    return out;
  }

  // Lowest confidence first, tie-break oldest updatedAt (longest since touched).
  function pickRedoTarget(state, slug){
    var candidates = getRedoCandidates(state, slug);
    if(!candidates.length) return null;
    candidates.sort(function(a, b){
      if(a.confidence !== b.confidence) return a.confidence - b.confidence;
      return a.updatedAt - b.updatedAt;
    });
    return candidates[0].n;
  }

  // Assigns this week's redo target if one isn't already pinned for the
  // current ISO week. Returns the (mutated, not-yet-saved) redoWeekly record
  // when a fresh assignment was made, or null when nothing changed -- callers
  // use that to decide whether a saveState() write is actually needed.
  function ensureWeeklyRedoAssigned(state, slug){
    if(getCompletedCount(state, slug) === 0) return null;
    var trackState = getTrackState(state, slug);
    var week = isoWeekKey();
    var rw = trackState.redoWeekly;
    if(rw && rw.week === week && rw.lessonN) return null;
    var lessonN = pickRedoTarget(state, slug);
    if(!lessonN) return null;
    var now = Date.now();
    trackState.redoWeekly = { week: week, lessonN: lessonN, dismissed: false, assignedAt: now, updatedAt: now };
    return trackState.redoWeekly;
  }

  // Returns null when the track has no completed lesson yet (redo card/hub
  // line both stay hidden in that case). Otherwise: { lessonN, reason, done }.
  // reason is derived fresh from the target's own confidence rather than
  // stored, so it never goes stale: a lesson only reads "shaky" if it's
  // actually rated 1, everything else (unrated or tie-broken by recency)
  // reads as the oldest-touch reason, which matches how it was actually picked.
  function getWeeklyRedo(state, slug){
    if(!tracksData()[slug]) return null;
    if(getCompletedCount(state, slug) === 0) return null;
    var trackState = getTrackState(state, slug);
    var changed = ensureWeeklyRedoAssigned(state, slug);
    if(changed) saveState(state);
    var rw = trackState.redoWeekly;
    if(!rw) return null;
    var entry = trackState.lessons[String(rw.lessonN)] || {};
    var confidence = getEffectiveConfidence(entry);
    var reason = (confidence === 1) ? 'shaky' : 'oldest';
    var doneByCompletion = !!(typeof entry.updatedAt === 'number' && entry.updatedAt > rw.assignedAt);
    return { lessonN: rw.lessonN, reason: reason, done: !!rw.dismissed || doneByCompletion, assignedAt: rw.assignedAt };
  }

  // Quiet dismiss ("Skip this week"): pins the done state for the rest of the
  // ISO week without requiring a reshoot. Also assigns a target first if
  // somehow none exists yet (dismiss clicked before the card ever computed
  // one), so dismissing never leaves redoWeekly in a half-set state.
  function dismissWeeklyRedo(slug){
    var state = loadState();
    var trackState = getTrackState(state, slug);
    var week = isoWeekKey();
    var rw = trackState.redoWeekly;
    var now = Date.now();
    if(!rw || rw.week !== week || !rw.lessonN){
      var lessonN = pickRedoTarget(state, slug);
      rw = { week: week, lessonN: lessonN, assignedAt: now };
    }
    rw.dismissed = true;
    rw.updatedAt = now;
    trackState.redoWeekly = rw;
    saveState(state);
    return state;
  }

  // Hub-wide: at most one line, pointing at whichever track's pending
  // (not-yet-done) redo has been waiting longest -- i.e. the oldest assignedAt.
  function getHubRedoPending(state){
    var best = null;
    Object.keys(tracksData()).forEach(function(slug){
      var redo = getWeeklyRedo(state, slug);
      if(!redo || redo.done) return;
      if(!best || redo.assignedAt < best.assignedAt){
        best = { slug: slug, lessonN: redo.lessonN, assignedAt: redo.assignedAt };
      }
    });
    return best;
  }

  /* ===================== Aperture ring builder (signature element) =====================
     Geometry lives in one place, assets/aperture.js (window.SFAperture), loaded
     just before this file on every page. That single function draws real
     overlapping iris blades (fixed hinge edge, curved leading edge, all blades
     sweeping in sync) rather than a plain segmented donut fill, and it's the
     same function used for the static brand/gate/coach mark at build time. */
  function buildAperture(el){
    if (window.SFAperture) window.SFAperture.buildAperture(el);
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
      // Confidence tap only matters while the celebration is showing; its
      // state (asking vs. already rated this completion) is read straight
      // off the lesson entry every render, so a reshoot (which replaces the
      // whole entry, dropping confidence) naturally flips it back to asking.
      var confidenceWrap = document.querySelector('[data-celebration-confidence="' + lessonNum + '"]');
      if(confidenceWrap){
        var lessonEntry = trackState.lessons[String(lessonNum)];
        var rated = !!(lessonEntry && typeof lessonEntry.confidence === 'number');
        confidenceWrap.setAttribute('data-confidence-state', rated ? 'rated' : 'asking');
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

    // Skippable by design: no listener ever forces a choice, nothing nags if
    // it's ignored. A tap just stores the rating and swaps to "Noted."
    document.querySelectorAll('[data-celebration-confidence="' + lessonNum + '"] [data-confidence-btn]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var level = parseInt(btn.getAttribute('data-confidence-btn'), 10);
        setConfidence(slug, lessonNum, level);
        render();
      });
    });

    setRehydrate(render);
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
    setRehydrate(function(){ hydrateDashboard(slug); });
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
      // 14/14 (any track fully complete): celebrate the criterion and point
      // forward to the natural next track instead of just "nice job" -- a
      // completed track is a milestone, not a dead end.
      var suggestedSlug = getSuggestedNextTrack(state);
      var suggestedTrack = suggestedSlug ? tracksData()[suggestedSlug] : null;
      if(eyebrowEl) eyebrowEl.textContent = 'Track Complete';
      if(titleEl) titleEl.textContent = 'Every lesson passed';
      if(subEl) subEl.textContent = suggestedTrack
        ? 'All ' + td.totalLessons + ' lessons passed. Natural next stop: ' + suggestedTrack.name + '.'
        : 'All ' + td.totalLessons + ' lessons passed. The skill you trust least is the one worth reshooting this week.';
      ctaEls.forEach(function(el){
        if(suggestedTrack){
          el.textContent = 'Start ' + suggestedTrack.name;
          el.setAttribute('href', '../' + suggestedSlug + '/index.html');
        } else {
          // Every track in the progression is complete (the 97/97 case): no
          // more "next track" to suggest, so point at the real weekly redo
          // target for THIS track instead of a hardcoded "Lesson 1" -- every
          // track has at least one completed lesson here, so this is never null.
          var fallbackRedoN = pickRedoTarget(state, slug);
          var fallbackNN = String(fallbackRedoN).padStart(2, '0');
          el.textContent = 'Reshoot Lesson ' + fallbackRedoN;
          el.setAttribute('href', 'lesson-' + fallbackNN + '.html');
        }
      });
      if(bigEl) bigEl.textContent = td.totalLessons + ' of ' + td.totalLessons + ' lessons complete';
      if(smallEl) smallEl.textContent = suggestedTrack
        ? 'Every lesson passed. Reshoot whichever felt shakiest, or carry the streak into ' + suggestedTrack.name + '.'
        : 'Weekly redo: go back to whichever lesson felt shakiest.';
    }

    var continueCard = document.querySelector('.continue-card');
    if(continueCard) continueCard.classList.toggle('complete', !nav.firstIncomplete);

    renderWeekStrip(document.querySelector('[data-week-strip]'), state);
    document.querySelectorAll('[data-total-complete]').forEach(function(el){ el.textContent = nav.completed; });

    renderRedoCard(slug, td, state);
  }

  // This Week's Redo card: only appears once the track has at least one
  // completed lesson (nothing to reshoot before that). Re-run on every
  // hydrate (page load, post-sync rehydrate, and after every checklist
  // change via the shared _rehydrate hook) so completing or dismissing the
  // redo flips the card to its done state immediately, same tab, no reload.
  function renderRedoCard(slug, td, state){
    var card = document.querySelector('[data-redo-card]');
    if(!card) return;
    var redo = getWeeklyRedo(state, slug);
    if(!redo){
      card.hidden = true;
      return;
    }
    card.hidden = false;
    var body = card.querySelector('[data-redo-card-body]');
    var doneBody = card.querySelector('[data-redo-done-body]');
    if(redo.done){
      if(body) body.hidden = true;
      if(doneBody) doneBody.hidden = false;
      return;
    }
    if(body) body.hidden = false;
    if(doneBody) doneBody.hidden = true;

    var lesson = td.lessons.filter(function(l){ return l.n === redo.lessonN; })[0];
    var nn = String(redo.lessonN).padStart(2, '0');
    var titleEl = card.querySelector('[data-redo-title]');
    var reasonEl = card.querySelector('[data-redo-reason]');
    var ctaEl = card.querySelector('[data-redo-cta]');
    var ctaLabelEl = card.querySelector('[data-redo-cta-label]');
    if(titleEl) titleEl.textContent = lesson ? lesson.title : ('Lesson ' + redo.lessonN);
    if(reasonEl) reasonEl.textContent = (redo.reason === 'shaky') ? 'You rated this one Shaky.' : 'Longest since you last touched it.';
    if(ctaEl) ctaEl.setAttribute('href', 'lesson-' + nn + '.html');
    if(ctaLabelEl) ctaLabelEl.textContent = 'Reshoot Lesson ' + redo.lessonN;

    var skipBtn = card.querySelector('[data-redo-skip]');
    if(skipBtn && !skipBtn.dataset.bound){
      skipBtn.dataset.bound = '1';
      skipBtn.addEventListener('click', function(){
        dismissWeeklyRedo(slug);
        renderRedoCard(slug, td, loadState());
      });
    }
  }

  /* ===================== Hub hydration (academy-wide) ===================== */
  function hydrateHub(){
    setRehydrate(hydrateHub);
    var state = loadState(); // runs migrateLegacy()
    var streak = getStreak(state);
    document.querySelectorAll('[data-streak]').forEach(function(el){ el.textContent = streak; });

    var academyCompleted = getAcademyCompleted(state);
    var academyTotal = getAcademyTotal();
    document.querySelectorAll('[data-academy-complete]').forEach(function(el){
      el.textContent = academyCompleted + ' of ' + academyTotal + ' lessons complete';
    });

    // 97/97: every track, every lesson. The hub headline swaps to a one-line
    // celebration instead of quietly showing the same "0 tracks left to
    // start" framing forever. Only fires once academyTotal is real (guards
    // the pathological 0/0 case) and touches nothing when there's still a
    // lesson left anywhere.
    var academyDone = academyTotal > 0 && academyCompleted === academyTotal;
    var statRow = document.querySelector('[data-hub-stat-row]');
    if(statRow) statRow.classList.toggle('is-complete', academyDone);
    var hubTitleEl = document.querySelector('[data-hub-greeting-title]');
    var hubSmallEl = document.querySelector('[data-hub-greeting-small]');
    if(academyDone){
      if(hubTitleEl) hubTitleEl.textContent = academyTotal + ' for ' + academyTotal + '. Every lesson, every track, complete.';
      if(hubSmallEl) hubSmallEl.textContent = 'The reps do not stop. Reshoot whatever skill you trust least, or help someone else start theirs.';
    }

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
        var label = firstIncomplete === null ? 'Reshoot' : (completed === 0 ? 'Start' : 'Continue');
        var arrow = cta.querySelector('.cta-arrow');
        cta.textContent = label;
        if(arrow) cta.appendChild(arrow);
      }
      // Deep-link once real progress exists: jump straight to the next
      // incomplete lesson instead of dropping back at the dashboard overview
      // every time. A brand-new track (nothing started yet) still lands on
      // the dashboard first, same as a fully complete track (reshoot is a
      // dashboard-level decision, not a specific lesson).
      var deepHref = (completed > 0 && firstIncomplete !== null)
        ? slug + '/lesson-' + String(firstIncomplete).padStart(2,'0') + '.html'
        : slug + '/index.html';
      card.setAttribute('href', deepHref);
    });

    // At most one line, academy-wide: whichever track's weekly redo has been
    // waiting longest. Every track with a completed lesson gets its redo
    // target assigned here (getHubRedoPending walks all of them), so this is
    // also what makes a brand-new week's assignment sync-safe across devices
    // even before the learner opens that specific track's dashboard.
    var redoLine = document.querySelector('[data-hub-redo-line]');
    if(redoLine){
      var pending = getHubRedoPending(state);
      if(pending){
        var pendingTrack = tracksData()[pending.slug];
        redoLine.hidden = false;
        redoLine.setAttribute('href', pending.slug + '/index.html');
        // Copy is fixed ('waiting in your queue'); the href still targets the track.
      } else {
        redoLine.hidden = true;
      }
    }

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
    getSuggestedNextTrack: getSuggestedNextTrack,
    getStreak: getStreak,
    setCheck: setCheck,
    resetLesson: resetLesson,
    setConfidence: setConfidence,
    isoWeekKey: isoWeekKey,
    pickRedoTarget: pickRedoTarget,
    getWeeklyRedo: getWeeklyRedo,
    dismissWeeklyRedo: dismissWeeklyRedo,
    getHubRedoPending: getHubRedoPending,
    hydrateNav: hydrateNav,
    hydrateChecklist: hydrateChecklist,
    hydrateDashboard: hydrateDashboard,
    hydrateHub: hydrateHub,
    initMobileNav: initMobileNav,
    refreshApertures: refreshApertures,
    mergeStates: mergeStates,
    pickLesson: pickLesson,
    initAuthUI: initAuthUI,
    initContentGate: initContentGate
  };

  document.addEventListener('DOMContentLoaded', function(){
    initMobileNav();
    initAuthUI();
    initContentGate();
  });
})();

  // ---- Video poster facade: tap swaps the commissioned poster for the real embed ----
  (function(){
    function activateFacade(el){
      var id = el.getAttribute('data-video-id');
      if(!id) return;
      var params = el.getAttribute('data-video-params') || '';
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0&autoplay=1' + params;
      iframe.title = el.getAttribute('aria-label') || 'Video';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      el.classList.remove('video-facade');
      el.style.backgroundImage = '';
      el.innerHTML = '';
      el.appendChild(iframe);
    }
    document.addEventListener('click', function(e){
      var el = e.target && e.target.closest ? e.target.closest('.video-facade') : null;
      if(el) activateFacade(el);
    });
    document.addEventListener('keydown', function(e){
      if((e.key === 'Enter' || e.key === ' ') && e.target && e.target.classList && e.target.classList.contains('video-facade')){
        e.preventDefault(); activateFacade(e.target);
      }
    });
  })();
