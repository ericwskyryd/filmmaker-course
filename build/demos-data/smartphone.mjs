export default {
  track: "smartphone",
  demos: {
    "lesson-04": {
      pattern: "compare",
      title: "Lock Before the Light Changes",
      config: {
        kind: "toggle",
        type: "toggle",
        visual: "exposure-walk",
        states: [
          {
            key: "locked",
            label: "Locked",
            caption: "Tap-and-hold locked exposure on the face before the walk started. Background swings from bright sidewalk to shaded doorway. Face brightness never moves."
          },
          {
            key: "auto",
            label: "Auto",
            caption: "0-5s: Exposure locked to background, face reads fine in full sun. 6-10s: Background darkens, camera brightens the whole frame to compensate. Your subject's face is now blown out or buried in shadow, whichever direction the auto-exposure guesses wrong."
          }
        ],
        bottomLine: "This is the same subject, the same 10 seconds, the same light boundary. The only difference is one tap before you rolled."
      }
    },
    "lesson-10": {
      pattern: "compare",
      title: "One Light Source Only",
      config: {
        kind: "toggle",
        type: "toggle",
        visual: "lightmix",
        states: [
          {
            key: "mixed",
            label: "Mixed Light",
            caption: "Lamp and window are both on. Watch the face color drift orange, then blue, then orange again as auto white balance keeps guessing. This is the sick, shifting skin tone the lesson warns about."
          },
          {
            key: "single",
            label: "Single Source",
            caption: "Blinds closed, lamp on. Skin reads warm and natural, and it never moves for the full 8 seconds."
          }
        ],
        lampCaption: "Blinds closed, lamp on. Skin reads warm and natural, and it never moves for the full 8 seconds.",
        windowCaption: "Lamp off, window light only. Skin reads cool and natural, and it never moves for the full 8 seconds.",
        bottomLine: "Your drill: kill one source completely before you roll. Don't let the phone referee between two lights."
      }
    }
  }
};
