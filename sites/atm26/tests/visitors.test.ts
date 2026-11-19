import { describe, expect, it } from "vitest";
import {
  formatShare,
  parseVisitorSnapshot,
  renderVisitorRows,
  visitorTotalLabel,
  type VisitorSnapshot,
} from "../src/visitors";

describe("parseVisitorSnapshot", () => {
  it("normalises countries, drops invalid rows and sorts by visits", () => {
    const snapshot = parseVisitorSnapshot({
      configured: true,
      total: 10,
      unknown: 2,
      generatedAt: "2026-11-19T02:00:00Z",
      countries: [
        { name: "United States", visits: 4 },
        { name: "Germany", visits: 6 },
        { name: "France", visits: 0 },
        { name: "", visits: 9 },
        null,
      ],
    });

    expect(snapshot).not.toBeNull();
    expect(snapshot?.total).toBe(10);
    expect(snapshot?.unknown).toBe(2);
    expect(snapshot?.generatedAt).toBe("2026-11-19T02:00:00Z");
    expect(snapshot?.countries).toEqual([
      { name: "Germany", visits: 6 },
      { name: "United States", visits: 4 },
    ]);
  });

  it("keeps a zero-visit snapshot so a new site can show the panel", () => {
    const snapshot = parseVisitorSnapshot({
      configured: true,
      total: 0,
      countries: [],
      unknown: 0,
      generatedAt: "2026-11-19T02:00:00Z",
    });
    expect(snapshot).toEqual({
      total: 0,
      countries: [],
      unknown: 0,
      generatedAt: "2026-11-19T02:00:00Z",
    });
  });

  it("rejects malformed or disabled snapshots", () => {
    expect(parseVisitorSnapshot(null)).toBeNull();
    expect(parseVisitorSnapshot("nope")).toBeNull();
    expect(parseVisitorSnapshot({ configured: false, total: 10 })).toBeNull();
    expect(parseVisitorSnapshot({ total: 10 })).toBeNull();
  });

  it("tolerates bad counts and a missing timestamp", () => {
    const snapshot = parseVisitorSnapshot({
      configured: true,
      total: "12",
      unknown: -3,
      countries: [{ name: "China", visits: "5" }],
    });
    expect(snapshot).toEqual({
      total: 12,
      countries: [{ name: "China", visits: 5 }],
      unknown: 0,
      generatedAt: "",
    });
  });
});

describe("formatShare", () => {
  it("handles zero totals, rounding and sub-one-percent shares", () => {
    expect(formatShare(4, 0)).toBe("0%");
    expect(formatShare(1, 1000)).toBe("<1%");
    expect(formatShare(1, 3)).toBe("33%");
    expect(formatShare(10, 10)).toBe("100%");
  });
});

describe("visitorTotalLabel", () => {
  it("uses the singular only for one visit", () => {
    expect(visitorTotalLabel(0)).toBe("visits to the ATM26 site");
    expect(visitorTotalLabel(1)).toBe("visit to the ATM26 site");
    expect(visitorTotalLabel(2)).toBe("visits to the ATM26 site");
  });
});

describe("renderVisitorRows", () => {
  const snapshot: VisitorSnapshot = {
    total: 10,
    countries: [
      { name: "United States", visits: 6 },
      { name: "<script>alert(1)</script>", visits: 2 },
    ],
    unknown: 2,
    generatedAt: "2026-11-19T02:00:00Z",
  };

  it("renders bars, shares and the unknown bucket with escaped names", () => {
    const html = renderVisitorRows(snapshot);
    expect(html).toContain("United States");
    expect(html).toContain("6 · 60%");
    expect(html).toContain("Unknown location");
    expect(html).toContain("is-unknown");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("width:100.0%");
  });

  it("returns an empty string when nothing is located", () => {
    expect(
      renderVisitorRows({
        total: 0,
        countries: [],
        unknown: 0,
        generatedAt: "",
      }),
    ).toBe("");
  });
});
