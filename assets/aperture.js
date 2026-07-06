/* ===================== Creator Reps: Aperture Ring (the one signature element) =====================
   Single source of truth for every iris/aperture rendering in the product: the
   sidebar brand mark, the gate mark, the coach avatar, and every progress ring
   (hub academy ring, hub track-card rings, dashboard continue-card ring,
   statusbar rings on dashboards + lesson pages). One geometry function, called
   two ways:
     - Node build time (site/build/templates.mjs, CommonJS require via
       createRequire): renders the static, non-progress brand/gate/coach mark
       at a fixed "pleasing openness" baked into the generated HTML.
     - Browser runtime (assets/progress.js, plain <script> global): renders
       the live progress rings, re-drawn any time progress.js recomputes a
       track's or the academy's completion fraction.
   Loaded as a plain global script in the browser (window.SFAperture) and as a
   CommonJS module in Node (module.exports) -- same file, same function, no
   drift between the two.

   Geometry: real overlapping iris-blade wedges, not a segmented donut chart.
   Each blade has a FIXED straight trailing edge (its hinge, anchored on the
   rim) and a LEADING edge that sweeps clockwise and bows into a curve as
   progress advances. All blades move together, in sync, overlapping their
   neighbor once progress is underway -- unlike a donut chart's segments,
   which are exclusive and fill one at a time.

   A camera iris shows its blades at every f-stop, including wide open --
   that's what makes it read as a mechanism instead of a ring of segments.
   So every blade is drawn TWICE at 32px and up: a fixed-size "resting" wedge
   (dim, same hue as the accent so it reads as quiet metal, never generic
   grey) that is always present regardless of progress, giving the motif its
   overlap and swirl even at 0%; and, on top, the progress-driven "active"
   wedge in full amber, sized by `sweep` exactly as before. At progress 0 the
   active wedge has zero size, so only the dim resting blades show -- an iris
   at a pleasing middle f-stop, not a bare housing ring. As progress advances
   the amber wedge grows and overtakes the resting one from the hinge
   outward, so the part of each blade progress hasn't reached yet still
   reads as dim blade, never empty track. At progress 1 the amber sweep has
   overtaken every neighbor's start angle, so the band closes solid all the
   way around, an iris-out, exactly as before. Under 32px the resting layer
   is skipped entirely (kept as the sanctioned simplified ring) -- blade
   overlap is a texture that turns to mud below that size, so we don't force
   it. */
