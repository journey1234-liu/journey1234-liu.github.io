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
import { TRACK_ICONS } from "../src/icons";

const FINAL_TEST_FORM =
  "https://docs.google.com/forms/d/e/1FAIpQLSfPv_OVm_PkOmF4YgsNW-zren6tDdrUzzZCV_J3oMSDMks13A/viewform?usp=sharing&ouid=117378226219491671209";
const VALIDATION_FORM =
  "https://docs.google.com/forms/d/e/1FAIpQLSdwPtoBXp3iyy-s0S2lp629Vpq75OogvS8Xcr-B_bciSQGIPg/viewform?usp=sharing&ouid=117378226219491671209";
const GUIDELINE_URL =
  "https://github.com/EndoluminalSurgicalVision-IMR/Airway-Tree-Modeling-26/tree/master/baseline-and-submission-guideline";
const BACKUP_FORM =
  "https://docs.google.com/forms/d/e/1FAIpQLSdc7J-rJMTg45IvSqnJRpd1byCbNVF0q_2dtaa0Cn6g15t9ng/viewform?usp=dialog";
const BACKUP_LABEL = "Google Drive Upload Backup Form";

describe("submission portals and tips", () => {
  it("lays out two rows of three, with the official form URLs verbatim", () => {
    expect(SUBMISSION_PORTALS.map((p) => p.title)).toEqual([
      "Track-1 · Validation",
      "Track-2 · Validation",
      "Track-3 · Validation",
      "Track-1 · Longterm Test",
      "Track-2 · Longterm Test",
      "Track-3 · Test",
    ]);
    // upper row: every validation card uses the validation form
    expect(SUBMISSION_PORTALS.slice(0, 3).map((p) => p.formUrl)).toEqual([
      VALIDATION_FORM,
      VALIDATION_FORM,
      VALIDATION_FORM,
    ]);
    // bottom row: the long-term cards use the Final Test form ...
    expect(SUBMISSION_PORTALS.slice(3, 5).map((p) => p.formUrl)).toEqual([
      FINAL_TEST_FORM,
      FINAL_TEST_FORM,
    ]);
    // ... and the Track-3 test card has no form while the phase is closed
    expect(SUBMISSION_PORTALS[5].formUrl).toBeUndefined();
  });

  it("keeps the Google Drive backup form on the two long-term cards", () => {
    const withBackup = SUBMISSION_PORTALS.filter((portal) => portal.backupForm);
    expect(withBackup.map((portal) => portal.title)).toEqual([
      "Track-1 · Longterm Test",
      "Track-2 · Longterm Test",
    ]);
    expect(withBackup[0].backupForm?.url).toBe(BACKUP_FORM);
    expect(withBackup[0].backupForm?.label).toBe(BACKUP_LABEL);

    const html = renderRules();
    expect((html.match(new RegExp(BACKUP_LABEL, "g")) ?? []).length).toBe(2);
  });

  it("shows the state of every intake and leaves the closed phase form-free", () => {
    const html = renderRules();
    const cards = [...html.matchAll(/<div class="portal-card[^"]*">([\s\S]*?)<\/div>/g)].map(
      (match) => match[1],
    );
    expect(cards.length).toBe(6);

    const statuses = [...html.matchAll(/<p class="portal-status">([^<]*)<\/p>/g)].map(
      (match) => match[1],
    );
    expect(statuses).toEqual([
      "Open",
      "Open",
      "Open",
      "Open again — long-term",
      "Open again — long-term",
      "Opens later",
    ]);

    // five cards offer a form; the closed Track-3 test card says so instead
    expect((html.match(/Open submission form/g) ?? []).length).toBe(5);
    expect(cards[5]).toContain("portal-closed");
    expect(cards[5]).not.toContain("Open submission form");
    expect(cards[5]).toContain("not open yet");
    expect(cards[5]).toContain("same form as Track-1 and Track-2");

    // upper row is validation only, bottom row test only
    expect(cards.slice(0, 3).every((card) => card.includes("Validation"))).toBe(true);
    expect(cards.slice(3).every((card) => card.includes("Test"))).toBe(true);

    // the shared note carries the frequency and venue once, outside the cards
    const note = /<p class="portal-note">([\s\S]*?)<\/p>/.exec(html)?.[1] ?? "";
    expect(note.replace(/\s+/g, " ")).toContain("One submission per 24 hours per team and track");
  });

  it("gives every card its track glyph and mutes the closed one", () => {
    const html = renderRules();
    expect((html.match(/class="portal-icon"/g) ?? []).length).toBe(6);
    expect((html.match(/aria-hidden="true"/g) ?? []).length).toBeGreaterThanOrEqual(6);

    // Track-1 is one colour (binary), Track-2 many (multi-class labels)
    const t1Colours = new Set(TRACK_ICONS.t1.match(/#[0-9a-f]{6}/g) ?? []);
    const t2Colours = new Set(TRACK_ICONS.t2.match(/#[0-9a-f]{6}/g) ?? []);
    expect(t1Colours.size).toBe(1);
    expect(t1Colours.has("#d13b3b")).toBe(true);
    expect(t2Colours.size).toBeGreaterThanOrEqual(5);
    expect(t2Colours.has("#d13b3b")).toBe(false);
    expect(TRACK_ICONS.t3).toContain("#0e7490");

    // each card carries its track class; only the unopened phase is closed
    expect((html.match(/portal-card track-t1/g) ?? []).length).toBe(2);
    expect((html.match(/portal-card track-t2/g) ?? []).length).toBe(2);
    expect((html.match(/portal-card track-t3/g) ?? []).length).toBe(2);
    expect((html.match(/is-closed/g) ?? []).length).toBe(1);
  });

  it("describes the current limits for all three tracks", () => {
    const limit = SUBMISSION_TIPS.find((tip) => tip.title === "Submission frequency limit");
    expect(limit?.note).toContain("one submission every 24 hours");
    expect(limit?.note).toContain("Track-3");
    expect(limit?.note).not.toContain("only one successful submission");

    const html = renderRules();
    // the challenge cutoff is history; the page must not advertise it as current
    expect(html).not.toContain("Sep 22, 11:59 PM");
    expect(html).not.toContain("Final Test submissions closed");
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
    expect(SUBMISSION_TIPS.length).toBe(7);
    const titles = SUBMISSION_TIPS.map((tip) => tip.title);
    expect(titles).toContain("[Final Test Phase Only] Attach a brief PDF methodological report");
    expect(titles).not.toContain("Validation phase paper trail");
    const merged = SUBMISSION_TIPS.find((tip) =>
      tip.title.startsWith("[Final Test Phase Only]"),
    );
    expect(merged?.note).toContain("For the Validation phase, only your registration email address and team name are needed (no PDF report).");
  });

  it("states explicitly that a failed run does not consume the submission limit", () => {
    const titles = SUBMISSION_TIPS.map((tip) => tip.title);
    const idx = titles.indexOf("A failed run does not use up your submission limit");
    expect(idx).toBeGreaterThan(-1);
    // sits directly after the frequency-limit tip so submitters read them together
    expect(titles[idx - 1]).toBe("Submission frequency limit");
    const note = SUBMISSION_TIPS[idx].note;
    expect(note).toContain("does not count against the frequency limit");
    expect(note).toContain("submit again immediately");
    const limitNote = SUBMISSION_TIPS[idx - 1].note;
    expect(limitNote).toContain("a run that fails does not use up your slot");
    const html = renderRules();
    expect(html).toContain("A failed run does not use up your submission limit");
  });

  it("renders every portal with open-external links and all tips on the Submission page", () => {
    const html = renderRules();
    const escapedFinal = FINAL_TEST_FORM.replaceAll("&", "&amp;");
    const escapedValidation = VALIDATION_FORM.replaceAll("&", "&amp;");
    expect(html).toContain("<h2>Submission portals</h2>");
    expect(html).toContain("<h2>Submission tips</h2>");
    expect(html).toContain(escapedFinal);
    expect(html).toContain(escapedValidation);
    expect((html.match(/target="_blank"/g) ?? []).length).toBeGreaterThanOrEqual(5);
    expect(html).toContain(GUIDELINE_URL);
    expect(html).toContain("#/leaderboard/longterm-test");
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

  it("renders the hero with five CTAs and no how-to-submit/timeline panels", () => {
    const html = renderHome();
    const heroRow = /<div class="cta-row">([\s\S]*?)<\/div>/.exec(html)?.[1] ?? "";
    expect(heroRow).toContain('<a class="cta" href="#/leaderboard">View leaderboard</a>');
    expect(heroRow).toContain('<a class="cta" href="#/rules">Submit to Validation Phase</a>');
    expect(heroRow).toContain('<a class="cta cta-secondary" href="#/rules">Submit to Final Test Phase</a>');
    expect(heroRow).toContain('class="cta cta-resource"');
    expect((heroRow.match(/<a class="cta/g) ?? []).length).toBe(5);
    expect(html).not.toContain("Participation");
    expect(html).not.toContain("Timeline to be announced");
    expect(html).not.toContain("Official challenge site");
    expect(html).not.toContain("Rules &amp; submission guide");
    expect(html).not.toContain("Rules &amp; container contract");
  });
});
