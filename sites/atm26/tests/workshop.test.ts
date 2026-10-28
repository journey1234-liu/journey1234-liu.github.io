// Home page workshop section (MICCAI 2026 workshop day): the agenda contract,
// the photo-strip structure and the seamless-loop invariant — the photo set
// must be rendered exactly twice so a -50% translation lands on an identical
// frame, and every photo must carry intrinsic dimensions so the strip does not
// reflow while images load.
import { describe, it, expect } from "vitest";
import { WORKSHOP } from "../src/content";
import { renderHome } from "../src/pages";

describe("home workshop section", () => {
  it("lists the full workshop agenda in order", () => {
    expect(WORKSHOP.agenda).toHaveLength(11);
    expect(WORKSHOP.agenda[0]).toMatchObject({
      time: "10:30–10:40",
      session: "Opening talk & ATM26 challenge summary",
      speaker: "Yaoyu Liu",
      kind: "opening",
    });
    expect(WORKSHOP.agenda.at(-1)).toMatchObject({
      time: "12:10–12:20",
      session: "Award Ceremony & Conclusion",
      speaker: "Prof. Yun Gu",
      kind: "award",
    });
  });

  it("contains two invited talks and the award ceremony", () => {
    const kinds = WORKSHOP.agenda.map((item) => item.kind);
    expect(kinds.filter((kind) => kind === "invited")).toHaveLength(2);
    expect(kinds.filter((kind) => kind === "award")).toHaveLength(1);
  });

  it("renders one agenda row per slot", () => {
    const html = renderHome();
    expect(html).toContain('class="workshop-agenda"');
    expect(html.match(/<td class="workshop-time">/g)).toHaveLength(
      WORKSHOP.agenda.length,
    );
    expect(html).toContain("Invited talk");
    expect(html).toContain("Award ceremony");
  });

  it("renders the photo set exactly twice for the seamless loop", () => {
    const html = renderHome();
    expect(html.match(/class="photo-marquee-set"/g)).toHaveLength(2);
    expect(html.match(/class="photo-marquee-set" aria-hidden="true"/g)).toHaveLength(1);
    expect(html.match(/class="photo-marquee-item"/g)).toHaveLength(
      WORKSHOP.photos.length * 2,
    );
  });

  it("reserves layout space for every photo", () => {
    for (const photo of WORKSHOP.photos) {
      expect(photo.width).toBeGreaterThan(0);
      expect(photo.height).toBeGreaterThan(0);
      expect(photo.alt.length).toBeGreaterThan(10);
      expect(photo.caption.length).toBeGreaterThan(0);
    }
  });

  it("keeps the marquee images eager so nothing stays unloaded off-screen", () => {
    const html = renderHome();
    const strip = html.slice(html.indexOf('class="photo-marquee-track"'));
    expect(strip).not.toContain('loading="lazy"');
  });

  it("links to the official results page", () => {
    expect(renderHome()).toContain(`href="${WORKSHOP.resultsUrl}"`);
  });
});
