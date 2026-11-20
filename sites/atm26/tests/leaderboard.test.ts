import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateLeaderboard, parseLeaderboard } from "../src/leaderboardSchema";
import {
  renderLeaderboard,
  renderBoard,
  readStoredPageSize,
  DEFAULT_PAGE_SIZE,
} from "../src/leaderboard";
import { metricLabel } from "../src/metricLabels";
import { renderTracks } from "../src/pages";

const here = dirname(fileURLToPath(import.meta.url));
const dataPath = resolve(here, "../public/data/leaderboard.json");

function loadFixture(): Record<string, unknown> {
  return JSON.parse(readFileSync(dataPath, "utf-8"));
}

/** Renders the leaderboard shell without a DOM: only innerHTML is captured. */
function renderShellHtml(route: string | string[] = []): string {
  const container = {
    innerHTML: "",
    querySelector: () => null,
    querySelectorAll: () => [],
  } as unknown as HTMLElement;
  renderLeaderboard(container, loadFixture(), Array.isArray(route) ? route : route ? [route] : []);
  return container.innerHTML;
}

describe("public/data/leaderboard.json", () => {
  it("is valid JSON that passes the client-side schema check", () => {
    const result = validateLeaderboard(loadFixture());
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("carries the MICCAI 26 archives, both longterm boards and Track 3", () => {
    const data = loadFixture();
    const phases = data.phases as Record<string, unknown>;
    expect(Object.keys(phases)).toEqual([
      "miccai26-final-test",
      "longterm-test",
      "longterm-validation",
      "track3-test",
      "track3-validation",
    ]);
  });

  it("marks the archive phases frozen and the longterm phase live", () => {
    const phases = loadFixture().phases as Record<
      string,
      { frozen?: boolean; results_cutoff?: string; label: string }
    >;
    for (const phaseId of ["miccai26-final-test"]) {
      expect(phases[phaseId].frozen, phaseId).toBe(true);
      expect(typeof phases[phaseId].results_cutoff, phaseId).toBe("string");
    }
    for (const phaseId of ["longterm-test", "longterm-validation"]) {
      expect(phases[phaseId].frozen, phaseId).toBeUndefined();
      expect(phases[phaseId].results_cutoff, phaseId).toBeUndefined();
    }
    expect(phases["longterm-test"].label).toBe("Longterm Test");
    expect(phases["longterm-validation"].label).toBe("Longterm Validation");
  });

  it("serves validation only through the tagged Longterm Validation board", () => {
    const phases = loadFixture().phases as Record<
      string,
      { tracks: Record<string, { entries: Array<{ team_display_name: string; submission_tag?: string }> }> }
    >;
    // there is no separate frozen validation board any more
    expect(phases["miccai26-validation"]).toBeUndefined();
    for (const trackId of ["track-1", "track-2"]) {
      const entries = phases["longterm-validation"].tracks[trackId].entries;
      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) {
        expect(["miccai26", "post-miccai26"]).toContain(entry.submission_tag);
      }
      // the historical ranking is still the baseline of the board
      expect(entries.some((entry) => entry.submission_tag === "miccai26")).toBe(true);
    }
  });

  it("marks deeptree's latest validation method as post-challenge", () => {
    const phases = loadFixture().phases as Record<
      string,
      { tracks: Record<string, { entries: Array<{ team_display_name: string; submission_tag?: string }> }> }
    >;
    const board = phases["longterm-validation"].tracks["track-2"];
    const deeptree = board.entries.filter((entry) =>
      entry.team_display_name.includes("deeptree"),
    );
    // same method version as the post-challenge Final Test run: one row, post-tagged
    expect(deeptree.length).toBe(1);
    expect(deeptree[0].submission_tag).toBe("post-miccai26");
  });

  it("tags every longterm row as a challenge or post-challenge submission", () => {
    const phases = loadFixture().phases as Record<
      string,
      { tracks: Record<string, { entries: Array<{ team_display_name: string; submission_tag?: string }> }> }
    >;
    const entries = Object.values(phases["longterm-test"].tracks).flatMap((t) => t.entries);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(["miccai26", "post-miccai26"], entry.team_display_name).toContain(entry.submission_tag);
    }
    // The archived boards carry no tag: every row there is a challenge entry.
    for (const phaseId of ["miccai26-final-test"]) {
      for (const track of Object.values(phases[phaseId].tracks)) {
        for (const entry of track.entries) {
          expect(entry.submission_tag, `${phaseId}/${entry.team_display_name}`).toBeUndefined();
        }
      }
    }
  });

  it("ranks the post-challenge deeptree result first on Track 2", () => {
    const phases = loadFixture().phases as Record<
      string,
      {
        tracks: Record<
          string,
          { entries: Array<{ rank: number; team_display_name: string; submission_tag?: string }> }
        >;
      }
    >;
    const top = phases["longterm-test"].tracks["track-2"].entries[0];
    expect(top.team_display_name).toBe("deeptree");
    expect(top.submission_tag).toBe("post-miccai26");
    expect(top.rank).toBe(1);

    // The team's frozen challenge submission is still on the board, below it.
    const frozen = phases["longterm-test"].tracks["track-2"].entries.filter(
      (entry) => entry.submission_tag === "miccai26" && entry.team_display_name === "deeptree",
    );
    expect(frozen).toHaveLength(1);
    expect(frozen[0].rank).toBeGreaterThan(top.rank);

    // The archive does not move: deeptree is still second on the frozen board.
    const archive = phases["miccai26-final-test"].tracks["track-2"].entries;
    expect(archive.find((entry) => entry.team_display_name === "deeptree")?.rank).toBe(2);
  });

  it("declares each phase's tracks, and only those, in track_order", () => {
    const data = loadFixture();
    const phases = data.phases as Record<
      string,
      { tracks: Record<string, unknown>; track_order: string[] }
    >;
    for (const [phaseId, phase] of Object.entries(phases)) {
      expect(phase.track_order, phaseId).toEqual(Object.keys(phase.tracks));
      const expected =
        phaseId.startsWith("track3")
          ? ["track-3"]
          : ["track-1", "track-2"];
      expect(phase.track_order, phaseId).toEqual(expected);
    }
  });
});

