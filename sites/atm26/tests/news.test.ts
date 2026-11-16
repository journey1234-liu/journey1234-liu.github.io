// Home page "Latest updates" list: the retired announcements must stay gone
// and the 2026-10-01 re-opening notice must render verbatim, newest first.
import { describe, it, expect } from "vitest";
import { NEWS } from "../src/content";
import { renderHome } from "../src/pages";

const RETIRED_DATES = ["2026-09-18", "2026-07-31", "2026-06-15"];

describe("home news list", () => {
  it("lists the current announcements, newest first", () => {
    expect(NEWS.map((n) => n.date)).toEqual([
      "2026-11-16",
      "2026-11-15",
      "2026-11-13",
      "2026-10-08",
      "2026-10-01",
      "2026-08-20",
    ]);
  });

  it("announces the Track 3 leaderboard and the release of its label guide and baseline", () => {
    const release = NEWS[0];
    expect(release.date).toBe("2026-11-16");
    expect(release.title).toBe(
      "Track 3 label guide, container contract and baseline released",
    );
    expect(release.detail).toContain("Hugging Face");
    expect(release.detail).toContain("training data is being uploaded");

    const latest = NEWS.find((n) => n.date === "2026-11-15")!;
    expect(latest.title).toBe("Track 3 leaderboard opened");
    expect(latest.detail).toContain("frame Macro-F1");
  });

  it("announces the Longterm Test board and its first post-challenge result", () => {
    const latest = NEWS.find((n) => n.date === "2026-11-13")!;
    expect(latest.date).toBe("2026-11-13");
    expect(latest.title).toBe(
      "Longterm Test leaderboard opened — deeptree takes the Track 2 lead",
    );
    expect(latest.detail).toContain("MICCAI 26 challenge submission");
    expect(latest.detail).toContain("Post-MICCAI 26 challenge submission");
  });

  it("announces the MICCAI 26 archive", () => {
    const archive = NEWS.find((n) => n.date === "2026-10-08")!;
    expect(archive.date).toBe("2026-10-08");
    expect(archive.title).toBe("MICCAI 26 results frozen and archived");
  });

  it("carries the re-opening announcement verbatim", () => {
    const reopening = NEWS.find((n) => n.date === "2026-10-01")!;
    expect(reopening.title).toBe("Track-1 & Track-2 submission re-opened!");
    expect(reopening.detail).toBe(
      "Both Validation Phase submissions and Final Test Phase submissions are now limited to once every 24 hours. The Final Test ranking is published on the Longterm Test board, which is updated manually by the organizers.",
    );
  });

  it("renders the re-opening entry with the ampersand escaped", () => {
    const html = renderHome();
    expect(html).toContain(
      "<strong>2026-10-01</strong> — Track-1 &amp; Track-2 submission re-opened!",
    );
    expect(html).toContain(
      "Both Validation Phase submissions and Final Test Phase submissions are now limited to once every 24 hours.",
    );
    expect(html).toContain(
      "The Final Test ranking is published on the Longterm Test board, which is updated manually by the organizers.",
    );
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
