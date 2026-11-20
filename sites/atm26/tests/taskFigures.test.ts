// Demo figures in the home Tasks panel and on the Tracks page. Track 1 and
// Track 2 show a CT input and a rendered surface; Track 3 shows a packed
// bronchoscopy sequence and the labelled airway with its endoluminal path.
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { TRACKS, IMAGES } from "../src/content";
import { renderHome, renderTracks } from "../src/pages";

const publicFile = (relative: string): string =>
  fileURLToPath(new URL(`../public/${relative}`, import.meta.url));

describe("track demo figures", () => {
  it("gives every track a visual demo, with Track 3 driven by frames", () => {
    expect(TRACKS).toHaveLength(3);
    for (const track of TRACKS) {
      expect(track.figure?.input.label).toBe("Input");
      expect(track.figure?.output?.label).toBe("Output");
    }
    expect(TRACKS[2].figure?.frames).toHaveLength(10);
    expect(TRACKS[2].figure?.frames?.[0].role).toBe("start");
    expect(TRACKS[2].figure?.frames?.[9].role).toBe("final");
    expect(TRACKS[2].figure?.frames?.map((frame) => frame.label)).toEqual([
      "000",
      "020",
      "040",
      "060",
      "080",
      "100",
      "120",
      "140",
      "160",
      "180",
    ]);
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

  it("ships every figure asset, including the Track 3 frames", () => {
    const paths = TRACKS.flatMap((track) => [
      track.figure?.input.src,
      track.figure?.input.thumbSrc,
      track.figure?.output?.src,
      track.figure?.output?.thumbSrc,
      ...(track.figure?.frames?.map((frame) => frame.src) ?? []),
    ]).filter((path): path is string => Boolean(path));
    const uniquePaths = [...new Set(paths)];
    expect(uniquePaths).toHaveLength(16);
    for (const path of uniquePaths) {
      expect(path.startsWith("img/tasks/")).toBe(true);
      expect(existsSync(publicFile(path))).toBe(true);
    }
    for (const track of TRACKS) {
      expect(track.figure?.output?.width).toBeGreaterThan(0);
      expect(track.figure?.output?.height).toBeGreaterThan(0);
    }
  });

  it("keeps the Track 3 explanation to one caption line and aligned notes", () => {
    const figure = TRACKS[2].figure;
    expect(figure?.caption.length).toBeLessThanOrEqual(100);
    expect(figure?.caption).not.toContain("\n");
    expect(figure?.input.note.length).toBeLessThanOrEqual(40);
    expect(figure?.output?.note?.length ?? 0).toBeLessThanOrEqual(50);

    // Both notes sit directly under their pane head, above the media, so the
    // input and output explanations share a baseline on the Tracks page.
    const html = renderTracks();
    const track3 = html.slice(html.indexOf('id="track-3"'));
    const inputNote = track3.indexOf("Frames run top to bottom.");
    const inputStrip = track3.indexOf("seq-strip--tracks");
    expect(inputNote).toBeGreaterThan(-1);
    expect(inputNote).toBeLessThan(inputStrip);
    const outputNote = track3.indexOf("Translucent classes; the rest of the tree faded.");
    expect(outputNote).toBeGreaterThan(inputStrip);
  });

  it("renders the Track 3 sequence as a vertical, tagged filmstrip", () => {
    const html = renderHome();
    expect(html).toContain('class="seq-strip seq-strip--home"');
    expect(html.match(/class="seq-step"/g)).toHaveLength(3);
    expect(html).toContain(">f000<");
    expect(html).toContain(">f180<");
    expect(html).toContain("img/tasks/track3/frame-000.webp");
    expect(html).toContain("img/tasks/bronch-output-thumb.webp");
    expect(html).toContain('class="task-card-sequence"');
  });

  it("renders three visual Task cards", () => {
    const html = renderHome();
    expect(html.match(/class="task-card task-card--/g)).toHaveLength(3);
    expect(html.match(/class="task-card-media"/g)).toHaveLength(3);
    expect(html).not.toContain("task-card--text");
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

  it("renders all three figures on the Tracks page", () => {
    const html = renderTracks();
    expect(html.match(/class="panel track-section"/g)).toHaveLength(3);
    expect(html).toContain('id="track-1"');
    expect(html).toContain('id="track-2"');
    expect(html).toContain('id="track-3"');
    expect(html.match(/class="track-figure /g)).toHaveLength(3);
    expect(html).toContain("track-figure--sequence");
    expect(html.match(/class="seq-step"/g)).toHaveLength(10);
    expect(html).toContain("img/tasks/bronch-output.webp");
    expect(html).toContain('class="legend-swatch legend-left"');
    expect(html).toContain('class="legend-swatch legend-right"');
    expect(html).toContain('class="legend-swatch legend-trachea"');
    expect(html).toContain('class="legend-swatch legend-100"');
    expect(html).toContain('class="legend-swatch legend-17"');
    expect(html).toContain('class="legend-swatch legend-path"');
    expect(html).toContain("RB10");
    expect(html).not.toContain('class="track-output-note"');
  });

  it("keeps the viewer surfaces and sequence styles", () => {
    const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
    for (const selector of [
      ".task-card-media",
      ".task-card-panes",
      ".task-card-sequence",
      ".seq-strip",
      ".track-figure",
      ".track-figure--sequence",
    ]) {
      expect(css).toContain(selector);
    }
    expect(css).toContain("--viewer-bg:");
    for (const selector of [".legend-left", ".legend-right", ".legend-trachea", ".legend-100", ".legend-path"]) {
      expect(css).toContain(selector);
    }
  });
});
