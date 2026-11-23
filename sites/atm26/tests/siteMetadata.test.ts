// The Google Site Verification tag must ship in the static <head> of every
// page; the SPA renders after the shell, so it cannot be added at runtime.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

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
});
