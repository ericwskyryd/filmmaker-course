// Demo content data: Commercial Scriptwriting track.
// Consumed by assets/demos.js (config is passed straight into each pattern's init).
export default {
  track: "scriptwriting",
  demos: {
    "lesson-01": {
      pattern: "reveal",
      title: "Page-Timing vs. Ear-Timing",
      config: {
        kind: "word",
        tracks: [
          {
            label: "Written Memo",
            panelLabel: "Written Memo",
            buttonLabel: "Read It (Written Memo)",
            instantText: "SkyRyd, which is an aviation logistics platform that connects charter operators with available aircraft in real time, is built to serve brokers, operators, and private flight departments by cutting quote turnaround from hours to minutes, solving the industry's slowest and most manual step.",
            secondButtonLabel: "Read Aloud",
            text: "SkyRyd, which is an aviation logistics platform that connects charter operators with available aircraft in real time, is built to serve brokers, operators, and private flight departments by cutting quote turnaround from hours to minutes, solving the industry's slowest and most manual step.",
            durationMs: 22400,
            stumbleWordIndex: 22,
            endTone: "bad",
            endLabel: "22 seconds, and it trips."
          },
          {
            label: "Spoken Line",
            panelLabel: "Spoken Line",
            buttonLabel: "Read It (Spoken Line)",
            text: "Charter quotes used to take hours. SkyRyd matches operators and aircraft in real time, so brokers get a quote in minutes, not hours.",
            durationMs: 15000,
            endTone: "good",
            endLabel: "15 seconds, clean on both reads."
          }
        ]
      }
    },
    "lesson-04": {
      pattern: "zones",
      title: "Four Beats, Timestamped",
      config: {
        kind: "beat-timer",
        totalSec: 30,
        buttonLabel: "Play the Read",
        zones: [
          {
            label: "Problem",
            start: 0,
            end: 8,
            text: "Every hour a plane sits on the ground waiting for a quote is an hour that charter broker could have closed the deal."
          },
          {
            label: "Turn",
            start: 8,
            end: 16,
            text: "SkyRyd puts every available aircraft and operator in one real-time marketplace."
          },
          {
            label: "Payoff",
            start: 16,
            end: 25,
            text: "Quotes that used to take half a day now take under ten minutes, and brokers close while the client's still on the phone."
          },
          {
            label: "CTA",
            start: 25,
            end: 30,
            text: "See your first live quote at skyryd.com."
          }
        ]
      }
    },
    "lesson-08": {
      pattern: "panels",
      title: "Same Hook, Same CTA, Thinner Middle",
      config: {
        kind: "struck-readout",
        panels: [
          {
            label: "Full 30-Second Version",
            text: "**Every hour a plane sits on the ground waiting for a quote is an hour that charter broker could have closed the deal.** SkyRyd puts every available aircraft and operator in one real-time marketplace. Quotes that used to take half a day now take under ten minutes, and brokers close while the client's still on the phone. **See your first live quote at skyryd.com.**",
            readout: "78 words, 30 seconds. Hook and CTA: Protected, untouched."
          },
          {
            label: "Trimmed Version",
            text: "**Every hour a plane sits on the ground waiting for a quote** ~~is an hour that charter broker could have closed the deal~~**, is a deal at risk.** SkyRyd puts every available aircraft and operator in one real-time marketplace. Quotes that used to take half a day now take under ten minutes~~, and brokers close while the client's still on the phone~~. **See your first live quote at skyryd.com.**",
            readout: "58 words (26% cut), 23 seconds. Hook and CTA: Protected, untouched."
          }
        ]
      }
    },
    "lesson-10": {
      pattern: "panels",
      title: "Script, Shot List, Timeline: Same Beat, Three Forms",
      config: {
        kind: "beat-sync",
        panelLabels: ["Script", "Shot List", "Timeline"],
        beats: [
          {
            label: "Problem",
            values: [
              "Every hour a plane sits on the ground waiting for a quote is a deal at risk.",
              "Shot 1: Wide, grounded aircraft on tarmac, empty cockpit. Shot 2: Close-up, broker checking a phone, no response.",
              "0:00-0:07"
            ]
          },
          {
            label: "Turn",
            values: [
              "SkyRyd puts every available aircraft and operator in one real-time marketplace.",
              "Shot 3: Screen capture, SkyRyd's live map view populating with aircraft icons.",
              "0:07-0:13"
            ]
          },
          {
            label: "Payoff",
            values: [
              "Quotes that used to take half a day now take under ten minutes.",
              "Shot 4: Broker's phone lighting up with a quote notification. Shot 5: Handshake or signed confirmation screen.",
              "0:13-0:20"
            ]
          },
          {
            label: "CTA",
            values: [
              "See your first live quote at skyryd.com.",
              "Shot 6: Logo card with URL, clean end frame.",
              "0:20-0:23"
            ]
          }
        ]
      }
    }
  }
};
