// ===================== Creator Reps: interactive lesson demos =====================
// Reusable component library (5 interaction patterns) that hydrates every
// `[data-demo-pattern]` element found on a lesson page. Content lives entirely
// in the embedded JSON config (see assets/demos-data.js / build/demos-data.mjs) --
// this file only knows how to build DOM and wire interactivity from data.
//
// Patterns:
//   reveal  : timed word-by-word / staggered text reveal, stopwatch, markers
//   compare : A/B, three-way, dual (side-by-side simultaneous), or slider toggles
//   zones   : timed multi-zone progress bar synced to text beats / stage tracker
//   panels  : side-by-side structured panels: struck-through cuts, callouts,
//               beat-sync highlighting, sort buckets, accordion trace
//   mockui  : bespoke mock-UI animations (checklist timer, export timeline,
//               retention curve)
//
// Respects prefers-reduced-motion: every timed/staggered reveal collapses to an
// instant end-state on trigger instead of animating word-by-word or tweening.

(function () {
  'use strict';

  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function on(node, evt, fn) { node.addEventListener(evt, fn); }

  function fmtSec(ms) { return (ms / 1000).toFixed(1); }

  // Sequentially reveal N items with a per-item delay. `revealFn(item, i)` runs
  // once per item. Under reduced motion, every item reveals synchronously and
  // `onDone` fires immediately.
  function staggerReveal(items, stepMs, revealFn, onDone) {
    if (REDUCED) {
      items.forEach(function (it, i) { revealFn(it, i); });
      if (onDone) onDone();
      return { cancel: function () {} };
    }
    var timers = [];
    items.forEach(function (it, i) {
      timers.push(setTimeout(function () { revealFn(it, i); }, i * stepMs));
    });
    if (onDone) timers.push(setTimeout(onDone, items.length * stepMs + 60));
    return { cancel: function () { timers.forEach(clearTimeout); } };
  }

  // Word-by-word reveal of `text` over `durationMs`, optionally flagging a
  // stumble at `stumbleWordIndex`. Calls `onWord(span, i, isStumble)` as each
  // word reveals and `onDone(elapsedMs)` at the end. A live `onTick(elapsedMs)`
  // fires roughly every 100ms while running (drives a stopwatch readout).
  function wordReveal(container, text, durationMs, stumbleWordIndex, opts) {
    opts = opts || {};
    container.innerHTML = '';
    var words = text.split(/\s+/);
    var spans = words.map(function (w) {
      var s = el('span', 'demo-word', esc(w) + ' ');
      container.appendChild(s);
      return s;
    });
    if (REDUCED) {
      spans.forEach(function (s, i) {
        s.classList.add('is-shown');
        if (i === stumbleWordIndex) s.classList.add('is-stumble');
      });
      if (opts.onTick) opts.onTick(durationMs);
      if (opts.onDone) opts.onDone(durationMs);
      return { cancel: function () {} };
    }
    var perWord = durationMs / words.length;
    var timers = [];
    spans.forEach(function (s, i) {
      timers.push(setTimeout(function () {
        s.classList.add('is-shown');
        if (i === stumbleWordIndex) {
          s.classList.add('is-stumble');
          if (opts.onStumble) opts.onStumble();
        }
      }, i * perWord));
    });
    var start = Date.now();
    var tickTimer = null;
    if (opts.onTick) {
      tickTimer = setInterval(function () {
        var elapsed = Date.now() - start;
        opts.onTick(Math.min(elapsed, durationMs));
      }, 100);
    }
    timers.push(setTimeout(function () {
      if (tickTimer) clearInterval(tickTimer);
      if (opts.onTick) opts.onTick(durationMs);
      if (opts.onDone) opts.onDone(durationMs);
    }, words.length * perWord + 80));
    return { cancel: function () { timers.forEach(clearTimeout); if (tickTimer) clearInterval(tickTimer); } };
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function btn(label, cls) {
    var b = el('button', 'demo-btn' + (cls ? ' ' + cls : ''), esc(label));
    b.type = 'button';
    return b;
  }

  function stopwatchRow(unitLabel) {
    var row = el('div', 'demo-stopwatch-row');
    var num = el('span', 'demo-stopwatch', '0.0');
    var unit = el('span', 'demo-stopwatch-unit', unitLabel || 'seconds');
    row.appendChild(num);
    row.appendChild(unit);
    return { row: row, num: num };
  }

  function markerEl(tone, text) {
    return el('div', 'demo-marker ' + tone, esc(text));
  }

  // ===================================================================
  // PATTERN 1: reveal
  // ===================================================================

  function initReveal(root, cfg) {
    var stage = root.querySelector('[data-demo-stage]');
    var toolbar = root.querySelector('[data-demo-toolbar]');
    if (cfg.kind === 'word') initRevealWord(stage, toolbar, cfg);
    else if (cfg.kind === 'stagger') initRevealStagger(stage, toolbar, cfg);
  }

  function initRevealWord(stage, toolbar, cfg) {
    var wrap = el('div', 'demo-columns');
    stage.appendChild(wrap);

    cfg.tracks.forEach(function (t) {
      var panel = el('div', 'demo-panel');
      var label = el('p', 'demo-panel-label', esc(t.panelLabel || t.label));
      var body = el('div', 'demo-body-text is-quiet');
      var sw = t.stopwatch !== false ? stopwatchRow('sec') : null;
      var markerSlot = el('div');
      var trailingSlot = el('div');
      panel.appendChild(label);
      panel.appendChild(body);
      if (sw) panel.appendChild(sw.row);
      panel.appendChild(markerSlot);
      panel.appendChild(trailingSlot);
      wrap.appendChild(panel);

      var stage2Started = false;

      function runReveal() {
        body.classList.remove('is-quiet');
        markerSlot.innerHTML = '';
        trailingSlot.innerHTML = '';
        wordReveal(body, t.text, t.durationMs, t.stumbleWordIndex, {
          onTick: function (elapsed) {
            if (sw) {
              sw.num.textContent = fmtSec(elapsed);
              sw.num.classList.remove('is-over', 'is-clean');
            }
          },
          onDone: function () {
            if (sw) {
              sw.num.classList.add(t.endTone === 'good' ? 'is-clean' : 'is-over');
            }
            if (t.endLabel) markerSlot.appendChild(markerEl(t.endTone === 'good' ? 'good' : 'bad', t.endLabel));
            if (t.trailing) runTrailing(trailingSlot, t.trailing);
          },
        });
      }

      var mainBtn = btn(t.buttonLabel || ('Play ' + t.label));
      toolbar.appendChild(mainBtn);
      on(mainBtn, 'click', function () {
        if (t.instantText && !stage2Started) {
          body.classList.remove('is-quiet');
          body.textContent = t.instantText;
          stage2Started = true;
          mainBtn.textContent = t.secondButtonLabel || 'Read Aloud';
          return;
        }
        mainBtn.classList.add('is-active');
        runReveal();
      });
    });
  }

  function runTrailing(slot, trailing) {
    if (trailing.scorecardRows) {
      var table = el('table', 'demo-scorecard');
      var rows = trailing.scorecardRows.map(function (r) {
        var tr = el('tr');
        tr.innerHTML = '<td>' + esc(r.label) + '</td><td><span class="demo-badge ' + (r.badge === 'PASS' ? 'pass' : 'fail') + '">' + r.badge + '</span><span class="demo-row-reason">' + esc(r.reason) + '</span></td>';
        table.appendChild(tr);
        return tr;
      });
      slot.appendChild(table);
      staggerReveal(rows, 260, function (tr) { tr.classList.add('is-shown'); }, function () {
        if (trailing.verdict) {
          var v = el('p', 'demo-verdict', esc(trailing.verdict));
          slot.appendChild(v);
          requestAnimationFrame(function () { v.classList.add('is-shown'); });
        }
      });
    }
  }

  function initRevealStagger(stage, toolbar, cfg) {
    if (cfg.variant === 'click-cards') return revealClickCards(stage, toolbar, cfg);
    if (cfg.variant === 'sort-columns') return revealSortColumns(stage, toolbar, cfg);
    if (cfg.variant === 'review-rows') return revealReviewRows(stage, toolbar, cfg);
    if (cfg.variant === 'sequence-player') return revealSequencePlayer(stage, toolbar, cfg);
  }

  function revealClickCards(stage, toolbar, cfg) {
    var wrap = el('div', 'demo-columns');
    stage.appendChild(wrap);
    cfg.cards.forEach(function (c) {
      var panel = el('div', 'demo-panel');
      panel.appendChild(el('p', 'demo-panel-label', esc(c.label)));
      panel.appendChild(el('p', 'demo-body-text', '&ldquo;' + esc(c.statement) + '&rdquo;'));
      var respList = el('div');
      panel.appendChild(respList);
      var counterEl = el('p', 'demo-counter', '');
      panel.appendChild(counterEl);
      var cardBtn = btn('Test on a Stranger');
      panel.appendChild(el('div', 'demo-toolbar', '').appendChild ? (function () { var tb = el('div', 'demo-toolbar'); tb.appendChild(cardBtn); panel.appendChild(tb); return tb; })() : null);
      wrap.appendChild(panel);

      var idx = 0;
      on(cardBtn, 'click', function () {
        if (idx >= c.responses.length) return;
        var r = el('p', 'demo-caption', '&ldquo;' + esc(c.responses[idx]) + '&rdquo;');
        respList.appendChild(r);
        idx++;
        if (idx >= c.responses.length) {
          cardBtn.disabled = true;
          counterEl.textContent = c.counterText;
        }
      });
    });
  }

  function revealSortColumns(stage, toolbar, cfg) {
    var wrap = el('div', 'demo-columns');
    stage.appendChild(wrap);
    var allRows = [];
    var colCounters = [];
    cfg.columns.forEach(function (col) {
      var panel = el('div', 'demo-panel');
      panel.appendChild(el('p', 'demo-panel-label', esc(col.label)));
      var table = el('div', 'demo-sort-table');
      var rows = col.rows.map(function (r) {
        var row = el('div', 'demo-sort-row');
        row.innerHTML = '<span class="item-text">' + esc(r.text) + '</span><span class="demo-badge ' + r.tally + '">' + r.tally + '</span>';
        table.appendChild(row);
        allRows.push(row);
        return row;
      });
      panel.appendChild(table);
      var counter = el('p', 'demo-counter', '');
      panel.appendChild(counter);
      colCounters.push({ el: counter, text: col.counterText });
      wrap.appendChild(panel);
    });
    var runBtn = btn(cfg.buttonLabel || 'Run the Sort');
    toolbar.appendChild(runBtn);
    on(runBtn, 'click', function () {
      runBtn.disabled = true;
      staggerReveal(allRows, 160, function (row) { row.classList.add('is-shown'); }, function () {
        colCounters.forEach(function (c) { c.el.textContent = c.text; });
      });
    });
  }

  function revealReviewRows(stage, toolbar, cfg) {
    var table = el('table', 'demo-review-table');
    stage.appendChild(table);
    var rowsEls = cfg.rows.map(function (r, i) {
      var tr = el('tr' + '', r.worst ? 'is-worst' : '');
      var cells = r.cells.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('');
      tr.innerHTML = cells;
      table.appendChild(tr);
      return tr;
    });
    var callout = el('div', 'demo-callout-box', cfg.calloutText ? esc(cfg.calloutText) : '');
    var footer = el('p', 'demo-caption', '');
    stage.appendChild(callout);
    stage.appendChild(footer);
    var runBtn = btn(cfg.buttonLabel || 'Narrate the Review');
    toolbar.appendChild(runBtn);
    on(runBtn, 'click', function () {
      runBtn.disabled = true;
      staggerReveal(rowsEls, 320, function (tr) { tr.classList.add('is-shown'); }, function () {
        if (cfg.calloutText) callout.classList.add('is-shown');
        if (cfg.footerText) footer.textContent = cfg.footerText;
      });
    });
  }

  function revealSequencePlayer(stage, toolbar, cfg) {
    var panelsWrap = el('div', 'demo-columns');
    stage.appendChild(panelsWrap);
    var slots = cfg.slotLabels.map(function (label, i) {
      var p = el('div', 'demo-panel');
      p.appendChild(el('p', 'demo-panel-label', 'Shot ' + (i + 1)));
      var body = el('div', 'demo-body-text is-quiet', '&middot;&middot;&middot;');
      p.appendChild(body);
      var cap = el('div', 'demo-caption');
      p.appendChild(cap);
      panelsWrap.appendChild(p);
      return { body: body, cap: cap };
    });

    function playSequence(seq, tone) {
      slots.forEach(function (s) { s.body.className = 'demo-body-text is-quiet'; s.body.textContent = '···'; s.cap.textContent = ''; });
      staggerReveal(seq, 700, function (shot, i) {
        var s = slots[i];
        s.body.classList.remove('is-quiet');
        s.body.textContent = shot.text;
        s.cap.innerHTML = '<span class="demo-marker ' + (shot.tone || tone || 'neutral') + '" style="margin-top:0;display:inline-flex;">' + esc(shot.caption) + '</span>';
      });
    }

    var playBtn = btn(cfg.playLabel || 'Play Sequence');
    var breakBtn = btn(cfg.breakLabel || 'Show the Break Instead', 'is-ghost');
    toolbar.appendChild(playBtn);
    toolbar.appendChild(breakBtn);
    on(playBtn, 'click', function () { playBtn.classList.add('is-active'); breakBtn.classList.remove('is-active'); playSequence(cfg.sequence, 'good'); });
    on(breakBtn, 'click', function () { breakBtn.classList.add('is-active'); playBtn.classList.remove('is-active'); playSequence(cfg.breakSequence, 'bad'); });
  }

  // ===================================================================
  // PATTERN 2: compare
  // ===================================================================

  function initCompare(root, cfg) {
    var stage = root.querySelector('[data-demo-stage]');
    var toolbar = root.querySelector('[data-demo-toolbar]');
    if (cfg.type === 'toggle') return compareToggle(stage, toolbar, cfg);
    if (cfg.type === 'dual') return compareDual(stage, toolbar, cfg);
    if (cfg.type === 'slider') return compareSlider(stage, toolbar, cfg);
    if (cfg.type === 'toggle-list') return compareToggleList(stage, toolbar, cfg);
  }

  var COMPARE_VISUALS = {
    'exposure-walk': visualExposureWalk,
    'lightmix': visualLightmix,
    'meter-histogram': visualMeterHistogram,
    'focus-pull': visualFocusPull,
    'pan-tripod': visualPanTripod,
    'annotated-list': visualAnnotatedList,
    'waveform': visualWaveform,
    'calculator': visualCalculator,
  };

  function compareToggle(stage, toolbar, cfg) {
    var body = el('div', 'demo-stage-inner');
    stage.appendChild(body);
    var buttons = cfg.states.map(function (s) {
      var b = btn(s.label);
      toolbar.appendChild(b);
      return b;
    });
    var renderFn = COMPARE_VISUALS[cfg.visual];
    function activate(i) {
      buttons.forEach(function (b, j) { b.classList.toggle('is-active', j === i); });
      renderFn(body, cfg.states[i], cfg, i);
    }
    buttons.forEach(function (b, i) { on(b, 'click', function () { activate(i); }); });
    activate(0);
  }

  function compareToggleList(stage, toolbar, cfg) {
    toolbar.remove();
    cfg.rows.forEach(function (row) {
      var r = el('div', 'demo-toggle-list-row');
      var head = el('div', 'demo-toggle-list-head');
      head.appendChild(el('span', 'demo-toggle-list-name', esc(row.label)));
      var mini = el('div', 'demo-mini-toggle');
      var bEv = btn('Evidence-Backed'); bEv.type = 'button';
      var bRs = btn('Rubber-Stamp'); bRs.type = 'button';
      mini.appendChild(bEv); mini.appendChild(bRs);
      head.appendChild(mini);
      r.appendChild(head);
      var body = el('p', 'demo-caption', esc(row.evidence));
      r.appendChild(body);
      stage.appendChild(r);
      function set(mode) {
        bEv.classList.toggle('is-active', mode === 'evidence');
        bRs.classList.toggle('is-active', mode === 'rubber');
        body.textContent = mode === 'evidence' ? row.evidence : row.rubber;
      }
      on(bEv, 'click', function () { set('evidence'); });
      on(bRs, 'click', function () { set('rubber'); });
      set('evidence');
    });
  }

  function compareDual(stage, toolbar, cfg) {
    if (cfg.visual === 'loop-pair') return dualLoopPair(stage, toolbar, cfg);
    if (cfg.visual === 'phone-pair') return dualPhonePair(stage, toolbar, cfg);
  }

  function dualLoopPair(stage, toolbar, cfg) {
    var wrap = el('div', 'demo-columns');
    stage.appendChild(wrap);
    var badges = [];
    cfg.states.forEach(function (s) {
      var panel = el('div', 'demo-panel');
      panel.appendChild(el('p', 'demo-panel-label', esc(s.label)));
      var scene = el('div', 'demo-scene', '');
      scene.style.background = 'var(--surface)';
      var mover = el('div', '', '');
      mover.style.cssText = 'width:34px;height:70px;margin:20px auto;border-radius:8px;background:var(--text-tertiary);transition:transform 900ms ease-in-out;';
      scene.appendChild(mover);
      panel.appendChild(scene);
      var badge = el('p', 'demo-marker neutral', '…');
      panel.appendChild(badge);
      panel.appendChild(el('p', 'demo-caption', esc(s.caption)));
      wrap.appendChild(panel);
      badges.push({ badge: badge, mover: mover, s: s });
    });
    var playBtn = btn(cfg.playLabel || 'Play Both (2s Loop)');
    toolbar.appendChild(playBtn);
    on(playBtn, 'click', function () {
      badges.forEach(function (b) {
        b.badge.className = 'demo-marker neutral';
        b.badge.textContent = '…';
        b.mover.style.transform = b.s.motion === 'static' ? 'translateX(0)' : 'translateX(40px) rotate(8deg)';
        setTimeout(function () {
          b.badge.className = 'demo-marker ' + (b.s.motion === 'static' ? 'bad' : 'good');
          b.badge.textContent = b.s.reactionBadge;
        }, REDUCED ? 0 : 900);
      });
    });
    if (cfg.bottomLine) stage.appendChild(el('p', 'demo-bottom-line', esc(cfg.bottomLine)));
  }

  function dualPhonePair(stage, toolbar, cfg) {
    var wrap = el('div', 'demo-phones');
    stage.appendChild(wrap);
    var built = cfg.states.map(function (s) {
      var phone = el('div', 'demo-phone');
      phone.appendChild(el('p', 'demo-panel-label', esc(s.label)));
      var screen = el('div', 'demo-phone-screen');
      var marker = el('div', 'demo-phone-marker');
      marker.style.left = '13%';
      screen.appendChild(marker);
      var titleCard = null, payoff;
      if (s.kind === 'titlecard') {
        titleCard = el('div', 'demo-phone-title-card', esc(s.titleText));
        screen.appendChild(titleCard);
      }
      payoff = el('div', 'demo-phone-payoff', '▶');
      payoff.style.opacity = s.kind === 'titlecard' ? '0' : '1';
      screen.appendChild(payoff);
      phone.appendChild(screen);
      phone.appendChild(el('p', 'demo-caption', esc(s.caption)));
      wrap.appendChild(phone);
      return { titleCard: titleCard, payoff: payoff, s: s };
    });
    var playBtn = btn(cfg.playLabel || 'Play Both');
    toolbar.appendChild(playBtn);
    on(playBtn, 'click', function () {
      built.forEach(function (b) {
        if (b.titleCard) {
          b.titleCard.style.opacity = '1';
          b.payoff.style.opacity = '0';
          setTimeout(function () {
            b.titleCard.style.opacity = '0';
            b.payoff.style.opacity = '1';
          }, REDUCED ? 0 : 1200);
        } else {
          b.payoff.style.transform = 'scale(1.08)';
          setTimeout(function () { b.payoff.style.transform = 'scale(1)'; }, 300);
        }
      });
    });
    if (cfg.bottomLine) stage.appendChild(el('p', 'demo-bottom-line', esc(cfg.bottomLine)));
  }

  function compareSlider(stage, toolbar, cfg) {
    toolbar.remove();
    var wrap = el('div', 'demo-slider-wrap');
    wrap.style.minHeight = '260px';
    var before = el('div', 'demo-slider-side', cfg.beforeHtml);
    var after = el('div', 'demo-slider-side is-after', cfg.afterHtml);
    var handle = el('div', 'demo-slider-handle');
    wrap.appendChild(before);
    wrap.appendChild(after);
    wrap.appendChild(handle);
    wrap.appendChild(el('span', 'demo-slider-caption left', esc(cfg.beforeLabel)));
    wrap.appendChild(el('span', 'demo-slider-caption right', esc(cfg.afterLabel)));
    stage.appendChild(wrap);

    function setPct(pct) {
      pct = Math.max(6, Math.min(94, pct));
      after.style.clipPath = 'inset(0 0 0 ' + pct + '%)';
      handle.style.left = pct + '%';
    }
    setPct(50);
    var dragging = false;
    function pctFromEvent(e) {
      var rect = wrap.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      return (x / rect.width) * 100;
    }
    on(handle, 'pointerdown', function (e) { dragging = true; handle.setPointerCapture && handle.setPointerCapture(e.pointerId); });
    on(wrap, 'pointermove', function (e) { if (dragging) setPct(pctFromEvent(e)); });
    on(window, 'pointerup', function () { dragging = false; });
    on(handle, 'keydown', function (e) {
      var cur = parseFloat(handle.style.left) || 50;
      if (e.key === 'ArrowLeft') setPct(cur - 5);
      if (e.key === 'ArrowRight') setPct(cur + 5);
    });
    handle.tabIndex = 0;
  }

  // ---- compare visual renderers ----

  function visualExposureWalk(body, state, cfg) {
    body.innerHTML = '';
    var scene = el('div', 'demo-scene');
    var figure = el('div', 'demo-scene-figure', '<svg viewBox="0 0 20 60" fill="currentColor" style="color:#20211f"><ellipse cx="10" cy="8" rx="6" ry="7"/><rect x="4" y="15" width="12" height="34" rx="5"/><rect x="2" y="48" width="6" height="10" rx="2"/><rect x="12" y="48" width="6" height="10" rx="2"/></svg>');
    scene.appendChild(figure);
    body.appendChild(scene);
    var caption = el('p', 'demo-caption', esc(state.caption));
    var flagSlot = el('div');
    body.appendChild(flagSlot);
    body.appendChild(caption);
    body.appendChild(el('p', 'demo-bottom-line', esc(cfg.bottomLine)));

    var playBtn = btn('Play the Walk');
    body.insertBefore(playBtn, body.firstChild);

    on(playBtn, 'click', function () {
      figure.style.transition = REDUCED ? 'none' : 'left 4.5s linear, filter 400ms';
      figure.style.left = '6%';
      figure.classList.remove('demo-scene-dim', 'demo-scene-bright');
      flagSlot.innerHTML = '';
      void figure.offsetWidth;
      figure.style.left = '84%';
      var crossMs = REDUCED ? 0 : 2700; // ~6s boundary within 4.5s walk, scaled
      if (state.key === 'auto') {
        setTimeout(function () {
          figure.classList.add('demo-scene-dim');
          flagSlot.innerHTML = '';
          flagSlot.appendChild(markerEl('bad', 'Background darkens, camera brightens the whole frame to compensate.'));
        }, crossMs);
      } else {
        flagSlot.appendChild(markerEl('good', 'Exposure locked before the walk. Face brightness never moves.'));
      }
    });
  }

  function visualLightmix(body, state, cfg) {
    body.innerHTML = '';
    var wrap = el('div', 'demo-lightmix');
    var face = el('div', 'demo-face');
    wrap.appendChild(face);
    var labels = el('div', 'demo-mix-labels');
    var lampLabel = el('span', '', 'Lamp');
    var winLabel = el('span', '', 'Window');
    labels.appendChild(lampLabel);
    labels.appendChild(winLabel);
    wrap.appendChild(labels);
    body.appendChild(wrap);
    var caption = el('p', 'demo-caption', esc(state.caption));
    body.appendChild(caption);

    var sub = null;
    if (state.key === 'single') {
      sub = el('div', 'demo-toolbar');
      var lampBtn = btn('Lamp Only');
      var winBtn = btn('Window Only');
      sub.appendChild(lampBtn);
      sub.appendChild(winBtn);
      body.insertBefore(sub, caption);
      function setSource(which) {
        lampBtn.classList.toggle('is-active', which === 'lamp');
        winBtn.classList.toggle('is-active', which === 'window');
        lampLabel.classList.toggle('is-on', which === 'lamp');
        winLabel.classList.toggle('is-on', which === 'window');
        face.style.background = which === 'lamp' ? '#caa07a' : '#a9b6bd';
        caption.textContent = which === 'lamp' ? cfg.lampCaption : cfg.windowCaption;
      }
      on(lampBtn, 'click', function () { setSource('lamp'); });
      on(winBtn, 'click', function () { setSource('window'); });
      setSource('lamp');
    } else {
      lampLabel.classList.add('is-on');
      winLabel.classList.add('is-on');
      var mixing = true;
      var toneA = '#caa07a', toneB = '#8fa3ad';
      var flip = false;
      var timer = setInterval(function () {
        face.style.background = flip ? toneA : toneB;
        flip = !flip;
      }, REDUCED ? 100000 : 1500);
      body.setAttribute('data-cleanup', '1');
      var prevCleanup = body._demoCleanup;
      if (prevCleanup) prevCleanup();
      body._demoCleanup = function () { clearInterval(timer); };
    }
  }

  function visualMeterHistogram(body, state, cfg) {
    body.innerHTML = '';
    var lcd = el('div', 'demo-lcd');
    lcd.appendChild(el('div', 'demo-lcd-glare is-on'));
    lcd.appendChild(el('div', 'demo-lcd-label', 'Bright outdoor sun on the LCD'));
    body.appendChild(lcd);

    var meter = el('div', 'demo-meter');
    meter.appendChild(el('p', 'demo-panel-label', 'Exposure Meter'));
    var track = el('div', 'demo-meter-track');
    var needle = el('div', 'demo-meter-needle' + (state.meterOff ? ' is-off' : ''));
    track.appendChild(needle);
    meter.appendChild(track);
    var ticks = el('div', 'demo-meter-ticks', '<span>-3</span><span>-2</span><span>-1</span><span>0</span><span>+1</span><span>+2</span><span>+3</span>');
    meter.appendChild(ticks);
    body.appendChild(meter);

    requestAnimationFrame(function () {
      var pct = 50 + (state.meterValue / 3) * 42;
      needle.style.left = pct + '%';
    });

    body.appendChild(el('p', 'demo-caption', esc(state.caption)));

    var histSlot = el('div');
    body.appendChild(histSlot);
    var capBtn = btn('Capture');
    body.insertBefore(capBtn, body.querySelector('.demo-caption'));
    on(capBtn, 'click', function () {
      histSlot.innerHTML = '';
      var hist = el('div', 'demo-histogram');
      var bars = state.histogram; // array of 0..100 heights
      bars.forEach(function (h, i) {
        var bar = el('div', 'bar' + (state.meterOff ? (i > bars.length * 0.72 ? ' is-clip' : '') : (Math.abs(i - bars.length / 2) < bars.length * 0.28 ? ' is-clean' : '')));
        hist.appendChild(bar);
      });
      histSlot.appendChild(hist);
      requestAnimationFrame(function () {
        Array.prototype.forEach.call(hist.children, function (bar, i) { bar.style.height = bars[i] + '%'; });
      });
      histSlot.appendChild(el('p', 'demo-caption', esc(state.histCaption)));
    });

    body.appendChild(el('p', 'demo-bottom-line', esc(cfg.bottomLine)));
  }

  function visualFocusPull(body, state, cfg) {
    body.innerHTML = '';
    var wrap = el('div', 'demo-focus-wrap');
    var ring = el('div', 'demo-focus-ring');
    var notch = el('div', 'demo-focus-ring-notch');
    ring.appendChild(notch);
    wrap.appendChild(ring);
    var targets = el('div', 'demo-focus-targets');
    var near = el('div', 'demo-focus-target is-peak', 'Near');
    var far = el('div', 'demo-focus-target', 'Far');
    targets.appendChild(near);
    targets.appendChild(far);
    wrap.appendChild(targets);
    body.appendChild(wrap);
    var timeReadout = el('p', 'demo-readout', '');
    body.appendChild(timeReadout);
    body.appendChild(el('p', 'demo-caption', esc(state.caption)));

    var playBtn = btn('Run the Pull');
    body.insertBefore(playBtn, wrap);
    on(playBtn, 'click', function () {
      near.classList.add('is-peak'); far.classList.remove('is-peak');
      var start = Date.now();
      if (state.key === 'smooth') {
        notch.style.transition = REDUCED ? 'none' : 'transform 2000ms linear';
        notch.style.transform = 'translateX(-50%) rotate(150deg)';
        setTimeout(function () {
          near.classList.remove('is-peak'); far.classList.add('is-peak');
          timeReadout.textContent = 'Landed in ~2.0s, one continuous turn.';
        }, REDUCED ? 0 : 2000);
      } else {
        var angle = 0;
        var bursts = [40, 90, 150];
        var i = 0;
        function burst() {
          if (i >= bursts.length) {
            far.classList.add('is-peak');
            timeReadout.textContent = 'Landed late at ~4.2s, after three corrections.';
            return;
          }
          near.classList.toggle('is-peak', i % 2 === 0);
          far.classList.toggle('is-peak', i % 2 !== 0);
          notch.style.transition = REDUCED ? 'none' : 'transform 500ms ease-in-out';
          notch.style.transform = 'translateX(-50%) rotate(' + bursts[i] + 'deg)';
          i++;
          setTimeout(burst, REDUCED ? 0 : 700);
        }
        near.classList.remove('is-peak'); far.classList.remove('is-peak');
        burst();
      }
    });
    body.appendChild(el('p', 'demo-bottom-line', esc(cfg.bottomLine)));
  }

  function visualPanTripod(body, state, cfg) {
    body.innerHTML = '';
    var track = el('div', 'demo-pan-track');
    var bg = el('div', 'demo-pan-bg');
    for (var i = 0; i < 6; i++) bg.appendChild(el('span'));
    var frame = el('div', 'demo-pan-frame');
    track.appendChild(bg);
    track.appendChild(frame);
    body.appendChild(track);
    body.appendChild(el('p', 'demo-caption', esc(state.caption)));

    var playBtn = btn('Play');
    body.insertBefore(playBtn, track);
    on(playBtn, 'click', function () {
      frame.style.transition = 'none';
      frame.style.left = '0%';
      frame.style.top = '8px';
      void frame.offsetWidth;
      if (state.key === 'jerky') {
        var steps = [15, 35, 50, 78];
        var i = 0;
        (function step() {
          if (i >= steps.length) return;
          frame.style.transition = REDUCED ? 'none' : 'left 160ms steps(2,end)';
          frame.style.left = steps[i] + '%';
          i++;
          setTimeout(step, REDUCED ? 0 : 220);
        })();
      } else if (state.key === 'smooth') {
        frame.style.transition = REDUCED ? 'none' : 'left 8000ms cubic-bezier(.35,0,.2,1)';
        frame.style.left = '78%';
      } else {
        frame.style.left = '38%';
        setTimeout(function () {
          frame.style.transition = REDUCED ? 'none' : 'top 9000ms linear';
          frame.style.top = '46px';
        }, 50);
      }
    });
    body.appendChild(el('p', 'demo-bottom-line', esc(cfg.bottomLine)));
  }

  function visualAnnotatedList(body, state) {
    body.innerHTML = '';
    var outline = el('div', 'demo-outline');
    state.beats.forEach(function (b) {
      var beat = el('div', 'demo-outline-beat' + (b.loop ? ' is-loop' : '') + (b.flag ? ' is-flag' : ''));
      var time = el('div', 'demo-outline-time', esc(b.time));
      var bodyEl = el('div', 'demo-outline-body');
      bodyEl.innerHTML = '<p>' + esc(b.text) + '</p>' + (b.loop ? '<span class="demo-outline-loop-tag">LOOP CLOSES HERE</span>' : '') + (b.flag ? '<span class="demo-outline-flag-note">' + esc(b.flag) + '</span>' : '');
      beat.appendChild(time);
      beat.appendChild(bodyEl);
      outline.appendChild(beat);
    });
    body.appendChild(outline);
  }

  function visualWaveform(body, state, cfg) {
    body.innerHTML = '';
    var wf = el('div', 'demo-waveform');
    var marker = el('div', 'demo-wave-marker' + (state.synced ? ' is-synced' : ''));
    var n = 40;
    for (var i = 0; i < n; i++) {
      var isDrop = i === state.dropIndex;
      var h = isDrop ? 92 : 14 + Math.round(30 * Math.abs(Math.sin(i * 0.7)));
      var bar = el('div', 'bar' + (isDrop ? ' is-drop' : ''));
      bar.style.height = h + '%';
      wf.appendChild(bar);
    }
    wf.appendChild(marker);
    body.appendChild(wf);
    requestAnimationFrame(function () {
      marker.style.left = ((state.markerIndex / n) * 100) + '%';
    });
    body.appendChild(el('p', 'demo-caption', esc(state.caption)));
    body.appendChild(el('p', 'demo-bottom-line', esc(cfg.bottomLine)));
  }

  function visualCalculator(body, state, cfg) {
    body.innerHTML = '';
    body.appendChild(el('p', 'demo-body-text', esc(state.worked)));
    var summary = el('div', 'demo-calc-summary is-filled', esc(cfg.positionStatement));
    body.appendChild(summary);
  }

  // ===================================================================
  // PATTERN 3: zones
  // ===================================================================

  function initZones(root, cfg) {
    var stage = root.querySelector('[data-demo-stage]');
    var toolbar = root.querySelector('[data-demo-toolbar]');
    if (cfg.kind === 'beat-timer') return zonesBeatTimer(stage, toolbar, cfg);
    if (cfg.kind === 'stage-tracker') return zonesStageTracker(stage, toolbar, cfg);
    if (cfg.kind === 'timeline-compare') return zonesTimelineCompare(stage, toolbar, cfg);
  }

  function zonesBeatTimer(stage, toolbar, cfg) {
    var bar = el('div', 'demo-zonebar');
    var fills = cfg.zones.map(function (z) {
      var zoneEl = el('div', 'demo-zone');
      zoneEl.style.width = (((z.end - z.start) / cfg.totalSec) * 100) + '%';
      var fill = el('div', 'demo-zone-fill');
      fill.style.opacity = String(0.35 + 0.65 * (cfg.zones.indexOf(z) / (cfg.zones.length - 1 || 1)));
      zoneEl.appendChild(fill);
      bar.appendChild(zoneEl);
      return fill;
    });
    stage.appendChild(bar);
    var labels = el('div', 'demo-zone-labels');
    var labelEls = cfg.zones.map(function (z) {
      var l = el('span', 'demo-zone-label', esc(z.label));
      l.style.width = (((z.end - z.start) / cfg.totalSec) * 100) + '%';
      labels.appendChild(l);
      return l;
    });
    stage.appendChild(labels);
    var beatText = el('div', 'demo-beat-text', 'Press play to run the read.');
    stage.appendChild(beatText);
    var clock = el('p', 'demo-clock', '0.0s / ' + cfg.totalSec + 's');
    stage.appendChild(clock);

    var playBtn = btn(cfg.buttonLabel || 'Play the Read');
    toolbar.appendChild(playBtn);

    on(playBtn, 'click', function () {
      playBtn.disabled = true;
      var durationMs = REDUCED ? 0 : cfg.totalSec * 1000;
      fills.forEach(function (f) { f.style.transition = 'none'; f.style.transform = 'scaleX(0)'; });
      void bar.offsetWidth;
      fills.forEach(function (f) {
        f.style.transition = REDUCED ? 'none' : 'transform ' + durationMs + 'ms linear';
      });
      // stagger each zone's fill start based on its own start time
      cfg.zones.forEach(function (z, i) {
        var startAt = REDUCED ? 0 : (z.start / cfg.totalSec) * durationMs;
        var fillDur = REDUCED ? 0 : ((z.end - z.start) / cfg.totalSec) * durationMs;
        setTimeout(function () {
          fills[i].style.transition = REDUCED ? 'none' : 'transform ' + fillDur + 'ms linear';
          fills[i].style.transform = 'scaleX(1)';
          labelEls.forEach(function (l, j) { l.classList.toggle('is-active', j === i); });
          beatText.textContent = z.text;
        }, startAt);
      });
      var start = Date.now();
      var tick = setInterval(function () {
        var elapsed = REDUCED ? cfg.totalSec : Math.min(cfg.totalSec, (Date.now() - start) / 1000);
        clock.textContent = elapsed.toFixed(1) + 's / ' + cfg.totalSec + 's';
        if (elapsed >= cfg.totalSec) { clearInterval(tick); playBtn.disabled = false; labelEls.forEach(function (l) { l.classList.remove('is-active'); }); }
      }, REDUCED ? 0 : 100);
      if (REDUCED) { clock.textContent = cfg.totalSec + 's / ' + cfg.totalSec + 's'; playBtn.disabled = false; }
    });
  }

  function zonesStageTracker(stage, toolbar, cfg) {
    var tracker = el('div', 'demo-stage-tracker');
    var segs = cfg.segments.map(function (s) {
      var seg = el('div', 'demo-stage-seg');
      var bar = el('div', 'demo-stage-seg-bar');
      var fill = el('div', 'demo-stage-seg-fill');
      bar.appendChild(fill);
      seg.appendChild(bar);
      seg.appendChild(el('div', 'demo-stage-seg-label', esc(s.label) + '<br>' + esc(s.budget)));
      tracker.appendChild(seg);
      return fill;
    });
    stage.appendChild(tracker);
    var flag = el('p', 'demo-stage-flag');
    stage.appendChild(flag);

    function run(mode) {
      segs.forEach(function (f) { f.style.transition = 'none'; f.style.transform = 'scaleX(0)'; f.classList.remove('is-over'); });
      flag.textContent = '';
      flag.className = 'demo-stage-flag';
      void tracker.offsetWidth;
      var stepMs = REDUCED ? 0 : 700;
      cfg.segments.forEach(function (s, i) {
        setTimeout(function () {
          var over = mode === 'overrun' && s.overrun;
          segs[i].classList.toggle('is-over', !!over);
          segs[i].style.transition = REDUCED ? 'none' : 'transform 600ms ease-out';
          segs[i].style.transform = 'scaleX(' + (over ? 1.15 : 1) + ')';
        }, i * stepMs);
      });
      setTimeout(function () {
        if (mode === 'overrun') {
          flag.textContent = cfg.overrunResult;
          flag.classList.add('warn');
        } else {
          flag.textContent = cfg.onBudgetResult;
          flag.classList.add('good');
        }
      }, REDUCED ? 0 : cfg.segments.length * stepMs + 200);
    }

    var onBtn = btn(cfg.onBudgetLabel || 'Run On-Budget');
    var overBtn = btn(cfg.overrunLabel || 'Run the Overrun', 'is-ghost');
    toolbar.appendChild(onBtn);
    toolbar.appendChild(overBtn);
    on(onBtn, 'click', function () { onBtn.classList.add('is-active'); overBtn.classList.remove('is-active'); run('planned'); });
    on(overBtn, 'click', function () { overBtn.classList.add('is-active'); onBtn.classList.remove('is-active'); run('overrun'); });
  }

  function zonesTimelineCompare(stage, toolbar, cfg) {
    var wrap = el('div', '');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:16px;';
    var rows = cfg.tracks.map(function (t) {
      var row = el('div');
      row.appendChild(el('p', 'demo-panel-label', esc(t.label)));
      var tl = el('div', 'demo-timeline');
      var head = el('div', 'demo-timeline-playhead');
      var segEls = t.segments.map(function (s) {
        var seg = el('div', 'demo-timeline-seg', esc(s));
        seg.style.flex = '1 1 0';
        tl.appendChild(seg);
        return seg;
      });
      tl.appendChild(head);
      row.appendChild(tl);
      row.appendChild(el('p', 'demo-caption', esc(t.caption)));
      wrap.appendChild(row);
      return { segEls: segEls, head: head, tl: tl };
    });
    stage.appendChild(wrap);

    var playBtn = btn(cfg.buttonLabel || 'Play Both');
    toolbar.appendChild(playBtn);
    on(playBtn, 'click', function () {
      rows.forEach(function (r) {
        r.segEls.forEach(function (s) { s.classList.remove('is-shown'); });
        r.head.style.transition = 'none';
        r.head.style.left = '0%';
      });
      void document.body.offsetWidth;
      rows.forEach(function (r) {
        r.head.style.transition = REDUCED ? 'none' : 'left ' + (cfg.durationMs) + 'ms linear';
        r.head.style.left = '100%';
        staggerReveal(r.segEls, cfg.durationMs / r.segEls.length, function (s) { s.classList.add('is-shown'); });
      });
    });
  }

  // ===================================================================
  // PATTERN 4: panels
  // ===================================================================

  function initPanels(root, cfg) {
    var stage = root.querySelector('[data-demo-stage]');
    var toolbar = root.querySelector('[data-demo-toolbar]');
    if (cfg.kind === 'struck-readout') return panelsStruckReadout(stage, toolbar, cfg);
    if (cfg.kind === 'tracked-edit') return panelsTrackedEdit(stage, toolbar, cfg);
    if (cfg.kind === 'callout-dots') return panelsCalloutDots(stage, toolbar, cfg);
    if (cfg.kind === 'beat-sync') return panelsBeatSync(stage, toolbar, cfg);
    if (cfg.kind === 'sort-buckets') return panelsSortBuckets(stage, toolbar, cfg);
    if (cfg.kind === 'accordion-trace') return panelsAccordionTrace(stage, toolbar, cfg);
    if (cfg.kind === 'sequential-strike') return panelsSequentialStrike(stage, toolbar, cfg);
  }

  function strikeHtml(text) {
    // text may contain ~~struck spans~~ and **protected spans**
    return esc(text)
      .replace(/~~(.+?)~~/g, '<span class="demo-strike">$1</span>')
      .replace(/\*\*(.+?)\*\*/g, '<span class="demo-protected">$1</span>');
  }

  function panelsStruckReadout(stage, toolbar, cfg) {
    toolbar.remove();
    var wrap = el('div', 'demo-columns');
    cfg.panels.forEach(function (p) {
      var panel = el('div', 'demo-panel');
      panel.appendChild(el('p', 'demo-panel-label', esc(p.label)));
      panel.appendChild(el('p', 'demo-body-text', strikeHtml(p.text)));
      panel.appendChild(el('p', 'demo-readout', esc(p.readout)));
      wrap.appendChild(panel);
    });
    stage.appendChild(wrap);
  }

  function panelsTrackedEdit(stage, toolbar, cfg) {
    var wrap = el('div', 'demo-columns');
    var rawPanel = el('div', 'demo-panel');
    rawPanel.appendChild(el('p', 'demo-panel-label', 'Raw AI Draft'));
    var rawBody = el('p', 'demo-body-text');
    var editsById = {};
    var html = esc(cfg.rawText);
    cfg.edits.forEach(function (e, i) {
      var re = new RegExp(esc(e.span).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      html = html.replace(re, '<span class="demo-hl" data-edit="' + i + '">' + esc(e.span) + '</span>');
    });
    rawBody.innerHTML = html;
    rawPanel.appendChild(rawBody);
    var tooltip = el('div', 'demo-callout-tooltip');
    rawPanel.appendChild(tooltip);
    wrap.appendChild(rawPanel);

    var finalPanel = el('div', 'demo-panel');
    finalPanel.appendChild(el('p', 'demo-panel-label', 'Edited Final'));
    var finalBody = el('p', 'demo-body-text', esc(cfg.editedText));
    finalPanel.appendChild(finalBody);
    wrap.appendChild(finalPanel);
    stage.appendChild(wrap);

    rawBody.querySelectorAll('.demo-hl').forEach(function (span) {
      on(span, 'click', function () {
        rawBody.querySelectorAll('.demo-hl').forEach(function (s) { s.classList.remove('is-active'); });
        span.classList.add('is-active');
        var e = cfg.edits[parseInt(span.getAttribute('data-edit'), 10)];
        tooltip.innerHTML = '<b>' + esc(e.type) + ':</b> ' + esc(e.explanation);
        tooltip.classList.add('is-shown');
      });
    });

    var toggleBtn = btn(cfg.toggleLabel || 'Show Cosmetic-Only Version');
    toolbar.appendChild(toggleBtn);
    var showingCosmetic = false;
    on(toggleBtn, 'click', function () {
      showingCosmetic = !showingCosmetic;
      toggleBtn.classList.toggle('is-active', showingCosmetic);
      if (showingCosmetic) {
        finalPanel.querySelector('.demo-panel-label').textContent = 'Cosmetic-Only "Final" (fails)';
        finalBody.textContent = cfg.cosmeticText;
        finalBody.style.color = 'var(--warning)';
      } else {
        finalPanel.querySelector('.demo-panel-label').textContent = 'Edited Final';
        finalBody.textContent = cfg.editedText;
        finalBody.style.color = '';
      }
    });
  }

  function panelsCalloutDots(stage, toolbar, cfg) {
    toolbar.remove();
    var wrap = el('div', 'demo-columns');
    if (cfg.sourceCaption) {
      var src = el('div', 'demo-panel');
      src.style.gridColumn = '1 / -1';
      src.appendChild(el('p', 'demo-panel-label', 'Source Footage'));
      src.appendChild(el('p', 'demo-body-text is-quiet', esc(cfg.sourceCaption)));
      wrap.appendChild(src);
    }
    cfg.frames.forEach(function (frame) {
      var panel = el('div', 'demo-panel');
      panel.appendChild(el('p', 'demo-panel-label', esc(frame.label)));
      var callFrame = el('div', 'demo-callout-frame');
      var dotsWrap = el('div');
      var tooltip = el('div', 'demo-callout-tooltip');
      frame.callouts.forEach(function (c) {
        var dot = el('span', 'demo-callout-dot', esc(c.label));
        dotsWrap.appendChild(dot);
        on(dot, 'click', function () {
          var isOpen = dot.classList.contains('is-open');
          dotsWrap.querySelectorAll('.demo-callout-dot').forEach(function (d) { d.classList.remove('is-open'); });
          if (isOpen) { tooltip.classList.remove('is-shown'); return; }
          dot.classList.add('is-open');
          tooltip.textContent = c.reveal;
          tooltip.classList.add('is-shown');
        });
      });
      callFrame.appendChild(dotsWrap);
      callFrame.appendChild(tooltip);
      panel.appendChild(callFrame);
      wrap.appendChild(panel);
    });
    stage.appendChild(wrap);
    if (cfg.bottomLine) stage.appendChild(el('p', 'demo-bottom-line', esc(cfg.bottomLine)));
  }

  function panelsBeatSync(stage, toolbar, cfg) {
    var wrap = el('div', 'demo-columns');
    wrap.style.gridTemplateColumns = 'repeat(3,1fr)';
    var panelBodies = cfg.panelLabels.map(function (label) {
      var p = el('div', 'demo-panel');
      p.appendChild(el('p', 'demo-panel-label', esc(label)));
      var body = el('p', 'demo-body-text is-quiet', 'Select a beat above.');
      p.appendChild(body);
      wrap.appendChild(p);
      return body;
    });
    stage.appendChild(wrap);
    var buttons = cfg.beats.map(function (beat) {
      var b = btn(beat.label);
      toolbar.appendChild(b);
      return b;
    });
    function activate(i) {
      buttons.forEach(function (b, j) { b.classList.toggle('is-active', j === i); });
      var beat = cfg.beats[i];
      panelBodies.forEach(function (pb, j) {
        pb.classList.remove('is-quiet');
        pb.textContent = beat.values[j];
      });
    }
    buttons.forEach(function (b, i) { on(b, 'click', function () { activate(i); }); });
  }

  function panelsSortBuckets(stage, toolbar, cfg) {
    toolbar.remove();
    var cardsWrap = el('div', 'demo-sort-cards');
    var cards = cfg.pillars.map(function (p, i) {
      var c = el('div', 'demo-sort-card', esc(p.name));
      cardsWrap.appendChild(c);
      return c;
    });
    stage.appendChild(cardsWrap);
    var bucketsWrap = el('div', 'demo-buckets');
    var buckets = cfg.buckets.map(function (name) {
      var b = el('div', 'demo-bucket');
      b.appendChild(el('div', 'demo-bucket-label', esc(name)));
      bucketsWrap.appendChild(b);
      return b;
    });
    stage.appendChild(bucketsWrap);
    var banner = el('div', 'demo-result-banner', esc(cfg.resultText));
    stage.appendChild(banner);

    var selected = null;
    var placedCount = 0;
    cards.forEach(function (c, i) {
      on(c, 'click', function () {
        if (c.classList.contains('is-placed')) return;
        cards.forEach(function (x) { x.classList.remove('is-selected'); });
        selected = i;
        c.classList.add('is-selected');
      });
    });
    buckets.forEach(function (b, bi) {
      on(b, 'click', function () {
        if (selected === null) return;
        var pillar = cfg.pillars[selected];
        if (cfg.buckets[bi] !== pillar.bucket) {
          // wrong bucket: brief red flash, no placement: matches the spec's fixed, evidence-cited answer
          b.style.borderColor = 'var(--warning)';
          setTimeout(function () { b.style.borderColor = ''; }, 500);
          return;
        }
        var item = el('div', 'demo-bucket-item');
        item.innerHTML = '<span class="name">' + esc(pillar.name) + '</span><span class="why">' + esc(pillar.evidence) + ' ' + esc(pillar.action) + '</span>';
        b.appendChild(item);
        cards[selected].classList.add('is-placed');
        cards[selected].classList.remove('is-selected');
        placedCount++;
        selected = null;
        if (placedCount === cards.length) banner.classList.add('is-shown');
      });
    });
  }

  function panelsAccordionTrace(stage, toolbar, cfg) {
    toolbar.remove();
    cfg.sections.forEach(function (s) {
      var row = el('div', 'demo-accordion-row');
      var head = el('button', 'demo-accordion-head');
      head.type = 'button';
      head.innerHTML = '<span>' + esc(s.title) + '</span><span class="chev">&rsaquo;</span>';
      var bodyWrap = el('div', 'demo-accordion-body');
      var inner = el('div', 'demo-accordion-inner');
      inner.innerHTML = esc(s.excerpt) + '<span class="demo-tag">' + esc(s.tag) + '</span>';
      bodyWrap.appendChild(inner);
      row.appendChild(head);
      row.appendChild(bodyWrap);
      stage.appendChild(row);
      on(head, 'click', function () { row.classList.toggle('is-open'); });
    });
    if (cfg.footerNote) stage.appendChild(el('p', 'demo-caption', esc(cfg.footerNote)));
  }

  function panelsSequentialStrike(stage, toolbar, cfg) {
    var panel = el('div', 'demo-panel');
    var body = el('p', 'demo-body-text', esc(cfg.startText));
    panel.appendChild(body);
    stage.appendChild(panel);
    var readerSlot = el('div');
    stage.appendChild(readerSlot);

    var rewriteBtn = btn(cfg.rewriteLabel || 'Rewrite Live');
    var testBtn = btn(cfg.testLabel || 'Test It', 'is-ghost');
    testBtn.disabled = true;
    toolbar.appendChild(rewriteBtn);
    toolbar.appendChild(testBtn);

    on(rewriteBtn, 'click', function () {
      rewriteBtn.disabled = true;
      var current = cfg.startText;
      body.textContent = current;
      staggerReveal(cfg.steps, REDUCED ? 0 : 900, function (step) {
        body.innerHTML = strikeHtml(step.display);
      }, function () {
        body.textContent = cfg.finalText;
        testBtn.disabled = false;
      });
    });
    on(testBtn, 'click', function () {
      readerSlot.innerHTML = '';
      readerSlot.appendChild(el('p', 'demo-caption', '"' + esc(cfg.readerRestatement) + '"'));
    });
  }

  // ===================================================================
  // PATTERN 5: mockui
  // ===================================================================

  function initMockUi(root, cfg) {
    var stage = root.querySelector('[data-demo-stage]');
    var toolbar = root.querySelector('[data-demo-toolbar]');
    if (cfg.kind === 'checklist-timer') return mockChecklistTimer(stage, toolbar, cfg);
    if (cfg.kind === 'timeline-export') return mockTimelineExport(stage, toolbar, cfg);
    if (cfg.kind === 'retention-chart') return mockRetentionChart(stage, toolbar, cfg);
  }

  function mockChecklistTimer(stage, toolbar, cfg) {
    var clock = el('p', 'demo-clock', cfg.budgetLabel);
    stage.appendChild(clock);
    var list = el('ul', 'demo-shot-list');
    var items = cfg.shots.map(function (label) {
      var li = el('li', 'demo-shot-item');
      li.innerHTML = '<span class="demo-shot-check"><svg viewBox="0 0 16 16" fill="none" stroke="var(--accent-ink)" stroke-width="2"><path d="M3 8l3.5 3.5L13 4.5"/></svg></span><span>' + esc(label) + '</span>';
      list.appendChild(li);
      return li;
    });
    stage.appendChild(list);
    var retake = el('p', 'demo-retake-counter', '');
    stage.appendChild(retake);
    var resultMsg = el('p', 'demo-bottom-line', '');
    stage.appendChild(resultMsg);

    function run(mode) {
      items.forEach(function (li) { li.classList.remove('is-done'); });
      retake.textContent = '';
      resultMsg.textContent = '';
      var stepMs = REDUCED ? 0 : 500;
      if (mode === 'planned') {
        staggerReveal(items, stepMs, function (li) { li.classList.add('is-done'); }, function () {
          resultMsg.textContent = cfg.plannedResult;
        });
      } else {
        var retakes = ['re-take 1...', 're-take 1... re-take 2...', 're-take 1... re-take 2... re-take 3...'];
        staggerReveal(retakes, stepMs, function (t) { retake.textContent = t; }, function () {
          items[0].classList.add('is-done');
          setTimeout(function () {
            [items[1], items[2], items[3]].forEach(function (li) { li.classList.add('is-done'); });
            resultMsg.textContent = cfg.overrunResult;
          }, REDUCED ? 0 : stepMs);
        });
      }
    }
    var plannedBtn = btn(cfg.plannedLabel || 'Play as Planned');
    var failBtn = btn(cfg.overrunLabel || 'Play the Chasing-Perfect Failure', 'is-ghost');
    toolbar.appendChild(plannedBtn);
    toolbar.appendChild(failBtn);
    on(plannedBtn, 'click', function () { plannedBtn.classList.add('is-active'); failBtn.classList.remove('is-active'); run('planned'); });
    on(failBtn, 'click', function () { failBtn.classList.add('is-active'); plannedBtn.classList.remove('is-active'); run('overrun'); });
  }

  function mockTimelineExport(stage, toolbar, cfg) {
    var tl = el('div', 'demo-timeline');
    var blocks = cfg.beats.map(function (b) {
      var seg = el('div', 'demo-timeline-seg', esc(b));
      seg.style.flex = '1 1 0';
      tl.appendChild(seg);
      return seg;
    });
    stage.appendChild(tl);
    var phaseCaption = el('p', 'demo-caption', '');
    stage.appendChild(phaseCaption);
    var exportBar = el('div', 'demo-zonebar');
    var exportFill = el('div', 'demo-zone-fill');
    exportFill.style.opacity = '1';
    var exportZone = el('div', 'demo-zone');
    exportZone.style.width = '100%';
    exportZone.appendChild(exportFill);
    exportBar.appendChild(exportZone);
    stage.appendChild(exportBar);
    var resultMsg = el('p', 'demo-bottom-line', '');
    stage.appendChild(resultMsg);

    function run(mode) {
      blocks.forEach(function (b) { b.classList.remove('is-shown'); });
      exportFill.style.transition = 'none';
      exportFill.style.transform = 'scaleX(0)';
      resultMsg.textContent = '';
      phaseCaption.textContent = '';
      void exportBar.offsetWidth;
      var stepMs = REDUCED ? 0 : 350;
      staggerReveal(blocks, stepMs, function (b) { b.classList.add('is-shown'); }, function () {
        if (mode === 'overrun') {
          phaseCaption.textContent = cfg.overrunCaption;
          exportFill.style.transition = REDUCED ? 'none' : 'transform 900ms linear';
          setTimeout(function () { exportFill.style.transform = 'scaleX(0.35)'; }, 30);
          setTimeout(function () { resultMsg.textContent = cfg.overrunResult; resultMsg.style.color = 'var(--warning)'; }, REDUCED ? 0 : 1000);
        } else {
          exportFill.style.transition = REDUCED ? 'none' : 'transform 1200ms linear';
          setTimeout(function () { exportFill.style.transform = 'scaleX(1)'; }, 30);
          setTimeout(function () { resultMsg.textContent = cfg.plannedResult; resultMsg.style.color = ''; }, REDUCED ? 0 : 1300);
        }
      });
    }
    var plannedBtn = btn(cfg.plannedLabel || 'Play as Planned');
    var overrunBtn = btn(cfg.overrunLabel || 'Play the Overrun Failure', 'is-ghost');
    toolbar.appendChild(plannedBtn);
    toolbar.appendChild(overrunBtn);
    on(plannedBtn, 'click', function () { plannedBtn.classList.add('is-active'); overrunBtn.classList.remove('is-active'); run('planned'); });
    on(overrunBtn, 'click', function () { overrunBtn.classList.add('is-active'); plannedBtn.classList.remove('is-active'); run('overrun'); });
  }

  function mockRetentionChart(stage, toolbar, cfg) {
    var wrap = el('div', 'demo-chart-wrap');
    var W = 600, H = 220;
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('class', 'demo-chart-svg');
    var path = document.createElementNS(svgNS, 'path');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'var(--accent)');
    path.setAttribute('stroke-width', '2.5');
    var cursor = document.createElementNS(svgNS, 'line');
    cursor.setAttribute('class', 'demo-chart-cursor-line');
    cursor.setAttribute('y1', '0'); cursor.setAttribute('y2', String(H));
    svg.appendChild(path);
    svg.appendChild(cursor);
    wrap.appendChild(svg);
    stage.appendChild(wrap);
    var tooltip = el('div', 'demo-chart-tooltip', 'Drag across the curve, or use the arrow keys.');
    stage.appendChild(tooltip);

    var curveIdx = 0;
    function pointsFor(curve) {
      return curve.points.map(function (p, i) {
        var x = (p.t / 60) * W;
        var y = H - (p.v / 100) * H;
        return [x, y];
      });
    }
    function buildPath(curve) {
      var pts = pointsFor(curve);
      var d = 'M' + pts[0][0] + ',' + pts[0][1];
      for (var i = 1; i < pts.length; i++) d += ' L' + pts[i][0] + ',' + pts[i][1];
      path.setAttribute('d', d);
    }
    function tooltipFor(curve, tSec) {
      var zone = curve.tooltips.find(function (z) { return tSec >= z.from && tSec <= z.to; });
      return zone ? zone.text : curve.tooltips[curve.tooltips.length - 1].text;
    }
    function setCursor(tSec) {
      var x = (tSec / 60) * W;
      cursor.setAttribute('x1', String(x));
      cursor.setAttribute('x2', String(x));
      tooltip.textContent = tooltipFor(cfg.curves[curveIdx], tSec);
    }
    buildPath(cfg.curves[0]);
    setCursor(3);

    function pctFromEvent(e) {
      var rect = svg.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      return Math.max(0, Math.min(60, (x / rect.width) * 60));
    }
    var dragging = false;
    on(svg, 'pointerdown', function (e) { dragging = true; setCursor(pctFromEvent(e)); });
    on(window, 'pointermove', function (e) { if (dragging) setCursor(pctFromEvent(e)); });
    on(window, 'pointerup', function () { dragging = false; });
    svg.tabIndex = 0;
    on(svg, 'keydown', function (e) {
      var cur = parseFloat(cursor.getAttribute('x1')) / W * 60;
      if (e.key === 'ArrowLeft') setCursor(Math.max(0, cur - 2));
      if (e.key === 'ArrowRight') setCursor(Math.min(60, cur + 2));
    });

    var swapBtn = btn(cfg.swapLabel || 'Load Example B');
    toolbar.appendChild(swapBtn);
    on(swapBtn, 'click', function () {
      curveIdx = curveIdx === 0 ? 1 : 0;
      swapBtn.textContent = curveIdx === 0 ? (cfg.swapLabel || 'Load Example B') : (cfg.swapBackLabel || 'Back to Example A');
      buildPath(cfg.curves[curveIdx]);
      setCursor(3);
    });
  }

  // ===================================================================
  // bootstrap
  // ===================================================================

  var INIT = { reveal: initReveal, compare: initCompare, zones: initZones, panels: initPanels, mockui: initMockUi };

  function hydrateOne(root) {
    var cfgEl = root.querySelector('script[data-demo-config]');
    if (!cfgEl) return;
    var cfg;
    try { cfg = JSON.parse(cfgEl.textContent); } catch (e) { return; }
    var pattern = root.getAttribute('data-demo-pattern');
    var fn = INIT[pattern];
    if (fn) fn(root, cfg);
  }

  ready(function () {
    var roots = document.querySelectorAll('[data-demo-pattern]');
    roots.forEach(hydrateOne);
  });

  window.SFDemos = { reducedMotion: REDUCED, hydrateOne: hydrateOne };
})();
