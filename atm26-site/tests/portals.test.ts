// Rules page "Submission portals + tips" block: the two phase-specific form
// URLs are official public links and must stay byte-identical to the source
// text (specs/site-rules-submission-portals-tips.md); the [Old] section must
// never appear.
import { describe, it, expect } from "vitest";
import {
  SUBMISSION_PORTALS,
  SUBMISSION_TIPS,
} from "../src/content";
import { renderRules, renderHome } from "../src/pages";

const FINAL_TEST_FORM =
  "https://docs.google.com/forms/d/e/1FAIpQLSfPv_OVm_PkOmF4YgsNW-zren6tDdrUzzZCV_J3oMSDMks13A/viewform?usp=sharing&ouid=117378226219491671209";
const VALIDATION_FORM =
  "https://docs.google.com/forms/d/e/1FAIpQLSdwPtoBXp3iyy-s0S2lp629Vpq75OogvS8Xcr-B_bciSQGIPg/viewform?usp=sharing&ouid=117378226219491671209";
const GUIDELINE_URL =
  "https://github.com/EndoluminalSurgicalVision-IMR/Airway-Tree-Modeling-26/tree/master/baseline-and-submission-guideline";

describe("submission portals and tips", () => {
  it("keeps the two official form URLs verbatim", () => {
    expect(SUBMISSION_PORTALS.length).toBe(2);
    expect(SUBMISSION_PORTALS[0].formUrl).toBe(FINAL_TEST_FORM);
    expect(SUBMISSION_PORTALS[1].formUrl).toBe(VALIDATION_FORM);
    expect(SUBMISSION_PORTALS.map((p) => p.title)).toEqual([
      "Final Test Phase Submission",
      "Validation Phase Submission",
    ]);
  });

  it("tips carry no anatomy names; rendered page expands every inline placeholder", () => {
    const joined = SUBMISSION_TIPS.flatMap((tip) => [tip.title, tip.note]).join(" ");
    // no anatomy names / class references in this block
    expect(joined).not.toMatch(/RB7|LB7/);
    // placeholders ({guidelines}, {batch contract section}, {leaderboard})
    // are expanded at render time — no lettered placeholder may survive
    // (the only remaining brace is the literal set notation {0,...,20} in the
    // pitfalls block, which starts with a digit)
    expect(renderRules()).not.toMatch(/\{[a-zA-Z]/);
  });

  it("exposes tips with the merged Final-Test PDF entry and no separate paper-trail entry", () => {
    expect(SUBMISSION_TIPS.length).toBe(6);
    const titles = SUBMISSION_TIPS.map((tip) => tip.title);
    expect(titles).toContain("[Final Test Phase Only] Attach a brief PDF methodological report");
    expect(titles).not.toContain("Validation phase paper trail");
    const merged = SUBMISSION_TIPS.find((tip) =>
      tip.title.startsWith("[Final Test Phase Only]"),
    );
    expect(merged?.note).toContain("For the Validation phase, only your registration email address and team name are needed (no PDF report).");
  });

  it("renders both portals with open-external links and all tips on the Rules page", () => {
    const html = renderRules();
    const escapedFinal = FINAL_TEST_FORM.replaceAll("&", "&amp;");
    const escapedValidation = VALIDATION_FORM.replaceAll("&", "&amp;");
    expect(html).toContain("<h2>Submission portals</h2>");
    expect(html).toContain("<h2>Submission tips</h2>");
    expect(html).toContain(escapedFinal);
    expect(html).toContain(escapedValidation);
    expect((html.match(/target="_blank"/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(html).toContain(GUIDELINE_URL);
    expect(html).toContain("#/leaderboard/validation");
    expect((html.match(/<ul class="tips-list">/g) ?? []).length).toBe(1);
    const tipsList = /<ul class="tips-list">([\s\S]*?)<\/ul>/.exec(html)?.[1] ?? "";
    expect((tipsList.match(/<li><strong>/g) ?? []).length).toBe(SUBMISSION_TIPS.length);
    expect(html).toContain("[Final Test Phase Only] Attach a brief PDF methodological report");
    expect(html).not.toContain("Validation phase paper trail");
    // the [Old] section must never be copied
    expect(html).not.toMatch(/\[Old\]|Sanity-check|old I\/O-interface/);
    // Rules "How to submit" carries no GC cta buttons anymore
    expect(html).not.toContain("Official challenge site");
    expect(html).not.toContain("Submission Guidelines");
  });

  it("renders the hero with exactly three CTAs and no how-to-submit/timeline panels", () => {
    const html = renderHome();
    const heroRow = /<div class="cta-row">([\s\S]*?)<\/div>/.exec(html)?.[1] ?? "";
    expect(heroRow).toContain('<a class="cta" href="#/leaderboard">View leaderboard</a>');
    expect(heroRow).toContain('<a class="cta" href="#/rules">Submit to Validation Phase</a>');
    expect(heroRow).toContain('<a class="cta cta-secondary" href="#/rules">Submit to Final Test Phase</a>');
    expect((heroRow.match(/<a class="cta/g) ?? []).length).toBe(3);
    expect(html).not.toContain("Participation");
    expect(html).not.toContain("Timeline to be announced");
    expect(html).not.toContain("Official challenge site");
    expect(html).not.toContain("Rules &amp; submission guide");
    expect(html).not.toContain("Rules &amp; container contract");
  });
});
