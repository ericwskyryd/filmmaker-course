// ===================== Creator Reps: content parsing + text helpers =====================
// Pure functions: markdown-ish text in, structured data / HTML strings out.
// No DOM, no network. Designed to be re-run any time content/*.md changes.

// ---------- text pipeline ----------

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Convert **bold** markdown (already HTML-escaped text) into <strong> tags.
export function boldify(str) {
  return str.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

// Lightweight contextual smart-quote + em dash cleanup.
// Straight quotes -> curly. Em dashes -> middot (house style: no em dashes in shipped copy).
export function typography(str) {
  let s = String(str);
  // em dash (with or without surrounding spaces) -> middot separator
  s = s.replace(/\s*—\s*/g, ' &middot; ');
  s = s.replace(/\s*--\s*/g, ' &middot; ');
  // double quotes: opening after start/whitespace/open-punct, else closing
  s = s.replace(/(^|[\s(\[{])"/g, '$1“');
  s = s.replace(/"/g, '”');
  // single quotes: opening after start/whitespace/open-punct followed by a non-space, else apostrophe/closing
  s = s.replace(/(^|[\s(\[{])'(?=\S)/g, '$1‘');
  s = s.replace(/'/g, '’');
  return s;
}

// Full pipeline for a chunk of prose text pulled from markdown: escape, bold, typography.
export function renderInline(str) {
  return typography(boldify(escapeHtml(String(str).trim())));
}

// Join a markdown paragraph's soft-wrapped lines into one line before inline rendering.
export function joinLines(str) {
  return String(str).replace(/\s*\n\s*/g, ' ').trim();
}

export function paragraphs(block) {
  return String(block)
    .split(/\n\s*\n/)
    .map((p) => joinLines(p))
    .filter(Boolean);
}

// Same blank-line paragraph split, but keeps internal newlines intact.
// Needed anywhere a field-extraction regex relies on line boundaries
// (e.g. video-picks "Length:" / "Channel:" fields on their own line).
export function rawParagraphs(block) {
  return String(block)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function renderParagraphs(block) {
  return paragraphs(block)
    .map((p) => `<p>${renderInline(p)}</p>`)
    .join('\n');
}

export function pad2(n) {
  return String(n).padStart(2, '0');
}

// ---------- generic markdown section splitter ----------
// Splits a lesson markdown body into { "Header Name": "raw content" } keyed by H2 text.
export function splitSections(md) {
  const lines = md.split('\n');
  const sections = {};
  let current = null;
  let buf = [];
  const flush = () => {
    if (current) sections[current] = buf.join('\n').trim();
    buf = [];
  };
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      flush();
      current = m[1].trim();
    } else if (current) {
      buf.push(line);
    }
  }
  flush();
  return sections;
}

// ---------- track overview parsing ----------

export function parseTrackOverview(md, fallbackSlug) {
  const h1 = md.match(/^#\s+(.+?):\s*Course Overview\s*$/m);
  const trackTitle = h1 ? h1[1].trim() : fallbackSlug;

  // Intro paragraphs: everything between the H1 and the first "## " header.
  const afterH1 = h1 ? md.slice(md.indexOf(h1[0]) + h1[0].length) : md;
  const introEnd = afterH1.search(/\n##\s+/);
  const introBlock = introEnd === -1 ? afterH1 : afterH1.slice(0, introEnd);
  const introParas = paragraphs(introBlock);
  const firstPara = introParas[0] || '';
  const sentenceMatch = firstPara.match(/^(.+?[.!?])(\s|$)/);
  const tagline = sentenceMatch ? sentenceMatch[1] : firstPara;

  const sections = splitSections(md);

  // Modules
  const modulesHeaderKey = Object.keys(sections).find((k) => /^The .* Modules$/i.test(k));
  const modules = [];
  if (modulesHeaderKey) {
    const moduleLineRe = /^-\s*\*\*Module\s+(\d+),\s*([^*]+?)\*\*\s*\(Lessons?\s+(\d+)(?:\s*(?:to|-|–)\s*(\d+))?\)\s*:\s*(.+)$/;
    sections[modulesHeaderKey].split('\n').forEach((line) => {
      const m = line.trim().match(moduleLineRe);
      if (m) {
        modules.push({
          n: parseInt(m[1], 10),
          name: m[2].trim(),
          lessonStart: parseInt(m[3], 10),
          lessonEnd: m[4] ? parseInt(m[4], 10) : parseInt(m[3], 10),
          description: joinLines(m[5]),
        });
      }
    });
  }

  // How to use this course/track
  const howtoHeaderKey = Object.keys(sections).find((k) => /^How to Use This (Course|Track)$/i.test(k));
  const howto = [];
  if (howtoHeaderKey) {
    paragraphs(sections[howtoHeaderKey]).forEach((p) => {
      const m = p.match(/^\*\*(.+?)\*\*\s*(.*)$/);
      if (!m) return;
      const boldText = m[1].trim();
      const rest = m[2].trim();
      const wordCount = boldText.split(/\s+/).length;
      howto.push({
        shortLabel: wordCount <= 6,
        label: boldText.replace(/:$/, ''),
        body: rest,
      });
    });
  }

  return { trackTitle, tagline, taglineFull: firstPara, modules, howto };
}

// ---------- lesson parsing ----------

export function parseLesson(md, lessonNum) {
  const h1 = md.match(/^#\s+Lesson\s+\d+:\s*(.+?)\s*$/m);
  const title = h1 ? h1[1].trim() : `Lesson ${lessonNum}`;

  const moduleLine = md.match(/^\*\*Module:\*\*\s*Module\s+(\d+),\s*(.+?)\s*$/m);
  const moduleNum = moduleLine ? parseInt(moduleLine[1], 10) : 1;
  const moduleName = moduleLine ? moduleLine[2].trim() : '';

  const sections = splitSections(md);

  // Objective
  const objectiveRaw = sections['Objective'] || '';
  const objective = { behavior: '', condition: '', criterion: '' };
  objectiveRaw.split('\n').forEach((line) => {
    const m = line.trim().match(/^-\s*\*\*(Behavior|Condition|Criterion):\*\*\s*(.+)$/);
    if (m) objective[m[1].toLowerCase()] = joinLines(m[2]);
  });

  const whyMatters = sections['Why This Matters'] || '';
  const technique = sections['The Technique'] || '';

  // Watch For This
  const watchRaw = sections['Watch For This'] || '';
  const watchGood = [];
  const watchFail = [];
  {
    const failIdx = watchRaw.search(/\*\*Classic Failure:\*\*/i);
    const goodBlock = failIdx === -1 ? watchRaw : watchRaw.slice(0, failIdx);
    const failBlock = failIdx === -1 ? '' : watchRaw.slice(failIdx);
    const bulletRe = /^-\s*(.+)$/gm;
    let m;
    while ((m = bulletRe.exec(goodBlock))) watchGood.push(joinLines(m[1]));
    bulletRe.lastIndex = 0;
    while ((m = bulletRe.exec(failBlock))) watchFail.push(joinLines(m[1]));
  }

  const drill = sections['Your Drill'] || '';

  // Pass Checklist
  const checklistRaw = sections['Pass Checklist'] || '';
  const checklist = [];
  checklistRaw.split('\n').forEach((line) => {
    const m = line.trim().match(/^-\s*\[\s*\]\s*(.+)$/);
    if (m) checklist.push(joinLines(m[1]));
  });

  const coachNote = sections['Coach Note'] || '';
  const resurfacesRaw = joinLines(sections['Resurfaces In'] || '');
  const videoSlot = joinLines(sections['Video Slot'] || '');

  return {
    n: lessonNum,
    title,
    moduleNum,
    moduleName,
    objective,
    whyMatters,
    technique,
    watchGood,
    watchFail,
    drill,
    checklist,
    coachNote,
    resurfacesRaw,
    videoSlot,
  };
}

// Links "Lesson N" mentions to this track's own lesson pages. A capstone lesson
// sometimes references a lesson number in ANOTHER track as a hand-off (e.g.
// scriptwriting's capstone points to Smartphone Filmmaker Lesson 12/14) -- those
// numbers don't exist as pages in this track, so leave them as plain text rather
// than link to a 404.
export function renderResurfaces(resurfacesRaw, trackTotalLessons) {
  const text = renderInline(resurfacesRaw);
  return text.replace(/Lesson (\d+)/g, (whole, n) => {
    const num = parseInt(n, 10);
    if (num < 1 || num > trackTotalLessons) return whole;
    return `<a href="lesson-${pad2(num)}.html">Lesson ${n}</a>`;
  });
}

// ---------- video picks parsing ----------

const URL_RE = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/;
const VETO_RE = /not a real substitute|not a substitute|checked and rejected|too dated to recommend|listed only|supplementary reference only|offered as a supplementary reference|closest available analog/i;
const GAP_HINT_RE = /no verified|not going to pretend|no strong|^gap\b|gap flag|gap note|gap:|recommend (skipping|building)/i;

function formatSec(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${pad2(s)}`;
}

function timeToSec(str) {
  const parts = str.split(':').map((x) => parseInt(x, 10));
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function parseEntry(paragraphText) {
  const urlMatch = paragraphText.match(URL_RE);
  if (!urlMatch) return null;
  const videoId = urlMatch[1];

  const titleMatch = paragraphText.match(/\*\*"?(.*?)"?\*\*/);
  const title = titleMatch ? joinLines(titleMatch[1]) : 'Demonstration video';

  // Channel: explicit "Channel:" field, else em-dash-appended on the title's own line.
  let channel = '';
  const chanFieldMatch = paragraphText.match(/Channel:\s*([^\n|]+?)(?:\s*\||\n|$)/i);
  if (chanFieldMatch) {
    channel = chanFieldMatch[1].trim();
  } else if (titleMatch) {
    const titleLine = paragraphText.split('\n').find((l) => l.includes(titleMatch[0]));
    const dashMatch = titleLine && titleLine.match(/\*\*.*?\*\*\s*[—-]\s*(.+)$/);
    if (dashMatch) channel = dashMatch[1].trim();
  }

  const lengthFieldMatch = paragraphText.match(/Length:\s*([^\n]+)/i);
  const lengthRaw = lengthFieldMatch ? lengthFieldMatch[1].trim() : '';
  const totalLenMatch = lengthRaw.match(/^(\d{1,2}:\d{2})/);
  const totalLen = totalLenMatch ? totalLenMatch[1] : '';

  // Clean timestamp range, searched across the whole entry text (Length line, Timestamp line, etc).
  const rangeMatch = paragraphText.match(/(\d{1,2}:\d{2})\s*(?:to|–|-)\s*(\d{1,2}:\d{2})/);
  let startSec = null;
  let endSec = null;
  if (rangeMatch) {
    startSec = timeToSec(rangeMatch[1]);
    endSec = timeToSec(rangeMatch[2]);
    if (endSec !== null && startSec !== null && endSec <= startSec) {
      startSec = null;
      endSec = null;
    }
  }

  const fitMatch = paragraphText.match(/(?:Why it fits|Fit)\s*:\s*([\s\S]+)$/i);
  const why = fitMatch ? joinLines(fitMatch[1]) : '';

  return {
    videoId,
    title,
    channel,
    totalLen,
    rangeDisplay: startSec !== null ? `${formatSec(startSec)}–${formatSec(endSec)}` : '',
    startSec,
    endSec,
    why,
  };
}

// Returns Map<lessonNum, { gap:boolean, gapText:string, entries:[...] }>
export function parseVideoPicks(md) {
  const result = new Map();
  const headerRe = /^##\s+Lesson\s+(\d+)\b.*$/gm;
  const matches = [...md.matchAll(headerRe)];
  for (let i = 0; i < matches.length; i++) {
    const lessonNum = parseInt(matches[i][1], 10);
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : md.length;
    const block = md.slice(start, end);
    const paras = rawParagraphs(block);

    // A veto sentence sometimes sits in its own lead-in paragraph immediately
    // before the entry it disqualifies (e.g. "Closest available analog, offered
    // as a supplementary reference only, not a substitute for the slot:" on its
    // own line, then a blank line, then the numbered pick). Check both the
    // entry's own paragraph AND the paragraph right before it.
    const candidateParas = paras.filter((p, idx) => {
      if (!URL_RE.test(p)) return false;
      if (VETO_RE.test(p)) return false;
      const prev = paras[idx - 1];
      if (prev && VETO_RE.test(prev) && !URL_RE.test(prev)) return false;
      return true;
    });
    const entries = candidateParas.slice(0, 2).map(parseEntry).filter(Boolean);

    if (entries.length === 0) {
      let gapPara = paras.find((p) => GAP_HINT_RE.test(p) && !URL_RE.test(p));
      if (!gapPara) gapPara = paras.find((p) => GAP_HINT_RE.test(p));
      let gapText;
      if (gapPara) {
        const gapParaFlat = joinLines(gapPara);
        const sentences = gapParaFlat.match(/[^.!?]+[.!?]+/g) || [gapParaFlat];
        gapText = renderInline(sentences.slice(0, 2).join(' ').trim());
      } else {
        gapText = 'No demo video meets the bar for this one; the technique section carries it.';
      }
      result.set(lessonNum, { gap: true, gapText, entries: [] });
    } else {
      result.set(lessonNum, { gap: false, gapText: '', entries });
    }
  }
  return result;
}