describe("schema 3 (per-phase tracks)", () => {
  const phase = (order: string[] | undefined, tracks: Record<string, unknown>) => ({
    schema_version: 3,
    generated_at: "2026-11-15T00:00:00+00:00",
    phases: {
      "track3-test": {
        label: "Track 3 · Test",
        ...(order === undefined ? {} : { track_order: order }),
        tracks,
      },
    },
  });

  it("accepts a phase with a single track", () => {
    const result = validateLeaderboard(
      phase(["track-3"], {
        "track-3": { metrics: [{ name: "frame_accuracy", higher_is_better: true }], entries: [] },
      }),
    );
    expect(result.errors).toEqual([]);
    expect(result.snapshot?.phases["track3-test"].trackOrder).toEqual(["track-3"]);
  });

  it("rejects a schema-3 phase without track_order", () => {
    const result = validateLeaderboard(
      phase(undefined, { "track-3": { metrics: [], entries: [] } }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("track_order");
  });

  it("rejects a track_order that names an undeclared track", () => {
    const result = validateLeaderboard(
      phase(["track-3", "track-2"], { "track-3": { metrics: [], entries: [] } }),
    );
    expect(result.ok).toBe(false);
  });

  it("still accepts a schema-2 document with the two CT tracks", () => {
    const legacy = {
      schema_version: 2,
      generated_at: "2026-11-13T00:00:00+00:00",
      phases: {
        "miccai26-validation": {
          tracks: {
            "track-1": { metrics: [], entries: [] },
            "track-2": { metrics: [], entries: [] },
          },
        },
      },
    };
    const result = validateLeaderboard(legacy);
    expect(result.ok).toBe(true);
    expect(result.snapshot?.phases["miccai26-validation"].trackOrder).toEqual([
      "track-1",
      "track-2",
    ]);
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
    const track = phases["longterm-test"].tracks["track-1"];
    const entry = track.entries[0] ?? { rank: 1, team_display_name: "x", metrics: {} };
    entry.method_label = 123; // wrong type, ignored
    if (track.entries.length === 0) track.entries.push(entry);
    const result = validateLeaderboard(data);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe("track-first navigation", () => {
  it("puts the three tracks in the top row and the boards in the second", () => {
    const html = renderShellHtml();
    expect(html).toContain('aria-label="Track"');
    expect(html).toContain('aria-label="Board"');
    for (const id of ["track-1", "track-2", "track-3"]) {
      expect(html).toContain(`href="#/leaderboard/${id}/`);
    }
    expect(html).toContain(">Track 1</a>");
    expect(html).toContain(">Track 2</a>");
    expect(html).toContain(">Track 3</a>");
  });

  it("opens on the frozen MICCAI 26 Final Test board of Track-1 by default", () => {
    const html = renderShellHtml();
    expect(html).toContain(
      '<a class="lb-tab is-active" href="#/leaderboard/track-1/miccai26-final-test" aria-current="page">Track 1</a>',
    );
    expect(html).toContain(
      '<a class="lb-tab is-active" href="#/leaderboard/track-1/miccai26-final-test" aria-current="page">MICCAI 26 Final Test</a>',
    );
    expect(html).toContain("Frozen snapshot");
  });

  it("keeps the MICCAI archive left of the longterm boards", () => {
    const html = renderShellHtml(["track-1", "miccai26-final-test"]);
    const order = [
      ">MICCAI 26 Final Test</a>",
      ">Longterm Test</a>",
      ">Longterm Validation</a>",
    ].map((label) => html.indexOf(label));
    expect(order.every((index) => index > -1)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("shows only the boards of the selected track", () => {
    const track3 = renderShellHtml(["track-3", "track3-validation"]);
    expect(track3).toContain(">Validation</a>");
    expect(track3).toContain(">Final Test<");
    expect(track3).not.toContain(">MICCAI 26 Final Test</a>");
    expect(track3).not.toContain(">Longterm Test</a>");
    expect(track3).not.toContain(">MICCAI 26 Validation</a>");
  });

  it("lands Track-3 on its open board, not the locked one", () => {
    const html = renderShellHtml(["track-3"]);
    expect(html).toContain(
      '<a class="lb-tab is-active" href="#/leaderboard/track-3/track3-validation" aria-current="page">Validation</a>',
    );
  });

  it("locks the Track-3 Final Test board until the phase opens", () => {
    const html = renderShellHtml(["track-3", "track3-test"]);
    expect(html).toContain("is-locked");
    expect(html).toContain("lb-lock-icon");
    expect(html).toContain("Track 3 · Final Test is locked");
    expect(html).toContain("opens when the phase opens");
  });

  it("marks the longterm board active when the route asks for it", () => {
    const html = renderShellHtml(["track-1", "longterm-test"]);
    expect(html).toContain(
      'href="#/leaderboard/track-1/longterm-test" aria-current="page">Longterm Test</a>',
    );
    expect(html).toContain(
      '<a class="lb-tab is-active" href="#/leaderboard/track-1/miccai26-final-test" aria-current="page">Track 1</a>',
    );
    expect(html).not.toContain("Frozen snapshot");
  });

  it("keeps the pre-split routes working through aliases", () => {
    // The old routes named a board only; they now resolve to Track-1 + board.
    for (const [legacy, target] of [
      ["validation", "longterm-validation"],
      ["miccai26-validation", "longterm-validation"],
      ["final-test", "miccai26-final-test"],
    ]) {
      expect(renderShellHtml(legacy)).toContain(
        `href="#/leaderboard/track-1/${target}" aria-current="page"`,
      );
    }
  });

  it("frames each board in one line", () => {
    expect(renderShellHtml(["track-1", "longterm-test"])).toContain(
      "Continuously maintained Final Test leaderboard",
    );
    expect(renderShellHtml(["track-1", "longterm-validation"])).toContain(
      "Continuously maintained Validation leaderboard",
    );
    expect(renderShellHtml(["track-1", "miccai26-final-test"])).toContain(
      "Final ranking of the MICCAI 26 challenge",
    );
  });
});

describe("Track-1 ranking metrics", () => {
  const TRACK_1 = ["DSC", "clDice", "TLD", "BD", "Betti0Error"];

  it("ranks Track-1 on the five documented metrics in every phase", () => {
    const phases = loadFixture().phases as Record<
      string,
      { tracks: Record<string, { metrics: Array<{ name: string; higher_is_better: boolean }> }> }
    >;
    for (const phaseId of ["longterm-test", "longterm-validation", "miccai26-final-test"]) {
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
    for (const phaseId of ["longterm-test", "longterm-validation", "miccai26-final-test"]) {
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
    }>)["longterm-test"].tracks["track-1"];
    const names = phase.metrics.map((m) => m.name);
    for (const entry of phase.entries) {
      const expected =
        names.reduce((sum, name) => sum + entry.metric_ranks[name], 0) / names.length;
      expect(entry.mean_rank, entry.team_display_name).toBeCloseTo(expected, 9);
    }
  });
});

describe("board paging", () => {
  // The validation archive is the only board with enough rows to page through.
  const track = () =>
    parseLeaderboard(loadFixture()).snapshot!.phases["longterm-validation"].tracks["track-1"];
  const ARCHIVE = { id: "longterm-validation", label: "Longterm Validation" };
  const LONGTERM = { id: "longterm-test", label: "Longterm Test" };
  const FINAL_TEST = { id: "miccai26-final-test", label: "MICCAI 26 · Final Test" };
  const ASC = { key: "rank", dir: "asc" as const };
  const bodyRows = (html: string): number =>
    (/<tbody>([\s\S]*?)<\/tbody>/.exec(html)?.[1].match(/<tr>/g) ?? []).length;

  it("labels the name column per phase: usernames on validation, teams elsewhere", () => {
    expect(renderBoard(ARCHIVE, "track-1", track(), "", ASC)).toContain(
      '<th scope="col" class="lb-team">Username (Team)</th>',
    );
    for (const phase of [FINAL_TEST, LONGTERM]) {
      const html = renderBoard(phase, "track-1", track(), "", ASC);
      expect(html, phase.id).toContain('<th scope="col" class="lb-team">Team</th>');
      expect(html, phase.id).not.toContain("Username (Team)");
    }
  });

  it("renders the era tag of a longterm row and nothing on the archive", () => {
    const snapshot = parseLeaderboard(loadFixture()).snapshot!;
    const longterm = renderBoard(
      LONGTERM, "track-1", snapshot.phases["longterm-test"].tracks["track-1"], "", ASC,
    );
    expect(longterm).toContain("MICCAI 26 challenge submission");
    expect(longterm).not.toContain("Post-MICCAI 26 challenge submission");
    // Track 2 carries the one post-challenge row, next to the frozen ones.
    const longtermTrack2 = renderBoard(
      LONGTERM, "track-2", snapshot.phases["longterm-test"].tracks["track-2"], "", ASC,
    );
    expect(longtermTrack2).toContain("Post-MICCAI 26 challenge submission");
    expect(longtermTrack2).toContain("MICCAI 26 challenge submission");
    const archive = renderBoard(
      FINAL_TEST, "track-1", snapshot.phases["miccai26-final-test"].tracks["track-1"], "", ASC,
    );
    expect(archive).not.toContain("lb-tag");
  });

  it("shows Betti0Error as the β₀ symbol while keeping the sort key", () => {
    const html = renderBoard(ARCHIVE, "track-1", track(), "", ASC);
    expect(html).toContain(
      'data-sort="Betti0Error" class="is-sortable">&beta;<sub>0</sub> error</th>',
    );
    expect(html).not.toContain(">Betti0Error</th>");
    // the other headers keep their plain names
    for (const name of ["DSC", "clDice", "TLD", "BD"]) {
      expect(html).toContain(`data-sort="${name}" class="is-sortable">${name}</th>`);
    }
  });

  it("shows 20 rows per page by default and reports the range", () => {
    const total = track().entries.length; // 28 Validation Track-1 rows today
    expect(total).toBeGreaterThan(DEFAULT_PAGE_SIZE);
    const html = renderBoard(ARCHIVE, "track-1", track(), "", ASC);
    expect(bodyRows(html)).toBe(DEFAULT_PAGE_SIZE);
    expect(html).toContain('<option value="20" selected>20</option>');
    expect(html).toContain(`1–20 of ${total} teams`);
    expect(html).toContain(`Page 1 of ${Math.ceil(total / DEFAULT_PAGE_SIZE)}`);
    expect(html).toContain('<button type="button" data-page="prev" disabled>');
  });

  it("offers 10 / 20 / 50 / all as rows-per-page choices", () => {
    const html = renderBoard(ARCHIVE, "track-1", track(), "", ASC);
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
    const total = track().entries.length;
    const pages = Math.ceil(total / 10);
    const first = renderBoard(ARCHIVE, "track-1", track(), "", ASC, {
      size: 10,
      index: 0,
    });
    expect(bodyRows(first)).toBe(10);
    expect(first).toContain(`1–10 of ${total} teams`);
    expect(first).toContain(`Page 1 of ${pages}`);

    const second = renderBoard(ARCHIVE, "track-1", track(), "", ASC, {
      size: 10,
      index: 1,
    });
    expect(bodyRows(second)).toBe(10);
    expect(second).toContain(`11–20 of ${total} teams`);
    expect(second).toContain(`Page 2 of ${pages}`);
    expect(second).not.toBe(first);
  });

  it('shows every row and no page navigation for "All"', () => {
    const total = track().entries.length;
    const html = renderBoard(ARCHIVE, "track-1", track(), "", ASC, {
      size: 0,
      index: 0,
    });
    expect(bodyRows(html)).toBe(total);
    expect(html).toContain(`1–${total} of ${total} teams`);
    expect(html).not.toContain("lb-pagenav");
  });

  it("clamps an out-of-range page index to the last page", () => {
    const total = track().entries.length;
    const last = Math.ceil(total / 10) - 1;
    const page = { size: 10, index: 99 };
    const html = renderBoard(ARCHIVE, "track-1", track(), "", ASC, page);
    expect(page.index).toBe(last); // clamped in place
    expect(html).toContain(`${last * 10 + 1}–${total} of ${total} teams`);
    expect(html).toContain(`Page ${last + 1} of ${last + 1}`);
    expect(html).toContain('<button type="button" data-page="next" disabled>');
  });

  it("pages the filtered rows, not the whole board", () => {
    const html = renderBoard(ARCHIVE, "track-1", track(), "must-medai", ASC, {
      size: 10,
      index: 0,
    });
    expect(bodyRows(html)).toBe(1);
    expect(html).toContain("1–1 of 1 team");
  });

  it("renders no pager when the search matches nothing", () => {
    const html = renderBoard(ARCHIVE, "track-1", track(), "zzzz", ASC);
    expect(html).toContain("No teams match");
    expect(html).not.toContain("lb-pager");
  });
});

describe("podium medals", () => {
  const snapshot = () => parseLeaderboard(loadFixture()).snapshot!;
  const ASC = { key: "rank", dir: "asc" as const };
  const LONGTERM = { id: "longterm-test", label: "Longterm Test" };
  const VALIDATION = { id: "longterm-validation", label: "Longterm Validation" };
  const allRows = () =>
    renderBoard(
      LONGTERM,
      "track-1",
      snapshot().phases["longterm-test"].tracks["track-1"],
      "",
      ASC,
      { size: 0, index: 0 },
    );

  it("awards gold, silver and copper to the three podium ranks", () => {
    const html = allRows();
    expect(html.match(/lb-medal--gold/g)).toHaveLength(1);
    expect(html.match(/lb-medal--silver/g)).toHaveLength(1);
    expect(html.match(/lb-medal--copper/g)).toHaveLength(1);

    // The medal follows the team name, before the era tag.
    const goldRow = html.split("</tr>").find((row) => row.includes("lb-medal--gold"))!;
    expect(goldRow).toContain("MUST-MEDAI");
    expect(goldRow.indexOf("MUST-MEDAI")).toBeLessThan(goldRow.indexOf("lb-medal--gold"));
    expect(goldRow.indexOf("lb-medal--gold")).toBeLessThan(goldRow.indexOf("lb-tag"));
    expect(goldRow).toContain('aria-label="Gold medal"');
  });

  it("gives both teams of a first-place tie the gold medal", () => {
    // Validation Track 1 starts 1.5, 1.5, 3: two tied firsts, then third.
    const html = renderBoard(
      VALIDATION,
      "track-1",
      snapshot().phases["longterm-validation"].tracks["track-1"],
      "",
      ASC,
      { size: 0, index: 0 },
    );
    const rows = html.split("</tr>");
    for (const name of ["cesar.acebes (UpfHsp)", "jjzhu (MUST-MEDAI)"]) {
      expect(rows.find((row) => row.includes(name)), name).toContain("lb-medal--gold");
    }
    expect(rows.find((row) => row.includes("ziyanhuang (BioMaker)"))).toContain(
      "lb-medal--copper",
    );
    expect(html.match(/lb-medal--gold/g)).toHaveLength(2);
    expect(html).not.toContain("lb-medal--silver");
    expect(html.match(/lb-medal--copper/g)).toHaveLength(1);
  });

  it("does not medal fourth place", () => {
    const row = allRows()
      .split("</tr>")
      .find((candidate) => candidate.includes("UpfHsp"))!;
    expect(row).not.toContain("lb-medal");
  });

  it("medals the podium of every track and phase", () => {
    const snap = snapshot();
    for (const [phaseId, phase] of Object.entries(snap.phases)) {
      for (const [trackId, track] of Object.entries(phase.tracks)) {
        const html = renderBoard(
          { id: phaseId, label: phase.label ?? phaseId },
          trackId,
          track,
          "",
          ASC,
          { size: 0, index: 0 },
        );
        const podium = track.entries.filter((entry) => entry.rank < 4).length;
        expect(html.match(/class="lb-medal /g) ?? [], `${phaseId}/${trackId}`).toHaveLength(
          podium,
        );
      }
    }
  });
});

describe("rows-per-page preference", () => {
  const withStorage = (getItem: () => string | null): number => {
    const scope = globalThis as { window?: unknown };
    const previous = scope.window;
    scope.window = { localStorage: { getItem, setItem: () => {} } };
    try {
      return readStoredPageSize();
    } finally {
      scope.window = previous;
    }
  };

  it("falls back to 20 when nothing is stored", () => {
    expect(withStorage(() => null)).toBe(DEFAULT_PAGE_SIZE);
    expect(DEFAULT_PAGE_SIZE).toBe(20);
  });

  it("keeps a stored choice, including All", () => {
    expect(withStorage(() => "10")).toBe(10);
    expect(withStorage(() => "50")).toBe(50);
    expect(withStorage(() => "0")).toBe(0);
  });

  it("ignores a stale or hand-edited value", () => {
    expect(withStorage(() => "37")).toBe(DEFAULT_PAGE_SIZE);
    expect(withStorage(() => "")).toBe(DEFAULT_PAGE_SIZE);
    expect(withStorage(() => "lots")).toBe(DEFAULT_PAGE_SIZE);
  });

  it("survives a storage that throws (private mode)", () => {
    const scope = globalThis as { window?: unknown };
    const previous = scope.window;
    scope.window = {
      localStorage: {
        getItem: () => {
          throw new Error("denied");
        },
        setItem: () => {},
      },
    };
    try {
      expect(readStoredPageSize()).toBe(DEFAULT_PAGE_SIZE);
    } finally {
      scope.window = previous;
    }
  });
});

describe("metric labels", () => {
  it("renders Betti0Error as β₀ error on the Tracks page too", () => {
    const html = renderTracks();
    expect(html).toContain("<td>&beta;<sub>0</sub> error</td>");
    expect(html).toContain("Lower is better");
    expect(html).not.toContain("<td>Betti0Error</td>");
  });

  it("falls back to the escaped metric name for unknown metrics", () => {
    expect(metricLabel("DSC")).toBe("DSC");
    expect(metricLabel("<img src=x>")).toBe("&lt;img src=x&gt;");
  });

  it("keeps the canonical name in the published data", () => {
    const phases = loadFixture().phases as Record<
      string,
      { tracks: Record<string, { metrics: Array<{ name: string }> }> }
    >;
    const names = phases["longterm-test"].tracks["track-1"].metrics.map((m) => m.name);
    expect(names).toContain("Betti0Error");
  });
});

describe("phase update log", () => {
  it("announces the archive split on every board", () => {
    for (const phaseId of ["miccai26-final-test", "longterm-test", "longterm-validation"]) {
      const html = renderShellHtml(phaseId);
      expect(html, phaseId).toContain('<div class="section-kicker">Update log</div>');
      expect(html, phaseId).toContain("<strong>2026-10-08</strong>");
      expect(html, phaseId).toContain("MICCAI 26 rankings are frozen");
      // below the board container
      expect(html.indexOf("lb-boards"), phaseId).toBeLessThan(html.indexOf("lb-updatelog"));
    }
  });

  it("keeps the Betti-0 entry on the validation-family boards", () => {
    for (const phaseId of ["longterm-validation", "longterm-test"]) {
      const html = renderShellHtml(phaseId);
      expect(html, phaseId).toContain("<strong>2026-10-01</strong>");
      expect(html, phaseId).toContain("We are adding Betti-0 error back");
    }
    // The Final Test archive only carries the split entry.
    const finalTest = renderShellHtml("miccai26-final-test");
    expect(finalTest).not.toContain("We are adding Betti-0 error back");
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
    }>)["miccai26-final-test"];
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
