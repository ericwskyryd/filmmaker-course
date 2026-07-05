export default {
  track: "ai-creator",
  demos: {
    "lesson-06": {
      pattern: "reveal",
      title: "Which Skill Made This Shot",
      config: {
        kind: "stagger",
        variant: "sequence-player",
        slotLabels: ["Establishing", "Medium", "Close"],
        playLabel: "Play Sequence",
        breakLabel: "Show the Break Instead",
        sequence: [
          {
            text: "A woman in a red jacket walks into a workshop, wide shot.",
            caption: "Anchor Consistency (Lesson 3): same locked reference image reused across all three generations.",
            tone: "good"
          },
          {
            text: "Same woman, medium shot, picks up a tool from the workbench.",
            caption: "Shot Planning (Lesson 4): one action, one camera move, no overload.",
            tone: "good"
          },
          {
            text: "Same woman, close-up, examines the tool with a satisfied nod.",
            caption: "Motion Direction (Lesson 5): motion-only prompt, identity held.",
            tone: "good"
          }
        ],
        breakSequence: [
          {
            text: "A woman in a red jacket walks into a workshop, wide shot.",
            caption: "Anchor Consistency (Lesson 3): same locked reference image reused across all three generations.",
            tone: "good"
          },
          {
            text: "A visibly different woman, different jacket color and styling, medium shot, picks up a tool from the workbench.",
            caption: "Anchor wasn't reused here. Character look changed mid-sequence. This is the single most common way this drill fails.",
            tone: "bad"
          },
          {
            text: "Same woman as Shot 1, close-up, examines the tool with a satisfied nod.",
            caption: "Motion Direction (Lesson 5): motion-only prompt, identity held.",
            tone: "good"
          }
        ]
      }
    },
    "lesson-09": {
      pattern: "reveal",
      title: "Same Line, Two Takes, Four Criteria",
      config: {
        kind: "word",
        tracks: [
          {
            label: "Take A",
            panelLabel: "Take A (fast, even spacing, no pauses)",
            buttonLabel: "Play Take A",
            text: "In twenty seconds, I'll show you the framing mistake that's killing your close rate.",
            durationMs: 3600,
            stopwatch: false,
            endTone: "bad",
            trailing: {
              scorecardRows: [
                {
                  label: "Pacing and pauses",
                  badge: "FAIL",
                  reason: "No pause before the number or after the key word, it reads flat and rushed."
                },
                {
                  label: "Emphasis",
                  badge: "FAIL",
                  reason: "Every word gets equal weight, 'framing mistake' and 'close rate' don't land any harder than 'the' or 'show.'"
                },
                {
                  label: "Pronunciation",
                  badge: "PASS",
                  reason: "Every word is clean and correctly stressed."
                },
                {
                  label: "Tone",
                  badge: "FAIL",
                  reason: "Reads instructional-neutral, not the confident, slightly urgent tone the line is written for."
                }
              ],
              verdict: "Verdict: Reject. Route to a human read or try a different voice setting."
            }
          },
          {
            label: "Take B",
            panelLabel: "Take B (natural pauses, key words held longer)",
            buttonLabel: "Play Take B",
            text: "In twenty seconds, I'll show you the framing mistake that's killing your close rate.",
            durationMs: 6400,
            stopwatch: false,
            endTone: "good",
            trailing: {
              scorecardRows: [
                {
                  label: "Pacing and pauses",
                  badge: "PASS",
                  reason: "A natural half-beat lands before the number and before the payoff, exactly where a person would breathe."
                },
                {
                  label: "Emphasis",
                  badge: "PASS",
                  reason: "'Framing mistake' and 'close rate' get audible weight, the two words that actually matter in the sentence."
                },
                {
                  label: "Pronunciation",
                  badge: "PASS",
                  reason: "Clean throughout."
                },
                {
                  label: "Tone",
                  badge: "PASS",
                  reason: "Confident, slightly urgent, matches the script's intent."
                }
              ],
              verdict: "Verdict: Accept as-is."
            }
          }
        ]
      }
    },
    "lesson-10": {
      pattern: "panels",
      title: "The Tracked-Edit Pass",
      config: {
        kind: "tracked-edit",
        rawText: "In today's fast-paced world, content creators are unlocking their potential by using AI tools to grow their channels faster than ever, with some creators reporting 10x growth in just weeks.",
        editedText: "Most 'AI grew my channel 10x' claims fall apart the second you ask what the baseline was. Here's what actually changed when I added AI tools to my workflow, and what didn't.",
        cosmeticText: "In today's fast-paced world, content creators are unlocking their potential using AI tools, growing their channels faster than ever, with some reporting rapid growth in weeks.",
        toggleLabel: "Show Cosmetic-Only Version",
        edits: [
          {
            span: "unlocking their potential",
            type: "Generic-Phrasing Cut",
            explanation: "'In today's fast-paced world' and 'unlocking their potential' cut entirely, replaced with a direct claim. Nobody talks like that, and it reads like every other AI draft."
          },
          {
            span: "some creators reporting 10x growth in just weeks",
            type: "Fact Correction",
            explanation: "'Some creators reporting 10x growth in just weeks' was an unverified, unsourced claim. Cut. Replaced with 'here's what actually changed,' which only promises what can actually be backed up."
          },
          {
            span: "In today's fast-paced world",
            type: "Hook Sharpening",
            explanation: "Rewrote the opening into a specific, slightly contrarian claim that a viewer would actually stop for."
          }
        ]
      }
    },
    "lesson-11": {
      pattern: "compare",
      title: "Five Items, Real Evidence",
      config: {
        kind: "toggle-list",
        type: "toggle-list",
        rows: [
          {
            label: "Platform disclosure",
            evidence: "Checked YouTube's current AI-disclosure policy on the upload date. This video used AI-generated visuals and AI voiceover, both trigger the 'Altered or Synthetic Content' label. Applied it during upload, screenshot attached.",
            rubber: "Pass, it's obviously fine."
          },
          {
            label: "Real person likeness or voice",
            evidence: "No real, identifiable person's face or voice appears anywhere in the generated footage or the AI voiceover. Confirmed by reviewing all three shots frame by frame.",
            rubber: "Pass, doesn't look like anyone I know."
          },
          {
            label: "Copyrighted or trademarked material",
            evidence: "Reviewed all three generated shots for lifted logos, characters, or trademarked designs. None found. Workshop set and tools are generic, not brand-specific.",
            rubber: "Pass, looks generic enough."
          },
          {
            label: "Music and audio licensing",
            evidence: "Background music pulled from YouTube's own royalty-free audio library, track ID logged. AI voiceover is originally generated, not a licensing concern.",
            rubber: "Pass, found it online somewhere."
          },
          {
            label: "Fact-check completion",
            evidence: "The voiceover script's one factual claim was checked against the original source cited in Lesson 10's fact-check pass. Source link saved.",
            rubber: "Pass, sounded about right."
          }
        ]
      }
    }
  }
};
