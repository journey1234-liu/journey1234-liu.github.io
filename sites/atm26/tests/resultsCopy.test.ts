// Editorial regression guard: the Final Test Phase leaderboard is public and
// maintained by hand, so no page may still claim that its results are
// confidential or not yet released.
import { describe, it, expect } from "vitest";
import * as content from "../src/content";

const allCopy = JSON.stringify(content);

describe("published-results copy", () => {
  it("never calls results confidential again", () => {
    expect(allCopy).not.toMatch(/confidential/i);
  });

  it("never promises a future Final Test release", () => {
    expect(allCopy).not.toMatch(/shall be released/i);
    expect(allCopy).not.toMatch(/remain confidential/i);
  });

  it("states that the MICCAI 26 results are frozen and the longterm board is open", () => {
    expect(content.LEADERBOARD_NOTICE).toContain("MICCAI 26 Final Test board is a frozen archive");
    expect(content.LEADERBOARD_NOTICE).toContain("Longterm Test board");
    expect(content.LEADERBOARD_NOTICE).toContain("Longterm Validation board");
    const faq = content.FAQ.find((item) => item.question === "Is the leaderboard final?");
    expect(faq?.answer).toContain("frozen archive");
    expect(faq?.answer).toContain("updated manually by the organizers");
    expect(faq?.answer).toContain("Track 3 validation board");

    const tip = content.SUBMISSION_TIPS.find((item) =>
      item.title.startsWith("Evaluation takes hours"),
    );
    expect(tip?.note).toContain("Longterm Test leaderboard");

    // The era tags are explained wherever a reader can meet them.
    expect(content.SUBMISSION_TAG_LABELS.miccai26).toBe("MICCAI 26 challenge submission");
    expect(content.SUBMISSION_TAG_LABELS["post-miccai26"]).toBe(
      "Post-MICCAI 26 challenge submission",
    );
    expect(content.PHASE_NOTICES["longterm-test"]).toContain(
      "Post-MICCAI 26 challenge submission",
    );
    expect(Object.keys(content.PHASE_UPDATE_LOGS)).toEqual([
      "miccai26-final-test",
      "longterm-test",
      "longterm-validation",
      "track3-test",
      "track3-validation",
    ]);

    const longtermPortal = content.SUBMISSION_PORTALS.find(
      (portal) => portal.title === "Track-1 · Longterm Test",
    );
    expect(longtermPortal?.facts.join(" ")).toContain(
      "Post-MICCAI long-term Final Test intake",
    );
    expect(content.PHASE_NOTICES["longterm-validation"]).toContain(
      "Continuously maintained Validation leaderboard",
    );
  });
});
