import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateLeaderboard } from "../src/leaderboardSchema";

const here = dirname(fileURLToPath(import.meta.url));
const dataPath = resolve(here, "../public/data/leaderboard.json");

function loadFixture(): Record<string, unknown> {
  return JSON.parse(readFileSync(dataPath, "utf-8"));
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
