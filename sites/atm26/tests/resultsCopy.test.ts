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

  it("states that the Final Test board is public and updated manually", () => {
    expect(content.LEADERBOARD_NOTICE).toContain("updated manually");
    const faq = content.FAQ.find((item) => item.question === "Is the leaderboard final?");
    expect(faq?.answer).toContain("Both leaderboards are public");
    expect(faq?.answer).toContain("updated manually by the organizers");

    const tip = content.SUBMISSION_TIPS.find((item) =>
      item.title.startsWith("Evaluation takes hours"),
    );
    expect(tip?.note).toContain("Final Test Phase leaderboard");
    const deadlineTip = content.SUBMISSION_TIPS.find((item) =>
      item.title.startsWith("Deadlines and release"),
    );
    expect(deadlineTip?.note).toContain("is public and updated manually");

    const finalTestPortal = content.SUBMISSION_PORTALS.find((portal) =>
      portal.title.startsWith("Final Test Phase"),
    );
    expect(finalTestPortal?.facts.join(" ")).toContain(
      "released with the ATM26 Workshop on Oct 1st",
    );
  });
});
