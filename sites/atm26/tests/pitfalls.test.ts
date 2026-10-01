// Rules page "Common pitfalls" block: structural checks on the content and
// renderer (the block must never carry anatomical branch names, per the
// organizer's pending label-table review).
import { describe, it, expect } from "vitest";
import { COMMON_PITFALLS } from "../src/content";
import { renderRules } from "../src/pages";

describe("Rules page common pitfalls", () => {
  it("exposes 11 structured pitfalls with non-empty titles and notes", () => {
    expect(COMMON_PITFALLS.length).toBe(11);
    for (const item of COMMON_PITFALLS) {
      expect(item.title.trim()).not.toBe("");
      expect(item.note.trim()).not.toBe("");
    }
  });

  it("no longer lists the removed Track-2 label-range entry", () => {
    const titles = COMMON_PITFALLS.map((item) => item.title);
    expect(titles).not.toContain("Track 2: labels 0–20, keep class 20");
    expect(renderRules()).not.toContain("Track 2: labels 0–20, keep class 20");
  });

  it("renders the Common pitfalls heading, intro and one list item per entry", () => {
    const html = renderRules();
    expect(html).toContain("<h2>Common pitfalls</h2>");
    expect(html).toContain("labels are 0&ndash;20 (class 20 is a real scored branch)");
    const pitfallList = /<ul class="pitfall-list">([\s\S]*?)<\/ul>/.exec(html)?.[1] ?? "";
    expect(pitfallList).not.toBe("");
    expect((pitfallList.match(/<li><strong>/g) ?? []).length).toBe(COMMON_PITFALLS.length);
  });

  it("contains no anatomical branch names anywhere in the block content", () => {
    const joined = COMMON_PITFALLS.map((item) => `${item.title} ${item.note}`).join(" ");
    expect(joined).not.toMatch(/RB7|LB7/);
    expect(renderRules()).not.toMatch(/RB7|LB7/);
  });
});
