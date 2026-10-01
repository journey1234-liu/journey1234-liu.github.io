// Home page "Latest updates" list: the retired announcements must stay gone
// and the 2026-10-01 re-opening notice must render verbatim, newest first.
import { describe, it, expect } from "vitest";
import { NEWS } from "../src/content";
import { renderHome } from "../src/pages";

const RETIRED_DATES = ["2026-09-18", "2026-07-31", "2026-06-15"];

describe("home news list", () => {
  it("lists exactly the two current announcements, newest first", () => {
    expect(NEWS.map((n) => n.date)).toEqual(["2026-10-01", "2026-08-20"]);
  });

  it("carries the re-opening announcement verbatim", () => {
    const latest = NEWS[0];
    expect(latest.date).toBe("2026-10-01");
    expect(latest.title).toBe("Track-1 & Track-2 submission re-opened!");
    expect(latest.detail).toBe(
      "Both Validation Phase submissions and Final Test Phase submissions are now limited to once per day. Final Test Phase leaderboard is now public and updated manually.",
    );
  });

  it("renders the re-opening entry with the ampersand escaped", () => {
    const html = renderHome();
    expect(html).toContain(
      "<strong>2026-10-01</strong> — Track-1 &amp; Track-2 submission re-opened!",
    );
    expect(html).toContain(
      "Both Validation Phase submissions and Final Test Phase submissions are now limited to once per day.",
    );
    expect(html).toContain("Final Test Phase leaderboard is now public and updated manually.");
  });

  it("keeps every retired announcement out of content and markup", () => {
    const html = renderHome();
    for (const date of RETIRED_DATES) {
      expect(NEWS.map((n) => n.date)).not.toContain(date);
      expect(html).not.toContain(date);
    }
    expect(html).not.toContain("Challenge website and registration are now open!");
    expect(html).not.toContain("Validation phase submission for Track 1 and Track 2 open!");
    expect(html).not.toContain("Updated submission rules for the Validation and Final Test Phases");
  });

  it("renders one list item per announcement", () => {
    const html = renderHome();
    const newsList = /<ul class="news-list">([\s\S]*?)<\/ul>/.exec(html)?.[1] ?? "";
    expect(newsList).not.toBe("");
    expect((newsList.match(/<li>/g) ?? []).length).toBe(NEWS.length);
  });
});
