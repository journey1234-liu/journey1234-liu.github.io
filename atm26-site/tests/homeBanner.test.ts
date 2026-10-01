// Home page banner below the hero: it must announce Track-3 status only.
// The former "SUBMISSION STATUS / temporarily closed" notice was retired and
// must not come back through content or markup.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { TRACK3_NOTICE } from "../src/content";
import { renderHome } from "../src/pages";

describe("home Track-3 status banner", () => {
  it("renders the kicker and the full Track-3 sentence", () => {
    const html = renderHome();
    expect(html).toContain("TRACK-3 STATUS");
    expect(html).toContain(
      "Track 3: Landmark recognition for endobronchial intervention",
    );
    expect(html).toContain("COMING SOON");
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

  it("carries the amber emphasis rule in the stylesheet", () => {
    // Guard the visual contract: bold + enlarged + amber, defined once.
    const css = readFileSync(
      new URL("../src/styles.css", import.meta.url),
      "utf8",
    );
    const rule = /\.status-emphasis\s*\{([\s\S]*?)\}/.exec(css)?.[1] ?? "";
    expect(rule).toContain("font-weight: 800");
    expect(rule).toContain("font-size: 1.35rem");
    expect(rule).toContain("var(--accent-amber)");
    expect(css).toContain("--accent-amber: #d97706;");
  });
});