(function () {
  'use strict';

  var DEG2RAD = Math.PI / 180;

  function polar(cx, cy, r, angleDeg) {
    var rad = angleDeg * DEG2RAD;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  }

  // Trim float noise so path strings stay short and diff-friendly.
  function n(v) { return Math.round(v * 100) / 100; }

  function escapeXml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function bladePath(cx, cy, rOuter, rInner, baseAngle, sweepDeg, bow) {
    var leadAngle = baseAngle + sweepDeg;
    var pOuterBase = polar(cx, cy, rOuter, baseAngle);
    var pOuterLead = polar(cx, cy, rOuter, leadAngle);
    var pInnerLead = polar(cx, cy, rInner, leadAngle);
    var pInnerBase = polar(cx, cy, rInner, baseAngle);
    // The leading edge bows toward a point partway around the sweep at the
    // band's mid-radius, giving the blade a gentle scythe curve instead of a
    // flat radial line -- the detail that reads as "blade" and not "wedge."
    var bowPoint = polar(cx, cy, (rOuter + rInner) / 2, baseAngle + sweepDeg * bow);
    var largeArc = sweepDeg > 180 ? 1 : 0;
    return 'M ' + n(pOuterBase[0]) + ' ' + n(pOuterBase[1]) +
      ' A ' + rOuter + ' ' + rOuter + ' 0 ' + largeArc + ' 1 ' + n(pOuterLead[0]) + ' ' + n(pOuterLead[1]) +
      (bow > 0
        ? ' Q ' + n(bowPoint[0]) + ' ' + n(bowPoint[1]) + ' ' + n(pInnerLead[0]) + ' ' + n(pInnerLead[1])
        : ' L ' + n(pInnerLead[0]) + ' ' + n(pInnerLead[1])) +
      ' A ' + rInner + ' ' + rInner + ' 0 ' + largeArc + ' 0 ' + n(pInnerBase[0]) + ' ' + n(pInnerBase[1]) +
      ' Z';
  }

  // opts: size (px, drives hairline stroke scale + the simplified threshold),
  // progress (0-1), label (string, omit for no numeral), labelSize, blades
  // (override), simplified (override; default size<32), holeColor,
  // className (added to the root <svg>, for the static brand/gate/coach mark).
  function buildApertureMarkup(opts) {
    opts = opts || {};
    var size = opts.size || 44;
    var progress = Math.max(0, Math.min(1, opts.progress || 0));
    var hasLabel = opts.label !== undefined && opts.label !== null && opts.label !== '';
    var labelSize = opts.labelSize || 16;
    var simplified = typeof opts.simplified === 'boolean' ? opts.simplified : size < 32;
    var blades = opts.blades || (simplified ? 5 : 8);
    var overlap = simplified ? 1.55 : 1.35; // how far the leading edge overtakes the next blade's start
    // Curve/seam detail is a function of rendered size, not blade count: a
    // fixed-openness mark can be "simplified" (fewer, wider blades, for
    // legibility down to 24px) while still earning the curved scythe edge
    // once it's rendered at 32px or up, where a curve reads as a blade
    // instead of aliasing into noise.
    var bow = size < 32 ? 0 : 0.5;

    var cx = 50, cy = 50, rOuter = 47;
    var rInner = hasLabel ? 29 : 34;
    var step = 360 / blades;
    var sweep = step * overlap * progress;

    // Resting-blade layer: a fixed sweep, independent of progress, that puts
    // every blade at a pleasing middle f-stop so the iris reads as a
    // mechanism at rest instead of an empty ring. Tuned so neighbors overlap
    // with a thin sliver of housing between them (the "swirl"), not a wide
    // gap (that reads as a segmented donut) and not full closure (that
    // reads as 100% complete when it isn't). Skipped under 32px: blade
    // overlap is too fine a texture to read at icon scale, so those sizes
    // keep the plain simplified ring instead of a muddy approximation.
    var showResting = size >= 32;
    var restSweep = step * (simplified ? 0.85 : 0.8);

    // Hairline strokes sized in viewBox units so they read as a consistent
    // ~1px regardless of the instance's actual pixel size -- a fixed unit
    // value goes invisible at 16px and looks heavy at 120px. Seam strokes
    // between amber blades are a size call too, same reasoning as bow: a
    // fixed mark earns them once it's rendered large enough to read as
    // separate overlapping blades rather than a busy outline.
    var housingStroke = Math.max(0.8, 100 / size);
    var seamStroke = size < 32 ? 0 : Math.max(0.3, 45 / size);
    var restStroke = Math.max(0.3, 60 / size);

    var svg = '<svg viewBox="0 0 100 100" width="100%" height="100%" fill="none"' +
      (opts.className ? ' class="' + opts.className + '"' : '') + '>';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + n(rOuter + 1.5) + '" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="' + n(housingStroke) + '"/>';

    if (showResting) {
      for (var r = 0; r < blades; r++) {
        var restBaseAngle = -90 + r * step;
        var restD = bladePath(cx, cy, rOuter, rInner, restBaseAngle, restSweep, bow);
        var restFill = r % 2 === 0 ? 'rgba(232,163,61,0.24)' : 'rgba(229,165,68,0.19)';
        svg += '<path d="' + restD + '" fill="' + restFill + '" stroke="rgba(232,163,61,0.16)" stroke-width="' + n(restStroke) + '" class="ap-blade-rest"/>';
      }
    }

    for (var i = 0; i < blades; i++) {
      if (progress <= 0) break;
      var baseAngle = -90 + i * step;
      var d = bladePath(cx, cy, rOuter, rInner, baseAngle, sweep, bow);
      var fill = simplified ? '#E8A33D' : (i % 2 === 0 ? '#E8A33D' : '#E5A544');
      svg += '<path d="' + d + '" fill="' + fill + '"' +
        (seamStroke ? ' stroke="rgba(11,15,18,0.35)" stroke-width="' + n(seamStroke) + '"' : '') +
        ' class="ap-blade-amber"/>';
    }

    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + n(rInner - 1) + '" fill="' + (opts.holeColor || '#0B0F12') + '"/>';

    if (hasLabel) {
      svg += '<text x="' + cx + '" y="' + n(cy + 5) + '" text-anchor="middle" font-family="&apos;IBM Plex Mono&apos;, monospace" font-size="' + labelSize + '" font-weight="600" fill="#F2EFE9">' + escapeXml(opts.label) + '</text>';
    }
    svg += '</svg>';
    return svg;
  }

  // Browser-side hydration helper: reads size + progress off the live
  // element (data-progress/data-label set by assets/progress.js) and draws.
  function buildAperture(el, overrides) {
    var rect = el.getBoundingClientRect();
    var cssSize = parseFloat((el.style && el.style.getPropertyValue('--ap-size')) || '');
    var size = (overrides && overrides.size) || rect.width || cssSize || 44;
    var progress = Math.max(0, Math.min(1, parseFloat(el.dataset.progress) || 0));
    var opts = {
      size: size,
      progress: progress,
      label: el.dataset.label !== undefined ? el.dataset.label : undefined,
      labelSize: el.dataset.labelSize ? parseFloat(el.dataset.labelSize) : undefined,
      holeColor: el.dataset.holeColor,
    };
    if (overrides) { for (var k in overrides) { if (Object.prototype.hasOwnProperty.call(overrides, k)) opts[k] = overrides[k]; } }
    el.innerHTML = buildApertureMarkup(opts);
  }

  var api = { buildApertureMarkup: buildApertureMarkup, buildAperture: buildAperture };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  if (typeof window !== 'undefined') { window.SFAperture = api; }
})();
