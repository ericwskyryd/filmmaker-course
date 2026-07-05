// Demo content data: Short-Form track (Creator Reps academy).
// Generated from content/demo-specs/short-form-demos.md.
// Lesson 11 (capstone) is excluded by design per the spec.
// Configs are pure JSON-serializable data consumed by assets/demos.js init functions.

export default {
  track: "short-form",
  demos: {
    "lesson-01": {
      pattern: "compare",
      title: "Two Seconds, Cold",
      config: {
        kind: "dual",
        type: "dual",
        visual: "loop-pair",
        playLabel: "Play Both (2s Loop)",
        states: [
          {
            label: "Static Open",
            motion: "static",
            reactionBadge: "...",
            caption: "Phone barely raised, about to start talking. This is a pause button, not a hook."
          },
          {
            label: "Mid-Action Open",
            motion: "action",
            reactionBadge: "Wait, what?",
            caption: "Already doing the thing. No wind-up. The eye has to catch up."
          }
        ],
        bottomLine: "If your opening frame looks the same paused for three seconds, it isn't doing its job yet."
      }
    },
    "lesson-02": {
      pattern: "reveal",
      title: "Nine Seconds of Nothing",
      config: {
        kind: "word",
        tracks: [
          {
            label: "Preamble",
            panelLabel: "Preamble Open",
            buttonLabel: "Play Preamble (Audio Only)",
            text: "Hey... guys... welcome... back... to... my... channel... today... we're... gonna... talk... about...",
            durationMs: 4000,
            endTone: "bad",
            endLabel: "still no information."
          },
          {
            label: "Cold Open",
            panelLabel: "Cold Open",
            buttonLabel: "Play Cold Open (Audio Only)",
            text: "Your... first... cold... email... is... costing... you... the... meeting... before... they... even... open... it.",
            durationMs: 4200,
            endTone: "good",
            endLabel: "0:02, listener already knows what's being promised."
          }
        ]
      }
    },
    "lesson-04": {
      pattern: "zones",
      title: "One Shot vs. Ten Cuts",
      config: {
        kind: "timeline-compare",
        durationMs: 8000,
        buttonLabel: "Play Both 20-Second Timelines",
        tracks: [
          {
            label: "One Continuous Shot",
            segments: ["One unbroken 20-second take"],
            caption: "Nothing changes on screen for 20 straight seconds. To a scrolling thumb, this reads as dead."
          },
          {
            label: "Hard-Cut Version",
            segments: [
              "Wide shot",
              "Insert: hands",
              "Cutaway: object",
              "Reaction",
              "New angle",
              "Insert: hands",
              "Jump cut forward",
              "Wide shot",
              "Reaction",
              "Final action beat"
            ],
            caption: "Something changes every 1 to 3 seconds. Angle, subject, or framing shifts, every time. 10 shots, none longer than 3 seconds, still one clear idea."
          }
        ]
      }
    },
    "lesson-06": {
      pattern: "panels",
      title: "Same Clip, Two Platforms",
      config: {
        kind: "callout-dots",
        sourceCaption: "A 45-second raw clip of you reviewing a piece of gear.",
        frames: [
          {
            label: "Reels Cut",
            callouts: [
              {
                label: "Polished framing, tripod-steady, clean background",
                reveal: "Reels tends to reward save- and share-worthy polish, since Explore surfaces you to people who don't already follow you."
              },
              {
                label: "Trend audio laid under from the start",
                reveal: "Trend-audio use tends to help discovery here."
              }
            ]
          },
          {
            label: "TikTok Cut",
            callouts: [
              {
                label: "Rougher handheld framing, same room, less staged",
                reveal: "TikTok completion tends to favor content that feels native to the app over content that feels produced."
              },
              {
                label: "Text-overlay hook instead of a voiceover open",
                reveal: "A text hook reads faster than waiting for a voiceover to start, and rewards the scroll-stopping habit of the platform."
              }
            ]
          }
        ],
        bottomLine: "Same message, same footage, two different packaging decisions, each tied to a specific platform tendency, not a whim."
      }
    },
    "lesson-07": {
      pattern: "compare",
      title: "Generic Placement vs. The Exact Beat",
      config: {
        kind: "toggle",
        type: "toggle",
        visual: "waveform",
        states: [
          {
            label: "Generic Placement",
            synced: false,
            dropIndex: 28,
            markerIndex: 0,
            caption: "Sound starts under the clip with no relationship to anything happening on screen. The drop just plays in the background, ignored."
          },
          {
            label: "Precise Sync",
            synced: true,
            dropIndex: 28,
            markerIndex: 28,
            caption: "The visual punchline lands within 2 frames of the drop. This is the moment everyone already associates with a payoff, borrowed on purpose."
          }
        ],
        bottomLine: "You can point to the exact timestamp when asked. That's the test."
      }
    },
    "lesson-10": {
      pattern: "mockui",
      title: "Find the Steepest Drop",
      config: {
        kind: "retention-chart",
        swapLabel: "Load Example B",
        swapBackLabel: "Back to Example A",
        curves: [
          {
            points: [
              { t: 0, v: 100 },
              { t: 3, v: 70 },
              { t: 30, v: 40 },
              { t: 55, v: 38 },
              { t: 58, v: 39 },
              { t: 60, v: 42 }
            ],
            tooltips: [
              { from: 0, to: 3, text: "Moderate drop, not the failure case." },
              { from: 3, to: 55, text: "Gradual bleed, worth watching but not urgent." },
              { from: 55, to: 60, text: "Flat into the ending with a small bump: loop is working." }
            ]
          },
          {
            points: [
              { t: 0, v: 100 },
              { t: 3, v: 35 },
              { t: 60, v: 20 }
            ],
            tooltips: [
              { from: 0, to: 3, text: "This is the failure case. Nearly two-thirds of viewers gone before second 3. Fix the hook, not the middle." }
            ]
          }
        ]
      }
    }
  }
};
