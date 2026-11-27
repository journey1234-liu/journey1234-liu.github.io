// Home-page collaborator strip: the logo set, its generated assets and the
// seamless-loop contract. The strip reuses the workshop photo marquee (the same
// set rendered twice, translated by exactly -50%) but runs the other way, so
// the marks enter from the left edge and every logo is capped by height and
// width instead of being scaled to one common height.
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { COLLABORATORS } from "../src/content";
import { renderHome } from "../src/pages";

const publicFile = (relative: string): string =>
  fileURLToPath(new URL(`../public/${relative}`, import.meta.url));

/** Lowercase letters and digits only, so punctuation never decides the order. */
const sortKey = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, "");

/** The renderer escapes text before it reaches an attribute. */
const attr = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");

/** Caps from `.logo-marquee-item img`, and the 2x factor the assets are built at. */
const MAX_RENDER_WIDTH = 300;
const MAX_RENDER_HEIGHT = 72;
const RETINA = 2;

describe("home collaborator strip", () => {
  it("lists the collaborators in alphabetical order, without duplicates", () => {
    expect(COLLABORATORS.logos.length).toBeGreaterThan(30);
    expect(new Set(COLLABORATORS.logos.map((logo) => logo.name)).size).toBe(
      COLLABORATORS.logos.length,
    );
    expect(new Set(COLLABORATORS.logos.map((logo) => logo.src)).size).toBe(
      COLLABORATORS.logos.length,
    );
    const keys = COLLABORATORS.logos.map((logo) => sortKey(logo.name));
    expect(keys).toEqual([...keys].sort());
    expect(COLLABORATORS.intro).toContain("alphabetical");
  });

  it("ships one WebP per logo, sized for the 2x strip", () => {
    for (const logo of COLLABORATORS.logos) {
      expect(logo.src).toMatch(/^img\/collaborators\/[a-z0-9-]+\.webp$/);
      const path = publicFile(logo.src);
      expect(existsSync(path), `${logo.name}: ${logo.src} is missing`).toBe(true);
      expect(statSync(path).size).toBeGreaterThan(0);
      const head = readFileSync(path).subarray(0, 12).toString("latin1");
      expect(head.startsWith("RIFF")).toBe(true);
      expect(head.endsWith("WEBP")).toBe(true);
      // Built at 2x the largest box the CSS allows (plus the odd pixel that
      // rounding the height up produces); anything bigger would be a
      // full-resolution source that slipped through the conversion tool.
      expect(logo.width).toBeLessThanOrEqual(MAX_RENDER_WIDTH * RETINA + 6);
      expect(logo.height).toBeLessThanOrEqual(MAX_RENDER_HEIGHT * RETINA + 1);
      expect(logo.width).toBeGreaterThan(0);
      expect(logo.height).toBeGreaterThan(0);
    }
  });

  it("renders the logo set twice for the seamless loop", () => {
    const html = renderHome();
    expect(html).toContain('id="collaborators"');
    expect(html.match(/class="logo-marquee-set"/g)).toHaveLength(2);
    expect(html.match(/class="logo-marquee-set" aria-hidden="true"/g)).toHaveLength(1);
    expect(html.match(/class="logo-marquee-item"/g)).toHaveLength(
      COLLABORATORS.logos.length * 2,
    );
    expect(html.match(/<img\s+src="\/img\/collaborators\//g)).toHaveLength(
      COLLABORATORS.logos.length * 2,
    );
  });

  it("names every mark and reserves its box", () => {
    const html = renderHome();
    const start = html.indexOf('<div class="logo-marquee-set">');
    const end = html.indexOf('<div class="logo-marquee-set" aria-hidden="true">');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const strip = html.slice(start, end);
    for (const logo of COLLABORATORS.logos) {
      expect(strip).toContain(`alt="${attr(logo.name)}"`);
      expect(strip).toContain(`width="${logo.width}"`);
      expect(strip).toContain(`height="${logo.height}"`);
    }
    // Lazy is safe here: the strip sits at the page bottom and the browser
    // loads well outside the viewport, so pieces never pop in mid-scroll.
    expect(strip).not.toContain('loading="eager"');
    expect(strip.match(/loading="lazy"/g)).toHaveLength(COLLABORATORS.logos.length);
    expect(strip.match(/decoding="async"/g)).toHaveLength(COLLABORATORS.logos.length);
  });

  it("closes the home page, after the About section", () => {
    const html = renderHome();
    const about = html.indexOf("<h2>About ATM26</h2>");
    const collaborators = html.indexOf('id="collaborators"');
    const visitors = html.indexOf('id="visitors"');
    expect(about).toBeGreaterThan(-1);
    expect(collaborators).toBeGreaterThan(about);
    expect(visitors).toBeGreaterThan(collaborators);
  });

  it("scrolls the strip from left to right and pauses on hover", () => {
    const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
    const keyframes =
      /@keyframes logo-marquee-scroll \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    expect(keyframes).toContain("translateX(-50%)");
    expect(keyframes).toContain("translateX(0)");
    expect(keyframes.indexOf("translateX(-50%)")).toBeLessThan(
      keyframes.indexOf("translateX(0)"),
    );
    expect(css).toMatch(
      /\.logo-marquee:hover \.logo-marquee-track,[\s\S]*?animation-play-state: paused;/,
    );
    expect(css).toMatch(/\.logo-marquee-track \{[\s\S]*?animation: logo-marquee-scroll/);
    expect(css).toMatch(/width: min\(\d+px, \d+px \* var\(--logo-ratio, 1\)\);/);
    expect(css).toMatch(/aspect-ratio: var\(--logo-ratio, 1\);/);
  });

  it("falls back to a plain horizontal scroller for reduced motion", () => {
    const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
    const reduced =
      /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    expect(reduced).toContain(".logo-marquee {");
    expect(reduced).toContain("overflow-x: auto;");
    expect(reduced).toMatch(/\.logo-marquee-track \{\s*animation: none;/);
    expect(reduced).toMatch(
      /\.logo-marquee-set\[aria-hidden="true"\] \{\s*display: none;/,
    );
  });
});
