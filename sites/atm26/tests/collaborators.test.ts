// Home-page collaborator band: the logo set, its generated assets and the
// seamless-loop contract. The band reuses the workshop photo marquee (the same
// block rendered twice, translated by exactly -50%) and runs the same way, so
// the marks pass in alphabetical order. Two rows of marks share one track to
// keep the strip about half as long as a single row of the same logos.
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

const unattr = (value: string): string =>
  value.replaceAll("&#39;", "'").replaceAll("&quot;", '"')
    .replaceAll("&gt;", ">").replaceAll("&lt;", "<").replaceAll("&amp;", "&");

/** Mirrors `.logo-marquee-item img` and `.logo-marquee-row` in styles.css. */
const ROW_HEIGHT = 60;
const MAX_WIDTH = 300;
const ROW_GAP = 24;

/** Assets are generated at 2x the 60x300 box of `.logo-marquee-item img`. */
const ASSET_MAX_WIDTH = 610;
const ASSET_MAX_HEIGHT = 124;

const displayWidth = (width: number, height: number): number =>
  Math.min(MAX_WIDTH, (ROW_HEIGHT * width) / height);

/** The first copy of the band, i.e. everything before the hidden duplicate. */
function firstSet(html: string): string {
  const start = html.indexOf('<div class="logo-marquee-set">');
  const end = html.indexOf('<div class="logo-marquee-set" aria-hidden="true">');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return html.slice(start, end);
}

/** Names in each row of the first copy, in render order. */
function rowNames(html: string): string[][] {
  return firstSet(html)
    .split('<div class="logo-marquee-row">')
    .slice(1)
    .map((row) => [...row.matchAll(/alt="([^"]+)"/g)].map((match) => unattr(match[1])));
}

describe("home collaborator band", () => {
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

  it("ships one trimmed WebP per logo at strip resolution", () => {
    for (const logo of COLLABORATORS.logos) {
      expect(logo.src).toMatch(/^img\/collaborators\/[a-z0-9-]+\.webp$/);
      const path = publicFile(logo.src);
      expect(existsSync(path), `${logo.name}: ${logo.src} is missing`).toBe(true);
      expect(statSync(path).size).toBeGreaterThan(0);
      const head = readFileSync(path).subarray(0, 12).toString("latin1");
      expect(head.startsWith("RIFF")).toBe(true);
      expect(head.endsWith("WEBP")).toBe(true);
      // Anything bigger would be a full-resolution source that slipped through
      // the conversion tool; smaller would be soft on a high-density screen.
      expect(logo.width).toBeLessThanOrEqual(ASSET_MAX_WIDTH);
      expect(logo.height).toBeLessThanOrEqual(ASSET_MAX_HEIGHT);
      expect(logo.width).toBeGreaterThan(0);
      expect(logo.height).toBeGreaterThan(0);
    }
  });

  it("renders the block twice for the seamless loop", () => {
    const html = renderHome();
    expect(html).toContain('id="collaborators"');
    expect(html.match(/class="logo-marquee-set"/g)).toHaveLength(2);
    expect(html.match(/class="logo-marquee-set" aria-hidden="true"/g)).toHaveLength(1);
    expect(html.match(/class="logo-marquee-row"/g)).toHaveLength(4);
    expect(html.match(/class="logo-marquee-item"/g)).toHaveLength(
      COLLABORATORS.logos.length * 2,
    );
    expect(html.match(/<img\s+src="\/img\/collaborators\//g)).toHaveLength(
      COLLABORATORS.logos.length * 2,
    );
  });

  it("splits the set over two rows, keeping the alphabetical run intact", () => {
    const rows = rowNames(renderHome());
    expect(rows).toHaveLength(2);
    const [first, second] = rows;
    expect(first.length).toBeGreaterThan(0);
    expect(second.length).toBeGreaterThan(0);
    expect(first.length + second.length).toBe(COLLABORATORS.logos.length);
    expect([...first, ...second]).toEqual(COLLABORATORS.logos.map((logo) => logo.name));
  });

  it("balances the rows so both travel at the same speed", () => {
    const rows = rowNames(renderHome());
    const widths = rows.map(
      (names) =>
        names.reduce((sum, name) => {
          const logo = COLLABORATORS.logos.find((item) => item.name === name);
          expect(logo, `${name} is not in the content list`).toBeDefined();
          return sum + displayWidth(logo!.width, logo!.height);
        }, 0) + ROW_GAP * (names.length - 1),
    );
    const longest = Math.max(...widths);
    expect(Math.abs(widths[0] - widths[1])).toBeLessThan(longest * 0.05);
  });

  it("names every mark and reserves its box", () => {
    const set = firstSet(renderHome());
    for (const logo of COLLABORATORS.logos) {
      expect(set).toContain(`alt="${attr(logo.name)}"`);
      expect(set).toContain(`width="${logo.width}"`);
      expect(set).toContain(`height="${logo.height}"`);
    }
    // Lazy is safe here: the band sits at the page bottom and the browser
    // loads well outside the viewport, so pieces never pop in mid-scroll.
    expect(set).not.toContain('loading="eager"');
    expect(set.match(/loading="lazy"/g)).toHaveLength(COLLABORATORS.logos.length);
    expect(set.match(/decoding="async"/g)).toHaveLength(COLLABORATORS.logos.length);
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

  it("scrolls leftward so the marks pass in alphabetical order", () => {
    const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
    const keyframes =
      /@keyframes logo-marquee-scroll \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    // From 0 to -50%: the block moves left, so the next letters enter on the
    // right, in the same direction as the workshop photo strip.
    expect(keyframes.indexOf("translateX(0)")).toBeGreaterThan(-1);
    expect(keyframes.indexOf("translateX(0)")).toBeLessThan(
      keyframes.indexOf("translateX(-50%)"),
    );
    expect(css).toMatch(
      /\.logo-marquee:hover \.logo-marquee-track,[\s\S]*?animation-play-state: paused;/,
    );
    expect(css).toMatch(/\.logo-marquee-track \{[\s\S]*?animation: logo-marquee-scroll/);
    expect(css).toMatch(/width: min\(\d+px, \d+px \* var\(--logo-ratio, 1\)\);/);
    expect(css).toMatch(/aspect-ratio: var\(--logo-ratio, 1\);/);
    expect(css).toMatch(/\.logo-marquee-set \{[\s\S]*?flex-direction: column;/);
    expect(css).toMatch(/\.logo-marquee-row \{[\s\S]*?gap: 1\.5rem;/);
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
