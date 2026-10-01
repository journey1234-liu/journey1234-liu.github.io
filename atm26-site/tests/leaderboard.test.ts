import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateLeaderboard, parseLeaderboard } from "../src/leaderboardSchema";
import { renderLeaderboard } from "../src/leaderboard";

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

  it("still opens on the Final Test board by default", () => {
    const html = renderShellHtml();
    expect(html).toContain(
      '<a class="lb-tab is-active" href="#/leaderboard/final-test" aria-current="true">Final Test Phase</a>',
    );
    expect(html).not.toContain(
      '<a class="lb-tab is-active" href="#/leaderboard/validation"',
    );
  });

  it("marks the Validation tab active when the route asks for it", () => {
    const html = renderShellHtml("validation");
    expect(html).toContain(
      '<a class="lb-tab is-active" href="#/leaderboard/validation" aria-current="true">Validation Phase</a>',
    );
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
