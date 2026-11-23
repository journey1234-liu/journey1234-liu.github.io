// The static HTML shell and crawler files are what Google sees before (and
// alongside) the SPA render, so they are part of the public contract.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { SITE } from "../src/content";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

describe("HTML shell metadata", () => {
  it("carries the Google site verification tag in the head", () => {
    expect(html).toMatch(
      /<meta\s+name="google-site-verification"\s+content="MRYab9dYvdNxXdlHTgU99a7GQqnoELrOzDwsEpWDIXo"\s*\/?>/,
    );
    expect(html.indexOf("google-site-verification")).toBeLessThan(
      html.indexOf("<body>"),
    );
    const head = html.slice(html.indexOf("<head>"), html.indexOf("</head>"));
    expect(head).toContain('name="google-site-verification"');
  });

  it("sets the search-facing title, description and canonical URL", () => {
    expect(html).toContain(
      "<title>ATM26 | Airway Tree Modeling 2026: Leaderboard &amp; News</title>",
    );
    expect(html).toContain(
      'content="ATM26 (Airway Tree Modeling 2026) public website and leaderboard',
    );
    expect(html).toContain(
      '<link rel="canonical" href="https://journey1234-liu.github.io/atm26/" />',
    );
    // The SPA must not replace the static title with a different one.
    expect(SITE.documentTitle).toBe(
      "ATM26 | Airway Tree Modeling 2026: Leaderboard & News",
    );
  });

  it("has crawlable fallback content inside the app mount", () => {
    expect(html).toContain("<h1>ATM26 — Airway Tree Modeling 2026</h1>");
    expect(html).toContain('href="#/leaderboard"');
    expect(html).toContain('href="#/rules"');
    const app = html.slice(html.indexOf('<div id="app">'), html.indexOf("</body>"));
    expect(app).toContain("<main>");
  });
});

describe("crawler files", () => {
  it("allows crawling from the site root and points at the sitemap", () => {
    const robots = readFileSync(
      new URL("../../homepage/robots.txt", import.meta.url),
      "utf8",
    );
    expect(robots).toContain("User-agent: *");
    expect(robots).toContain("Allow: /");
    expect(robots).toContain(
      "Sitemap: https://journey1234-liu.github.io/atm26/sitemap.xml",
    );
  });

  it("publishes a sitemap for the ATM26 home page", () => {
    const sitemap = readFileSync(
      new URL("../public/sitemap.xml", import.meta.url),
      "utf8",
    );
    expect(sitemap).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(sitemap).toContain(
      "<loc>https://journey1234-liu.github.io/atm26/</loc>",
    );
    expect(sitemap).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
  });
});
