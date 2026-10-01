// Home page banner below the hero: it must announce Track-3 status only.
// The former "SUBMISSION STATUS / temporarily closed" notice was retired and
// must not come back through content or markup.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { TRACK3_NOTICE } from "../src/content";
import { renderHome } from "../src/pages";

describe("home Track-3 status banner", () => {
  it("renders the kicker and the title-cased Track-3 title", () => {
    const html = renderHome();
    expect(html).toContain("TRACK-3 STATUS");
    expect(html).toContain(
      '<strong class="status-title">Track 3: Landmark Recognition for Endobronchial Intervention</strong>',
    );
    expect(html).toContain("COMING SOON");
  });

  it("uses title case for every significant word of the title", () => {
    expect(TRACK3_NOTICE.title).toBe(
      "Track 3: Landmark Recognition for Endobronchial Intervention",
    );
    // "for" is a short preposition and stays lowercase in title case.
    for (const word of ["Landmark", "Recognition", "Endobronchial", "Intervention"]) {
      expect(TRACK3_NOTICE.title).toContain(word);
    }
    expect(TRACK3_NOTICE.title).toContain(" for ");
  });

  it('marks exactly "COMING SOON" as the emphasised fragment', () => {
    expect(TRACK3_NOTICE.emphasis).toBe("COMING SOON");
    const html = renderHome();
    expect(html).toContain(
      '<strong class="status-emphasis">COMING SOON</strong>',
    );
  });

  it("drops the retired submission-status notice", () => {
    const html = renderHome();
    expect(html).not.toContain("temporarily closed");
    expect(html).not.toContain("SUBMISSION STATUS");
    expect(html).not.toContain("deadline-");
  });

  it("styles the title and emphasis rules in the stylesheet", () => {
    // Guard the visual contract: title bold + italic, emphasis bold +
    // enlarged + amber, defined once.
    const css = readFileSync(
      new URL("../src/styles.css", import.meta.url),
      "utf8",
    );
    const emphasis =
      /\.status-emphasis\s*\{([\s\S]*?)\}/.exec(css)?.[1] ?? "";
    expect(emphasis).toContain("font-weight: 800");
    expect(emphasis).toContain("font-size: 1.35rem");
    expect(emphasis).toContain("var(--accent-amber)");
    expect(css).toContain("--accent-amber: #d97706;");

    const title = /\.status-title\s*\{([\s\S]*?)\}/.exec(css)?.[1] ?? "";
    expect(title).toContain("font-weight: 700");
    expect(title).toContain("font-style: italic");
  });
});
