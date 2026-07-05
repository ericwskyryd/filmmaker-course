// Demo content data: Content Strategist track.
// Pure JSON-serializable config per lesson; consumed by assets/demos.js init functions.

export default {
  track: "content-strategist",
  demos: {
    "lesson-01": {
      pattern: "reveal",
      title: "Sort Test: Vague vs. Tightened",
      config: {
        kind: "stagger",
        variant: "sort-columns",
        buttonLabel: "Run the Sort",
        columns: [
          {
            label: "Vague Statement: \"Business leaders interested in growth.\"",
            counterText: "1 of 5 sorted cleanly, 4 unclear.",
            rows: [
              { text: "How I structure a $27M pipeline review", tally: "UNCLEAR" },
              { text: "5 cold-call scripts that book more meetings", tally: "UNCLEAR" },
              { text: "How to build a BD team from 2 people to 8", tally: "UNCLEAR" },
              { text: "Morning routines of successful founders", tally: "IN" },
              { text: "What I look for when hiring my first VP of BD", tally: "UNCLEAR" }
            ]
          },
          {
            label: "Tightened Statement: \"Revenue and BD leaders at mid-size companies who are past the individual-contributor stage and are now building a function, not just hitting a number themselves. Not for: junior sales reps looking for scripts, general hustle-culture consumers, recruiters mining the feed for candidates, direct competitors doing competitive intelligence.\"",
            counterText: "5 of 5 sorted cleanly, under a minute.",
            rows: [
              { text: "How I structure a $27M pipeline review", tally: "IN" },
              { text: "5 cold-call scripts that book more meetings (junior rep script-seeking, named exclusion)", tally: "OUT" },
              { text: "How to build a BD team from 2 people to 8", tally: "IN" },
              { text: "Morning routines of successful founders (hustle-culture, named exclusion)", tally: "OUT" },
              { text: "What I look for when hiring my first VP of BD", tally: "IN" }
            ]
          }
        ]
      }
    },

    "lesson-04": {
      pattern: "compare",
      title: "Squeezed vs. Fitted",
      config: {
        kind: "slider",
        type: "slider",
        beforeLabel: "Squeezed into a 15-Second Short",
        afterLabel: "Fitted to a Carousel",
        beforeHtml: "<div style='padding:14px 12px 8px;text-align:center;'><p class='demo-panel-label' style='margin:0 0 8px;'>Source pillar: &quot;A framework for calculating pipeline coverage ratio,&quot; 7 points</p><div style='position:relative;width:118px;height:168px;margin:0 auto;border:2px solid currentColor;border-radius:16px;overflow:hidden;text-align:left;padding:10px 8px;'><p style='margin:0;font-size:10px;font-weight:700;line-height:1.15;'>1. Define your revenue target.</p><p style='margin:-4px 0 0;font-size:10px;font-weight:700;line-height:1.15;transform:rotate(-3deg);'>4. Calculate weighted forecast.</p><p style='margin:-3px 0 0 6px;font-size:10px;font-weight:700;line-height:1.15;transform:rotate(2deg);'>7. Prioritize which deals close the gap.</p><p style='position:absolute;left:-52px;top:92px;font-size:9px;opacity:.35;margin:0;white-space:nowrap;'>2. Pull total pipeline value.</p><p style='position:absolute;right:-58px;top:112px;font-size:9px;opacity:.35;margin:0;white-space:nowrap;'>3. Apply your close-rate history.</p><p style='position:absolute;left:-64px;top:132px;font-size:9px;opacity:.35;margin:0;white-space:nowrap;'>5. Compare weighted forecast to target.</p><p style='position:absolute;right:-44px;top:150px;font-size:9px;opacity:.35;margin:0;white-space:nowrap;'>6. Flag the coverage gap.</p></div><p class='demo-caption' style='margin-top:8px;'>Nuance lost, the middle logic (how you got the number) disappeared.</p></div>",
        afterHtml: "<div style='padding:14px 12px 8px;text-align:center;'><p class='demo-panel-label' style='margin:0 0 8px;'>Source pillar: &quot;A framework for calculating pipeline coverage ratio,&quot; 7 points</p><div style='display:flex;gap:6px;justify-content:center;flex-wrap:wrap;max-width:560px;margin:0 auto;'><div style='flex:0 0 72px;border:1px solid currentColor;border-radius:8px;padding:6px 5px;font-size:9px;line-height:1.25;text-align:left;'><b>Card 1</b><br>Define your revenue target.</div><div style='flex:0 0 72px;border:1px solid currentColor;border-radius:8px;padding:6px 5px;font-size:9px;line-height:1.25;text-align:left;'><b>Card 2</b><br>Pull total pipeline value.</div><div style='flex:0 0 72px;border:1px solid currentColor;border-radius:8px;padding:6px 5px;font-size:9px;line-height:1.25;text-align:left;'><b>Card 3</b><br>Apply your close-rate history.</div><div style='flex:0 0 72px;border:1px solid currentColor;border-radius:8px;padding:6px 5px;font-size:9px;line-height:1.25;text-align:left;'><b>Card 4</b><br>Calculate weighted forecast.</div><div style='flex:0 0 72px;border:1px solid currentColor;border-radius:8px;padding:6px 5px;font-size:9px;line-height:1.25;text-align:left;'><b>Card 5</b><br>Compare weighted forecast to target.</div><div style='flex:0 0 72px;border:1px solid currentColor;border-radius:8px;padding:6px 5px;font-size:9px;line-height:1.25;text-align:left;'><b>Card 6</b><br>Flag the coverage gap.</div><div style='flex:0 0 72px;border:1px solid currentColor;border-radius:8px;padding:6px 5px;font-size:9px;line-height:1.25;text-align:left;'><b>Card 7</b><br>Prioritize which deals close the gap.</div></div><p class='demo-caption' style='margin-top:8px;'>Depth intact, still scannable.</p></div>"
      }
    },

    "lesson-09": {
      pattern: "reveal",
      title: "Pillar by Pillar, Out Loud",
      config: {
        kind: "stagger",
        variant: "review-rows",
        buttonLabel: "Narrate the Review",
        rows: [
          { cells: ["Pillar", "Audience Fit", "Leading-Metric Trend"] },
          { cells: ["Pillar 1, BD Tactical Frameworks", "Strong", "Up"] },
          { cells: ["Pillar 2, Personal Career Stories", "Drifting (attracting job-seekers, not the target BD-leader audience)", "Flat"] },
          { cells: ["Pillar 3, Pipeline and Revenue Ops", "Strong", "Up"] },
          { cells: ["Pillar 4, Hustle/Motivation Posts", "Weak (matches the excluded \"hustle-culture\" group from Lesson 1)", "Down"], worst: true }
        ],
        calloutText: "Pillar 4: Leading-metric trend down for 6 straight pieces, and the comments are increasingly from the audience Lesson 1 explicitly excluded. This pillar is drifting away from the promise, not just underperforming.",
        footerText: "Cadence adherence: 11 of 12 planned pieces published this quarter, 92%. Promise re-test: Promise from Lesson 2 still holds for 3 of 4 pillars. Pillar 4 no longer serves it."
      }
    },

    "lesson-10": {
      pattern: "panels",
      title: "Sort the Pillars: Kill, Keep, Double-Down",
      config: {
        kind: "sort-buckets",
        buckets: ["Kill", "Keep", "Double-Down"],
        pillars: [
          {
            name: "BD Tactical Frameworks",
            bucket: "Keep",
            evidence: "Strong audience fit, leading metric trending up, no change needed.",
            action: "Maintain current weekly cadence."
          },
          {
            name: "Personal Career Stories",
            bucket: "Keep",
            evidence: "Keep, with a caveat. Flat trend, but audience fit is drifting, not yet bad enough to kill.",
            action: "Tighten topic selection back toward BD-leader relevance next quarter, re-score at the next review."
          },
          {
            name: "Pipeline and Revenue Ops",
            bucket: "Double-Down",
            evidence: "Strong audience fit and the single fastest-growing leading metric of all 4 pillars.",
            action: "Increase from weekly to twice-weekly, add one long-form piece per month."
          },
          {
            name: "Hustle/Motivation Posts",
            bucket: "Kill",
            evidence: "Leading metric down for 6 straight pieces, audience fit drifting into an explicitly excluded group.",
            action: "Frequency drops to zero. Remove from the Lesson 5 calendar entirely."
          }
        ],
        resultText: "Real distribution achieved: 1 kill, 1 double-down, 2 keep. Not a uniform 'keep' across the board."
      }
    },

    "lesson-11": {
      pattern: "panels",
      title: "Click a Section, See Where It Came From",
      config: {
        kind: "accordion-trace",
        sections: [
          {
            title: "Audience Definition",
            excerpt: "Revenue and BD leaders at mid-size companies... not for junior reps, hustle-culture consumers, recruiters, or competitors.",
            tag: "Traces to Lesson 1."
          },
          {
            title: "Content Promise",
            excerpt: "I help BD leaders build a real pipeline function through weekly tactical breakdowns.",
            tag: "Traces to Lesson 2."
          },
          {
            title: "Content Pillars",
            excerpt: "BD Tactical Frameworks, Pipeline and Revenue Ops, Personal Career Stories, [killed pillar removed].",
            tag: "Traces to Lesson 3 and Lesson 10's kill decision."
          },
          {
            title: "Format-Channel Map",
            excerpt: "Pipeline and Revenue Ops routes to LinkedIn long-form text, because this audience reads with coffee, not mid-scroll.",
            tag: "Traces to Lesson 4."
          },
          {
            title: "90-Day Calendar",
            excerpt: "13 weeks, same weekly time budget as the Lesson 5 4-week version, no ambition inflation.",
            tag: "Traces to Lesson 5."
          },
          {
            title: "Repurposing Map",
            excerpt: "One pipeline-coverage post broken into a carousel, a newsletter section, and 3 short clips.",
            tag: "Traces to Lesson 6."
          },
          {
            title: "Distribution Plan",
            excerpt: "Every major post also goes out as a newsletter mention and a comment-seeding pass on 5 relevant threads.",
            tag: "Traces to Lesson 7."
          },
          {
            title: "Scorecard",
            excerpt: "Leading metric per pillar: saves for frameworks, replies for career stories, click-throughs for revenue ops.",
            tag: "Traces to Lesson 8."
          }
        ],
        footerNote: "Day 30: review cadence adherence and early scorecard trend for the double-down pillar specifically."
      }
    }
  }
};
