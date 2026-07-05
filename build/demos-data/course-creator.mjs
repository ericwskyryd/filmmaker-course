export default {
  track: "course-creator",
  demos: {
    "lesson-02": {
      pattern: "panels",
      title: "From Category to Transformation, Live",
      config: {
        kind: "sequential-strike",
        startText: "You'll understand the fundamentals of course creation.",
        rewriteLabel: "Rewrite Live",
        testLabel: "Test It",
        steps: [
          {
            display: "You'll ~~understand the fundamentals of~~ **run a validated pre-sale and ship** course creation."
          },
          {
            display: "You'll ~~understand the fundamentals of~~ **run a validated pre-sale and ship** ~~course creation~~ **one paid pilot lesson**."
          }
        ],
        finalText: "Learner starts as: someone who's closed six-figure enterprise deals but has never validated a training product. Learner ends as: someone who can run a validated pre-sale and ship one paid pilot lesson.",
        readerRestatement: "So right now you haven't tried selling a course before it exists, and by the end you'll have actually gotten one paid pilot lesson out the door. Got it."
      }
    },
    "lesson-10": {
      pattern: "compare",
      title: "The Anchor Calculation, Live",
      config: {
        kind: "toggle",
        type: "toggle",
        visual: "calculator",
        states: [
          {
            label: "Cost of the Problem",
            worked: "Your validation conversations named this problem costing roughly $8,000 per failed course launch, in wasted production time and unsold seats. A $400 pilot price is 5% of that cost, an easy yes against the downside it prevents."
          },
          {
            label: "Cost of an Alternative",
            worked: "A consultant charging for the same validation-to-launch guidance runs $3,000 to $5,000 for a single engagement. Priced at $400, this pilot delivers the same core system at roughly 10% of that cost."
          },
          {
            label: "Willingness-to-Pay Data",
            worked: "3 of 5 people from your Lesson 1 validation conversations said they'd pay $250 to $500 for exactly this system. Priced at $400, inside that range, backed by direct data rather than a guess."
          }
        ],
        positionStatement: "Priced at $400 as a pilot cohort rate, not a full launch price. For: revenue leaders who've closed real deals but never validated a training product before building it. Not for: people looking for a passive-income course template with no real audience validated yet."
      }
    }
  }
};
