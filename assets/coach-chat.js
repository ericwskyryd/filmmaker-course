/* ===================== Creator Reps: AI Coach chat panel ===================== */
/* Hydrates every [data-coach-panel] on a lesson page. Reads the embedded
   per-lesson JSON config (objective/checklist/track/lesson number), posts to
   window.SF_COACH_URL + "/coach" with a Firebase ID token, and renders the
   reply into an in-memory-only thread (no storage, resets on page load).
   assets/coach-config.js sets window.SF_COACH_URL; an empty string keeps the
   panel in its baked-in disabled "coming online soon" state -- nothing here
   needs to change when the backend goes live, only that one config value. */
(function () {
  'use strict';

  var MAX_VIDEO_BYTES = 15 * 1024 * 1024;
  var HISTORY_LIMIT = 8;

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Plain text in, safe HTML out: escape first, then turn newlines into <br>
  // so a pasted multi-line drill transcript keeps its line breaks.
  function renderText(str) {
    return escapeHtml(str == null ? '' : str).replace(/\n/g, '<br>');
  }

  function readFileAsBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = reader.result || '';
        var comma = String(result).indexOf(',');
        resolve(comma !== -1 ? result.slice(comma + 1) : result);
      };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsDataURL(file);
    });
  }

  function getIdToken() {
    try {
      if (window.SFAuth && typeof window.SFAuth.getIdToken === 'function') {
        return Promise.resolve(window.SFAuth.getIdToken()).catch(function () { return null; });
      }
    } catch (e) { /* fall through */ }
    return Promise.resolve(null);
  }

  function initPanel(panel) {
    var cfgEl = panel.querySelector('script[data-coach-lesson]');
    var cfg = null;
    try { cfg = cfgEl ? JSON.parse(cfgEl.textContent) : null; } catch (e) { cfg = null; }
    if (!cfg) return;

    var thread = panel.querySelector('[data-coach-thread]');
    var emptyState = panel.querySelector('[data-coach-empty]');
    var typing = panel.querySelector('[data-coach-typing]');
    var form = panel.querySelector('[data-coach-form]');
    var textarea = panel.querySelector('[data-coach-textarea]');
    var sendBtn = panel.querySelector('[data-coach-send]');
    var remainingEl = panel.querySelector('[data-coach-remaining]');
    var errorNote = panel.querySelector('[data-coach-error-note]');
    var fileRow = panel.querySelector('[data-coach-file-row]');
    var fileInput = panel.querySelector('[data-coach-file-input]');
    var fileLabel = panel.querySelector('[data-coach-file-label]');
    var fileError = panel.querySelector('[data-coach-file-error]');
    if (!thread || !form || !textarea || !sendBtn) return;

    var fileLabelDefault = fileLabel ? fileLabel.textContent : 'Attach your clip';
    var emptyAvatarHtml = '';
    var emptyAvatarEl = emptyState ? emptyState.querySelector('.coach-avatar-sm') : null;
    if (emptyAvatarEl) emptyAvatarHtml = emptyAvatarEl.innerHTML;

    var coachUrl = String(window.SF_COACH_URL || '').trim();
    var online = !!coachUrl;
    var busy = false;
    var pendingVideo = null; // { base64, mimeType, name }
    var history = []; // full running list, sliced to last HISTORY_LIMIT per request

    panel.setAttribute('data-coach-state', online ? 'ready' : 'offline');
    if (online) {
      textarea.disabled = false;
      sendBtn.disabled = false;
      if (fileInput) fileInput.disabled = false;
      if (fileRow) fileRow.classList.remove('is-disabled');
    }

    function setError(msg) {
      if (!errorNote) return;
      if (msg) { errorNote.textContent = msg; errorNote.classList.add('is-visible'); }
      else { errorNote.textContent = ''; errorNote.classList.remove('is-visible'); }
    }

    function setFileError(msg) {
      if (!fileError) return;
      if (msg) { fileError.textContent = msg; fileError.classList.add('is-visible'); }
      else { fileError.textContent = ''; fileError.classList.remove('is-visible'); }
    }

    function clearAttachedFile() {
      pendingVideo = null;
      if (fileInput) fileInput.value = '';
      if (fileLabel) fileLabel.textContent = fileLabelDefault;
    }

    function appendMessage(role, text) {
      if (emptyState) emptyState.style.display = 'none';
      var row = document.createElement('div');
      row.className = 'coach-msg ' + (role === 'user' ? 'coach-msg-user' : 'coach-msg-coach');
      if (role === 'coach') {
        var av = document.createElement('div');
        av.className = 'coach-avatar-sm';
        av.innerHTML = emptyAvatarHtml;
        row.appendChild(av);
      }
      var bubble = document.createElement('div');
      bubble.className = 'coach-msg-bubble';
      bubble.innerHTML = renderText(text);
      row.appendChild(bubble);
      thread.appendChild(row);
      thread.scrollTop = thread.scrollHeight;
    }

    function setBusy(b) {
      busy = b;
      sendBtn.disabled = b || !online;
      textarea.disabled = b || !online;
      if (fileInput) fileInput.disabled = b || !online;
      if (fileRow) fileRow.classList.toggle('is-disabled', b || !online);
      if (typing) typing.hidden = !b;
      if (b) thread.scrollTop = thread.scrollHeight;
    }

    function pluralize(n, singular, plural) {
      return n + ' ' + (n === 1 ? singular : (plural || singular + 's'));
    }

    function updateRemaining(remaining) {
      if (!remainingEl) return;
      if (!remaining || typeof remaining !== 'object') { remainingEl.textContent = ''; return; }
      var parts = [];
      if (typeof remaining.text === 'number') parts.push(pluralize(remaining.text, 'text reply', 'text replies') + ' left today');
      if (cfg.allowVideo && typeof remaining.video === 'number') parts.push(pluralize(remaining.video, 'clip review') + ' left today');
      remainingEl.textContent = parts.join(' · ');
    }

    if (fileInput) {
      fileInput.addEventListener('change', function () {
        setFileError('');
        var file = fileInput.files && fileInput.files[0];
        if (!file) { clearAttachedFile(); return; }
        if (file.size > MAX_VIDEO_BYTES) {
          setFileError('Trim to the drill length or lower the resolution, then try again.');
          clearAttachedFile();
          return;
        }
        if (fileLabel) fileLabel.textContent = file.name;
        readFileAsBase64(file).then(function (base64) {
          pendingVideo = { base64: base64, mimeType: file.type || 'video/mp4', name: file.name };
        }).catch(function () {
          setFileError('Could not read that file. Try a different export.');
          clearAttachedFile();
        });
      });
    }

    function sendToCoach(userMessage, video, historyForRequest) {
      var payload = {
        mode: video ? 'video' : 'text',
        track: cfg.track,
        lessonN: cfg.lessonN,
        lessonTitle: cfg.lessonTitle,
        objective: cfg.objective,
        checklist: cfg.checklist,
        userMessage: userMessage,
        history: historyForRequest,
      };
      if (video) payload.video = { base64: video.base64, mimeType: video.mimeType };

      setBusy(true);

      getIdToken().then(function (token) {
        var headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        return fetch(coachUrl.replace(/\/$/, '') + '/coach', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload),
        });
      }).then(function (res) {
        if (res.status === 429) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            var err = new Error('rate-limited');
            err.friendly = (body && body.message) || 'You have used today’s coaching limit. It resets tomorrow, and your drill work up to this point still counts.';
            throw err;
          });
        }
        if (!res.ok) {
          var err2 = new Error('coach-http-' + res.status);
          err2.friendly = 'Coach is unreachable right now. Your drill still counts, check yourself against the list above and retry later.';
          throw err2;
        }
        return res.json();
      }).then(function (data) {
        setBusy(false);
        var reply = (data && data.reply) || 'No reply came back. Check yourself against the list above and retry later.';
        appendMessage('coach', reply);
        history.push({ role: 'coach', text: reply });
        updateRemaining(data && data.remaining);
      }).catch(function (err) {
        setBusy(false);
        setError((err && err.friendly) || 'Coach is unreachable right now. Your drill still counts, check yourself against the list above and retry later.');
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy || !online) return;
      var text = (textarea.value || '').trim();
      var video = pendingVideo;
      if (!text && !video) return;

      setError('');
      appendMessage('user', text || 'Sent a clip for review.');
      // Snapshot history (prior turns only) before this message joins it, so
      // the backend never sees the current userMessage duplicated inside history.
      var historyForRequest = history.slice(-HISTORY_LIMIT);
      history.push({ role: 'user', text: text || '(clip attached, no message)' });

      textarea.value = '';
      clearAttachedFile();

      sendToCoach(text, video, historyForRequest);
    });
  }

  ready(function () {
    var panels = document.querySelectorAll('[data-coach-panel]');
    Array.prototype.forEach.call(panels, initPanel);
  });
})();
