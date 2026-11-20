// Demo figures in the home Tasks panel and on the Tracks page. Track 1 and
// Track 2 share the CT input and differ in the rendered output; Track 3 is
// text-only until its output visual is decided.
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { TRACKS, IMAGES } from "../src/content";
import { renderHome, renderTracks } from "../src/pages";

const publicFile = (relative: string): string =>
  fileURLToPath(new URL(`../public/${relative}`, import.meta.url));

describe("track demo figures", () => {
  it("gives Track 1 and Track 2 an input and an output, and leaves Track 3 text-only", () => {
    expect(TRACKS).toHaveLength(3);
    expect(TRACKS[0].figure?.input.label).toBe("Input");
    expect(TRACKS[0].figure?.output?.label).toBe("Output");
    expect(TRACKS[1].figure?.input.label).toBe("Input");
    expect(TRACKS[1].figure?.output?.label).toBe("Output");
    expect(TRACKS[2].figure).toBeUndefined();
  });

  it("pairs the shared CT input with a binary and a multiclass surface", () => {
    expect(TRACKS[0].figure?.input.src).toBe(IMAGES.taskCtVolume);
    expect(TRACKS[0].figure?.input.thumbSrc).toBe(IMAGES.taskCtVolumeThumb);
    expect(TRACKS[0].figure?.output?.src).toBe(IMAGES.taskAirwayBinary);
    expect(TRACKS[1].figure?.input.src).toBe(IMAGES.taskCtVolume);
    expect(TRACKS[1].figure?.output?.src).toBe(IMAGES.taskAirwayMulticlass);
    expect(TRACKS[1].figure?.legend?.map((item) => item.className)).toEqual([
      "legend-left",
      "legend-right",
      "legend-trachea",
    ]);
  });

  it("ships every Track 1/2 figure asset and keeps its intrinsic size", () => {
    const paths = TRACKS.flatMap((track) =>
      [track.figure?.input.src, track.figure?.input.thumbSrc, track.figure?.output?.src].filter(
        (path): path is string => Boolean(path),
      ),
    );
    const uniquePaths = [...new Set(paths)];
    expect(uniquePaths).toHaveLength(4);
    for (const path of uniquePaths) {
      expect(path.startsWith("img/tasks/")).toBe(true);
      expect(existsSync(publicFile(path))).toBe(true);
    }
    expect(TRACKS[0].figure?.input.width).toBeGreaterThan(0);
    expect(TRACKS[0].figure?.input.height).toBeGreaterThan(0);
    expect(TRACKS[0].figure?.output?.width).toBeGreaterThan(0);
    expect(TRACKS[0].figure?.output?.height).toBeGreaterThan(0);
  });

  it("does not ship the deferred Track 3 frame sequence", () => {
    const html = renderHome() + renderTracks();
    expect(html).not.toContain("img/tasks/track3");
    expect(html).not.toContain('class="frame-strip"');
    expect(existsSync(publicFile("img/tasks/track3"))).toBe(false);
  });

  it("renders two visual Task cards and one text-only Track 3 card", () => {
    const html = renderHome();
    expect(html.match(/class="task-card task-card--/g)).toHaveLength(3);
    expect(html.match(/class="task-card-media"/g)).toHaveLength(2);
    expect(html.match(/class="task-card task-card--track-3 task-card--text"/g)).toHaveLength(1);
    expect(html).toContain("Track 1 · CT");
    expect(html).toContain("Track 2 · CT");
    expect(html).toContain("Track 3 · Bronchoscopy");
    expect(html).toContain("img/tasks/ct-volume-thumb.webp");
    expect(html).toContain("img/tasks/airway-binary.webp");
    expect(html).toContain("img/tasks/airway-multiclass.webp");
    expect(html).toContain("Landmark Recognition");
    expect(html).toContain('href="#/tracks/track-1"');
    expect(html).toContain('href="#/tracks/track-2"');
    expect(html).toContain('href="#/tracks/track-3"');
  });

  it("renders figures on the Tracks page only for Track 1 and Track 2", () => {
    const html = renderTracks();
    expect(html.match(/class="panel track-section"/g)).toHaveLength(3);
    expect(html).toContain('id="track-1"');
    expect(html).toContain('id="track-2"');
    expect(html).toContain('id="track-3"');
    expect(html.match(/class="track-figure /g)).toHaveLength(2);
    expect(html).toContain('class="legend-swatch legend-left"');
    expect(html).toContain('class="legend-swatch legend-right"');
    expect(html).toContain('class="legend-swatch legend-trachea"');
    expect(html).not.toContain('class="track-output-note"');
  });

  it("keeps the viewer surface styled", () => {
    const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
    for (const selector of [".task-card-media", ".task-card-panes", ".task-card--text", ".track-figure"]) {
      expect(css).toContain(selector);
    }
    expect(css).toContain("--viewer-bg:");
    expect(css).toContain(".legend-left");
    expect(css).toContain(".legend-right");
    expect(css).toContain(".legend-trachea");
  });
});
