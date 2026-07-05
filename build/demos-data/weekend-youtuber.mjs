export default {
  track: "weekend-youtuber",
  demos: {
    "lesson-01": {
      pattern: "reveal",
      title: "Category vs. Promise, Tested Cold",
      config: {
        kind: "stagger",
        variant: "click-cards",
        cards: [
          {
            label: "Vague",
            statement: "A channel about cars.",
            responses: [
              "Uh... cars? Like, reviews? Racing? I don't really know what I'd get out of watching.",
              "Cars in general? Not sure who that's for.",
              "Some kind of car channel, I guess."
            ],
            counterText: "0 of 3 correctly identified audience and outcome."
          },
          {
            label: "Specific",
            statement: "I help guys restoring their first project car with no shop and no mechanic background avoid the exact mistakes that cost me $2,000 on my first engine rebuild, in 10-minute weekend garage sessions.",
            responses: [
              "Oh, so it's for someone doing their first car restoration in their driveway, and you show them the expensive mistakes to skip. That's specific.",
              "Sounds like it's for a beginner rebuilding an engine at home without a shop, quick weekend videos.",
              "For someone new to car restoration, no garage or mechanic background, learning what not to do."
            ],
            counterText: "3 of 3 correctly identified audience and outcome."
          }
        ]
      }
    },
    "lesson-06": {
      pattern: "compare",
      title: "The Beat-by-Beat Outline, Annotated",
      config: {
        kind: "toggle",
        type: "toggle",
        visual: "annotated-list",
        states: [
          {
            label: "The Good Outline",
            beats: [
              { time: "0:00-0:15", text: "Hook: Open on the payoff, a bike braking silently after a fix that took 4 minutes." },
              { time: "0:15-0:35", text: "Beat 1: Show the problem: the squeal, close mic on the brake." },
              { time: "0:35-0:55", text: "Beat 2: Name the actual cause, glazed brake pads, not what most people assume (loose cable)." },
              { time: "0:55-1:20", text: "Beat 3: First fix step, sanding the pad surface, close-up hands." },
              { time: "1:20-1:40", text: "Beat 4: Second fix step, realigning the caliper, a new camera angle to keep it fresh." },
              { time: "1:40-2:00", text: "Payoff delivered, the bike brakes silently, matches the hook's opening promise exactly.", loop: true },
              { time: "2:00-2:15", text: "CTA beat: One-line wrap and subscribe ask." }
            ]
          },
          {
            label: "Show a Bad Outline Instead",
            beats: [
              { time: "0:00-0:15", text: "Hook: Open on the payoff, a bike braking silently after a fix that took 4 minutes." },
              { time: "0:15-1:45", text: "Talk about my process.", flag: "No stated change for 90 seconds. This is where 500 viewers quietly leave." },
              { time: "1:45-2:00", text: "Show the fix.", flag: "The loop from the hook never gets a marked resolution, it just sort of happens." }
            ]
          }
        ]
      }
    },
    "lesson-08": {
      pattern: "mockui",
      title: "Beat the Clock, Not the Perfect Take",
      config: {
        kind: "checklist-timer",
        budgetLabel: "Shoot window: 90 minutes",
        shots: [
          "1. Establishing shot of garage.",
          "2. Close-up of the tool.",
          "3. Hands demonstrating the fix.",
          "4. Reaction shot.",
          "5. Before/after comparison shot.",
          "6. To-camera wrap line."
        ],
        plannedLabel: "Play as Planned",
        overrunLabel: "Play the Chasing-Perfect Failure",
        plannedResult: "All 6 beats shot, 4 minutes to spare.",
        overrunResult: "Time's up. Two beats never got shot because beat 1 ate their time."
      }
    },
    "lesson-09": {
      pattern: "mockui",
      title: "Rough Assembly, Trim, Export, in That Order",
      config: {
        kind: "timeline-export",
        beats: ["Establishing", "Close-up", "Hands", "Reaction", "Before/After", "Wrap"],
        plannedLabel: "Play as Planned",
        overrunLabel: "Play the Overrun Failure",
        plannedResult: "Export bar fills fully, with time to spare.",
        overrunCaption: "Endless fine-tuning on the first few beats",
        overrunResult: "Export didn't finish before the time box closed."
      }
    },
    "lesson-12": {
      pattern: "compare",
      title: "Title Card vs. Payoff, First 2 Seconds",
      config: {
        kind: "dual",
        type: "dual",
        visual: "phone-pair",
        playLabel: "Play Both",
        states: [
          {
            label: "Title Card",
            kind: "titlecard",
            titleText: "MY BIKE BRAKE FIX",
            caption: "2 seconds spent on a title card. On Shorts, that's most of your hook window, gone."
          },
          {
            label: "Payoff Open",
            kind: "payoff",
            caption: "Payoff visible from frame one. No setup burned."
          }
        ],
        bottomLine: "The Short needs its own hook. It isn't a trailer for your long-form video."
      }
    },
    "lesson-13": {
      pattern: "zones",
      title: "The Weekend Budget Tracker",
      config: {
        kind: "stage-tracker",
        segments: [
          { label: "Promise-Fit", budget: "5 min" },
          { label: "Title/Thumbnail", budget: "30 min" },
          { label: "Hook/Outline", budget: "45 min" },
          { label: "Batch Plan", budget: "60 min" },
          { label: "Shoot", budget: "90 min" },
          { label: "Edit", budget: "120 min", overrun: true },
          { label: "Publish", budget: "15 min" }
        ],
        onBudgetLabel: "Run On-Budget",
        overrunLabel: "Run the Overrun",
        onBudgetResult: "Published, with time to spare.",
        overrunResult: "Edit ran long, exactly like Lesson 9's failure mode. Finished on time, barely, because only one stage broke, not the whole system."
      }
    }
  }
};
