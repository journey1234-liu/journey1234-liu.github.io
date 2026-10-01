// Static check: the website repository must never contain private evaluation
// identifiers, credentials, or real participant team IDs. Scans committed
// source and public data for known secret / private-data patterns.
//
// NOTE: the patterns below are deliberately generic. Concrete secret values
// (evaluation-server account/address, real emails) must never be written into
// this public repository — including into this test file.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = join(fileURLToPath(new URL(".", import.meta.url)));
const root = resolve(here, "..");

const FORBIDDEN_PATTERNS: RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/, // PEM private keys
  /ssh-(rsa|ed25519|dss)\s+[A-Za-z0-9+/=]{40,}/, // SSH key material
  /ATM26-T\d{3}/, // real participant team IDs (T001, T002, …)
  /[a-z0-9._-]+@\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, // user@IPv4 (ssh target)
  /AKIA[0-9A-Z]{16}/, // AWS access-key IDs
  /ghp_[A-Za-z0-9]{36}/, // GitHub personal-access tokens
  /glpat-[A-Za-z0-9_-]{20,}/, // GitLab personal-access tokens
];

const SCAN_DIRS = ["src", "public", "tests"];
const SCAN_FILES = ["index.html", "package.json", "vite.config.ts", "tsconfig.json"];

function collectFiles(dir: string): string[] {
  const result: string[] = [];
  const absolute = resolve(root, dir);
  if (!statSync(absolute, { throwIfNoEntry: false })?.isDirectory()) return result;
  for (const entry of readdirSync(absolute)) {
    const full = join(absolute, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      result.push(...collectFiles(join(dir, entry)));
    } else if (stat.isFile()) {
      result.push(full);
    }
  }
  return result;
}

describe("secret / private-data scan", () => {
  const files = [
    ...SCAN_DIRS.flatMap(collectFiles),
    ...SCAN_FILES.map((f) => resolve(root, f)),
  ];

  it("scans committed files for forbidden patterns", () => {
    const hits: string[] = [];
    for (const file of files) {
      let content: string;
      try {
        content = readFileSync(file, "utf-8");
      } catch {
        continue;
      }
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(content)) {
          hits.push(`${relative(root, file)} matches ${pattern}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
