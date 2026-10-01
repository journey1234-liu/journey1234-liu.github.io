import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateLeaderboard, parseLeaderboard } from "../src/leaderboardSchema";
import { renderLeaderboard, renderBoard } from "../src/leaderboard";

const here = dirname(fileURLToPath(import.meta.url));
const dataPath = resolve(here, "../public/data/leaderboard.json");

function loadFixture(): Record<string, unknown> {
  return JSON.parse(readFileSync(dataPath, "utf-8"));
}

/** Renders the leaderboard shell without a DOM: only innerHTML is captured. */
function renderShellHtml(activePhaseId: string | null = null): string {
  const container = {
    innerHTML: "",
    querySelector: () => null,
    querySelectorAll: () => [],
  } as unknown as HTMLElement;
  renderLeaderboard(container, loadFixture(), activePhaseId);
  return container.innerHTML;
}

describe("public/data/leaderboard.json", () => {
  it("is valid JSON that passes the client-side schema check", () => {
    const result = validateLeaderboard(loadFixture());
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("contains both the validation and final-test phases", () => {
    const data = loadFixture();
    const phases = data.phases as Record<string, unknown>;
    expect(Object.keys(phases)).toContain("validation");
    expect(Object.keys(phases)).toContain("final-test");
  });

  it("provides both tracks for every phase", () => {
    const data = loadFixture();
    const phases = data.phases as Record<string, { tracks: Record<string, unknown> }>;
    for (const phase of Object.values(phases)) {
      expect(Object.keys(phase.tracks)).toEqual(["track-1", "track-2"]);
    }
  });
});

describe("validateLeaderboard", () => {
  it("rejects a non-object document", () => {
    expect(validateLeaderboard(null).ok).toBe(false);
    expect(validateLeaderboard([]).ok).toBe(false);
  });

  it("rejects an unsupported schema version", () => {
    const result = validateLeaderboard({ schema_version: 1, generated_at: "x", phases: {} });
    expect(result.ok).toBe(false);
  });

  it("rejects a missing phases object", () => {
    const result = validateLeaderboard({ schema_version: 2, generated_at: "x" });
    expect(result.ok).toBe(false);
  });

  it("rejects an empty phases object", () => {
    const result = validateLeaderboard({ schema_version: 2, generated_at: "x", phases: {} });
    expect(result.ok).toBe(false);
  });

  it("rejects missing generated_at", () => {
    const result = validateLeaderboard({ schema_version: 2, phases: { validation: { tracks: {} } } });
    expect(result.ok).toBe(false);
  });

  it("rejects a phase missing a required track", () => {
    const result = validateLeaderboard({
      schema_version: 2,
      generated_at: "2026-01-01T00:00:00Z",
      phases: {
        validation: {
          tracks: { "track-1": { metrics: [], entries: [] } },
        },
      },
    });
    expect(result.ok).toBe(false);
  });

  it("ignores malformed optional display fields without failing", () => {
    const data = loadFixture();
    const phases = data.phases as Record<string, { tracks: Record<string, { entries: Array<Record<string, unknown>> }> }>;
    // The published snapshot may have no entries yet (empty leaderboard);
    // fabricate one so the malformed-field path is still exercised.
    const track = phases.validation.tracks["track-1"];
    const entry = track.entries[0] ?? { rank: 1, team_display_name: "x", metrics: {} };
    entry.method_label = 123; // wrong type, ignored
    if (track.entries.length === 0) track.entries.push(entry);
    const result = validateLeaderboard(data);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe("phase selector", () => {
  it("lists the Validation Phase button before the Final Test Phase button", () => {
    const html = renderShellHtml();
    const validation = html.indexOf(">Validation Phase</a>");
    const finalTest = html.indexOf(">Final Test Phase</a>");
    expect(validation).toBeGreaterThan(-1);
    expect(finalTest).toBeGreaterThan(-1);
    expect(validation).toBeLessThan(finalTest);
  });

  it("opens on the Validation board by default", () => {
    const html = renderShellHtml();
    expect(html).toContain(
      '<a class="lb-tab is-active" href="#/leaderboard/validation" aria-current="true">Validation Phase</a>',
    );
    expect(html).not.toContain(
      '<a class="lb-tab is-active" href="#/leaderboard/final-test"',
    );
  });

  it("marks the Final Test tab active when the route asks for it", () => {
    const html = renderShellHtml("final-test");
    expect(html).toContain(
      '<a class="lb-tab is-active" href="#/leaderboard/final-test" aria-current="true">Final Test Phase</a>',
    );
    expect(html).not.toContain(
      '<a class="lb-tab is-active" href="#/leaderboard/validation"',
    );
  });

  it("defaults to the unfrozen Validation phase, not the frozen Final Test phase", () => {
    // Only the Final Test phase carries a results cutoff, and the shell renders
    // the frozen notice of the active phase — so it proves which phase the
    // default route resolved to.
    expect(renderShellHtml()).not.toContain("Frozen snapshot");
    expect(renderShellHtml("final-test")).toContain("Frozen snapshot");
  });
});

describe("Track-1 ranking metrics", () => {
  const TRACK_1 = ["DSC", "clDice", "TLD", "BD", "Betti0Error"];

  it("ranks Track-1 on the five documented metrics in both phases", () => {
    const phases = loadFixture().phases as Record<
      string,
      { tracks: Record<string, { metrics: Array<{ name: string; higher_is_better: boolean }> }> }
    >;
    for (const phaseId of ["validation", "final-test"]) {
      const metrics = phases[phaseId].tracks["track-1"].metrics;
      expect(metrics.map((m) => m.name)).toEqual(TRACK_1);
      // Betti0Error is the one lower-is-better metric of Track 1.
      const betti = metrics.find((m) => m.name === "Betti0Error");
      expect(betti?.higher_is_better).toBe(false);
    }
  });

  it("publishes a numeric Betti0Error for every ranked Track-1 row", () => {
    const phases = loadFixture().phases as Record<
      string,
      {
        tracks: Record<
          string,
          { entries: Array<{ team_display_name: string; metrics: Record<string, unknown> }> }
        >;
      }
    >;
    for (const phaseId of ["validation", "final-test"]) {
      const entries = phases[phaseId].tracks["track-1"].entries;
      if (entries.length === 0) continue; // phase not released yet
      for (const entry of entries) {
        expect(
          typeof entry.metrics.Betti0Error,
          `${phaseId}/${entry.team_display_name}`,
        ).toBe("number");
      }
    }
  });

  it("keeps the ranking policy honest for a lower-is-better metric", () => {
    // The published row order must follow mean_rank, which must equal the mean
    // of the per-metric ranks — including Betti0Error's.
    const phase = (loadFixture().phases as Record<string, {
      tracks: Record<string, {
        metrics: Array<{ name: string }>;
        entries: Array<{
          rank: number;
          mean_rank: number;
          metric_ranks: Record<string, number>;
          team_display_name: string;
        }>;
      }>;
    }>)["validation"].tracks["track-1"];
    const names = phase.metrics.map((m) => m.name);
    for (const entry of phase.entries) {
      const expected =
        names.reduce((sum, name) => sum + entry.metric_ranks[name], 0) / names.length;
      expect(entry.mean_rank, entry.team_display_name).toBeCloseTo(expected, 9);
    }
  });
});

describe("board paging", () => {
  const track = () =>
    parseLeaderboard(loadFixture()).snapshot!.phases["validation"].tracks["track-1"];
  const ASC = { key: "rank", dir: "asc" as const };
  const bodyRows = (html: string): number =>
    (/<tbody>([\s\S]*?)<\/tbody>/.exec(html)?.[1].match(/<tr>/g) ?? []).length;

  it("shows 20 rows per page by default and reports the range", () => {
    const html = renderBoard("Validation Phase", "track-1", track(), "", ASC);
    expect(bodyRows(html)).toBe(20);
    expect(html).toContain('<option value="20" selected>20</option>');
    expect(html).toContain("1–20 of 30 teams");
    expect(html).toContain("Page 1 of 2");
    expect(html).toContain('<button type="button" data-page="prev" disabled>');
  });

  it("offers 10 / 20 / 50 / all as rows-per-page choices", () => {
    const html = renderBoard("Validation Phase", "track-1", track(), "", ASC);
    const options = [...html.matchAll(/<option value="(\d+)"[^>]*>([^<]+)<\/option>/g)].map(
      (m) => [m[1], m[2]],
    );
    expect(options).toEqual([
      ["10", "10"],
      ["20", "20"],
      ["50", "50"],
      ["0", "All"],
    ]);
  });

  it("honours a smaller page size and pages through the board", () => {
    const first = renderBoard("Validation Phase", "track-1", track(), "", ASC, {
      size: 10,
      index: 0,
    });
    expect(bodyRows(first)).toBe(10);
    expect(first).toContain("1–10 of 30 teams");
    expect(first).toContain("Page 1 of 3");

    const second = renderBoard("Validation Phase", "track-1", track(), "", ASC, {
      size: 10,
      index: 1,
    });
    expect(bodyRows(second)).toBe(10);
    expect(second).toContain("11–20 of 30 teams");
    expect(second).toContain("Page 2 of 3");
    expect(second).not.toBe(first);
  });

  it('shows every row and no page navigation for "All"', () => {
    const html = renderBoard("Validation Phase", "track-1", track(), "", ASC, {
      size: 0,
      index: 0,
    });
    expect(bodyRows(html)).toBe(30);
    expect(html).toContain("1–30 of 30 teams");
    expect(html).not.toContain("lb-pagenav");
  });

  it("clamps an out-of-range page index to the last page", () => {
    const page = { size: 10, index: 99 };
    const html = renderBoard("Validation Phase", "track-1", track(), "", ASC, page);
    expect(page.index).toBe(2); // clamped in place
    expect(html).toContain("21–30 of 30 teams");
    expect(html).toContain("Page 3 of 3");
    expect(html).toContain('<button type="button" data-page="next" disabled>');
  });

  it("pages the filtered rows, not the whole board", () => {
    const html = renderBoard("Validation Phase", "track-1", track(), "must-medai", ASC, {
      size: 10,
      index: 0,
    });
    expect(bodyRows(html)).toBe(1);
    expect(html).toContain("1–1 of 1 team");
  });

  it("renders no pager when the search matches nothing", () => {
    const html = renderBoard("Validation Phase", "track-1", track(), "zzzz", ASC);
    expect(html).toContain("No teams match");
    expect(html).not.toContain("lb-pager");
  });
});

describe("phase update log", () => {
  it("sits under the Validation board with the Betti-0 entry", () => {
    const html = renderShellHtml();
    expect(html).toContain('<div class="section-kicker">Update log</div>');
    expect(html).toContain("<strong>2026-10-01</strong>");
    expect(html).toContain(
      "We are adding Betti-0 error back to validation phase ranking metric to enable more comprehensive evaluation! Newer metric design are on the way.",
    );
    // below the board container
    expect(html.indexOf("lb-boards")).toBeLessThan(html.indexOf("lb-updatelog"));
  });

  it("is not rendered for the Final Test phase", () => {
    const html = renderShellHtml("final-test");
    expect(html).not.toContain("lb-updatelog");
    expect(html).not.toContain("Update log");
  });
});

describe("Final Test origin + results cutoff", () => {
  const envelope = (phase: Record<string, unknown>) => ({
    schema_version: 2,
    generated_at: "2026-10-01T00:00:00Z",
    phases: {
      "final-test": {
        tracks: { "track-1": { metrics: [], entries: [] }, "track-2": { metrics: [], entries: [] } },
        ...phase,
      },
    },
  });

  it("keeps the seeded marker and drops unknown origins", () => {
    const { snapshot } = parseLeaderboard({
      schema_version: 2,
      generated_at: "2026-10-01T00:00:00Z",
      phases: {
        "final-test": {
          tracks: {
            "track-1": {
              metrics: [{ name: "DSC", higher_is_better: true }],
              entries: [
                { rank: 1, team_display_name: "own-team", metrics: { DSC: 0.9 }, origin: "own" },
                { rank: 2, team_display_name: "seed-team", metrics: { DSC: 0.8 }, origin: "seeded" },
                { rank: 3, team_display_name: "odd-team", metrics: { DSC: 0.7 }, origin: "something-else" },
              ],
            },
            "track-2": { metrics: [], entries: [] },
          },
        },
      },
    });
    const entries = snapshot!.phases["final-test"].tracks["track-1"].entries;
    expect(entries[0].origin).toBe("own");
    expect(entries[1].origin).toBe("seeded");
    expect(entries[2].origin).toBeUndefined();
  });

  it("carries the frozen flag and the results cutoff of a phase", () => {
    const { snapshot } = parseLeaderboard(
      envelope({ frozen: true, results_cutoff: "2026-09-23T06:59:00+00:00" }),
    );
    const phase = snapshot!.phases["final-test"];
    expect(phase.frozen).toBe(true);
    expect(phase.results_cutoff).toBe("2026-09-23T06:59:00+00:00");
  });

  it("ignores a malformed cutoff and a non-true frozen flag", () => {
    const { snapshot } = parseLeaderboard(
      envelope({ frozen: "yes", results_cutoff: 12345 }),
    );
    const phase = snapshot!.phases["final-test"];
    expect(phase.frozen).toBeUndefined();
    expect(phase.results_cutoff).toBeUndefined();
  });

  it("publishes a Final Test board whose rows are all labelled", () => {
    const data = loadFixture();
    const phase = (data.phases as Record<string, {
      frozen?: boolean;
      results_cutoff?: string;
      tracks: Record<string, { entries: Array<{ origin?: string; team_display_name: string }> }>;
    }>)["final-test"];
    if (phase.tracks["track-1"].entries.length === 0) return; // not released yet
    expect(phase.frozen).toBe(true);
    expect(typeof phase.results_cutoff).toBe("string");
    for (const trackId of ["track-1", "track-2"]) {
      const entries = phase.tracks[trackId].entries;
      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) {
        expect(["own", "seeded"]).toContain(entry.origin);
      }
    }
  });
});
