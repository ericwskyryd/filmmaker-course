export default {
  track: "pro-camera",
  demos: {
    "lesson-01": {
      pattern: "compare",
      title: "Trust the Meter, Not the Screen",
      config: {
        kind: "toggle",
        type: "toggle",
        visual: "meter-histogram",
        states: [
          {
            label: "Eyeball the LCD",
            meterOff: true,
            meterValue: 2,
            caption: "Bright sun is washing out your LCD. It looks too dark, so you add exposure to compensate. The meter says +2. You just overexposed to fix a lie the screen told you.",
            histogram: [6, 5, 4, 5, 6, 7, 8, 9, 10, 12, 14, 18, 24, 40, 62, 80, 95, 100],
            histCaption: "Spike jammed against the right wall. Blown highlights. No edit recovers this."
          },
          {
            label: "Center the Meter",
            meterOff: false,
            meterValue: 0,
            caption: "Same bright sun, same LCD glare. You ignore the screen and watch the meter scale instead, dialing shutter, aperture, or ISO until the marker sits within a third of a stop of 0.",
            histogram: [3, 5, 9, 16, 28, 46, 64, 80, 90, 88, 74, 56, 38, 22, 12, 7, 4, 3],
            histCaption: "Clean cluster in the middle, nothing stacked against either wall. This is a correctly exposed frame."
          }
        ],
        bottomLine: "Your drill: three lighting situations, meter to 0 every time, confirm on the histogram after. Not the glow on the screen."
      }
    },
    "lesson-07": {
      pattern: "compare",
      title: "One Smooth Turn Beats Three Corrections",
      config: {
        kind: "toggle",
        type: "toggle",
        visual: "focus-pull",
        states: [
          {
            label: "Smooth Pull",
            key: "smooth",
            caption: "One continuous turn. Peaking shifts cleanly from Near to Far and holds. Landed in about 2 seconds, no correction."
          },
          {
            label: "Hunting Pull",
            key: "hunting",
            caption: "Three short bursts instead of one motion. Peaking flickers, drops off both subjects for a moment, and finally settles late. This reads as three tiny corrections, not one intentional move."
          }
        ],
        bottomLine: "Practice the distance blind a few times with the lens cap on, feel how far your fingers need to travel, then do it once for real."
      }
    },
    "lesson-11": {
      pattern: "compare",
      title: "Drag, Speed, and the Plate That Wasn't Seated",
      config: {
        kind: "toggle",
        type: "toggle",
        visual: "pan-tripod",
        states: [
          {
            label: "Jerky Pan",
            key: "jerky",
            caption: "Whip, not a pan. 60 degrees covered in under 2 seconds."
          },
          {
            label: "Smooth Pan",
            key: "smooth",
            caption: "Smooth start, constant speed, smooth stop. Properly dragged."
          },
          {
            label: "Unbalanced Drift",
            key: "drift",
            caption: "Half-locked plate or a head with no counterbalance. Nobody touched it. It's still moving."
          }
        ],
        bottomLine: "Give the plate a tug-test before you ever step away. Listen for the click."
      }
    }
  }
};
