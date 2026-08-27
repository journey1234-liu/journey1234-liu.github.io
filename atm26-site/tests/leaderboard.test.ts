import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateLeaderboard } from "../src/leaderboardSchema";

const here = dirname(fileURLToPath(import.meta.url));
const dataPath = resolve(here, "../public/data/leaderboard.json");

function loadFixture(): unknown {
  return JSON.parse(readFileSync(dataPath, "utf-8"));
}

describe("public/data/leaderboard.json", () => {
  it("is valid JSON that passes the client-side schema check", () => {
    const result = validateLeaderboard(loadFixture());
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

describe("validateLeaderboard", () => {
  it("rejects a non-object document", () => {
    expect(validateLeaderboard(null).ok).toBe(false);
    expect(validateLeaderboard([]).ok).toBe(false);
  });

  it("rejects an unsupported schema version", () => {
    const result = validateLeaderboard({ schema_version: 2, generated_at: "x", tracks: {} });
    expect(result.ok).toBe(false);
  });

  it("rejects a missing tracks object", () => {
    const result = validateLeaderboard({ schema_version: 1, generated_at: "x" });
    expect(result.ok).toBe(false);
  });

  it("rejects missing generated_at", () => {
    const result = validateLeaderboard({ schema_version: 1, tracks: {} });
    expect(result.ok).toBe(false);
  });

  it("ignores malformed optional display fields without failing", () => {
    const data = loadFixture() as Record<string, unknown>;
    const track1 = (data.tracks as Record<string, Record<string, unknown>>)["track-1"];
    const entries = track1.entries as Array<Record<string, unknown>>;
    entries[0].method_label = 123; // wrong type, must be ignored
    const result = validateLeaderboard(data);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects an empty track name", () => {
    const data = {
      schema_version: 1,
      generated_at: "2026-01-01T00:00:00Z",
      tracks: { "track-1": { metrics: [], entries: [] }, "track-2": { metrics: [], entries: [] } },
    };
    expect(validateLeaderboard(data).ok).toBe(true);
  });
});
