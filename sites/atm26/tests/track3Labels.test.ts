// Track 3 label guide: 32 classes, authoritative IDs, and the page that shows
// them. The schema is fixed by the organizers' label_schema.json, so an ID
// mismatch here would silently mis-score every submission.
import { describe, it, expect } from "vitest";
import {
  TRACK3_PROXIMAL_LABELS,
  TRACK3_SEGMENTAL_LABELS,
  TRACK3_LABEL_NOTES,
} from "../src/content";
import { renderTracks, renderRules } from "../src/pages";

const all = [...TRACK3_PROXIMAL_LABELS, ...TRACK3_SEGMENTAL_LABELS];

describe("Track 3 label schema", () => {
  it("has 13 proximal and 19 segmental classes, 32 in total", () => {
    expect(TRACK3_PROXIMAL_LABELS).toHaveLength(13);
    expect(TRACK3_SEGMENTAL_LABELS).toHaveLength(19);
    expect(all).toHaveLength(32);
  });

  it("uses the official IDs, including 0 but not 18", () => {
    const ids = all.map((label) => label.id).sort((a, b) => a - b);
    expect(new Set(ids).size).toBe(32);
    expect(ids).toContain(0);
    expect(ids).not.toContain(18);
    expect(ids).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19,
      100, 101, 102, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116]);
  });

  it("names the first and last classes as in the guide", () => {
    expect(all.find((label) => label.id === 0)?.name).toBe("LB1+2");
    expect(all.find((label) => label.id === 100)?.name).toBe("trachea");
    expect(all.find((label) => label.id === 116)?.name).toBe("Left basal trunk");
  });

  it("keeps the two schema notes that prevent scoring mistakes", () => {
    expect(TRACK3_LABEL_NOTES.join(" ")).toContain("ID 0 (LB1+2) is a valid class");
    expect(TRACK3_LABEL_NOTES.join(" ")).toContain("union of all annotated branches");
  });
});

describe("Track 3 pages", () => {
  it("renders the label figure and both tables on the Tracks page", () => {
    const html = renderTracks();
    expect(html).toContain("Track 3 label guide");
    expect(html).toContain("img/track3-labels.webp");
    expect(html).toContain("Proximal airways (13 classes)");
    expect(html).toContain("Segmental bronchi (19 classes)");
    expect(html).toContain("LB1+2");
    expect(html).toContain("Right posterior basal segment");
  });

  it("documents the Track 3 container contract on the Rules page", () => {
    const html = renderRules();
    expect(html).toContain("Track 3.");
    expect(html).toContain("/input/sequences/");
    expect(html).toContain("/output/predictions/");
    expect(html).toContain("filename,label");
    expect(html).toContain("org.atm26.batch");
  });
});
