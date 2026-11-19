#!/usr/bin/env node
// Fetch aggregate visitor statistics from GoatCounter for the homepage.
//
// GitHub Pages serves static files and exposes no access logs, so the browser
// cannot read GoatCounter's API without exposing an API token. This script runs
// in CI instead and writes a small JSON snapshot that the page fetches:
//
//   { configured, source, path, total, countries, unknown, generatedAt }
//
// The snapshot contains aggregates only: no IP addresses, no per-visitor rows.
// GoatCounter derives the country from the request and does not store the IP.
//
// Usage:
//   GOATCOUNTER_API_TOKEN=... node tools/fetch_visits.mjs --out deploy/data/visits.json
//
// The site code is read from ../site.config.json (goatcounterCode) or --code.
// If either the token or the code is missing the script exits 0 without writing
// a file, so forks and pull-request builds still deploy the site without stats.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(ROOT, "..", "site.config.json");
const CODE_RE = /^[a-z0-9][a-z0-9-]{0,62}$/i;
const ALL_TIME_START = "2000-01-01T00:00:00Z";
const PAGE_LIMIT = 100;
const MAX_PAGES = 10;

export function parseArgs(argv) {
  const args = { out: "", code: "", apiBase: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === "--out" || flag === "--code" || flag === "--api-base") {
      if (!value || value.startsWith("--")) {
        throw new Error(`${flag} requires a value`);
      }
      args[flag === "--out" ? "out" : flag === "--code" ? "code" : "apiBase"] = value;
      i += 1;
      continue;
    }
    throw new Error(`unknown argument: ${flag}`);
  }
  if (!args.out) {
    throw new Error("usage: node tools/fetch_visits.mjs --out <file> [--code <site>] [--api-base <url>]");
  }
  return args;
}

export function normalizeCountries(stats) {
  if (!Array.isArray(stats)) return [];
  return stats
    .map((item) => ({
      code: typeof item?.id === "string" ? item.id.trim().toUpperCase() : "",
      name: typeof item?.name === "string" ? item.name.trim() : "",
      visits: toCount(item?.count),
    }))
    .filter((item) => item.name && item.visits > 0)
    .sort((a, b) => b.visits - a.visits || a.name.localeCompare(b.name, "en"));
}

export function buildSnapshot({ total, stats, generatedAt = new Date(), path = "/" }) {
  const countries = normalizeCountries(stats);
  const located = countries.reduce((sum, country) => sum + country.visits, 0);
  const visits = toCount(total) || located;
  return {
    configured: true,
    source: "GoatCounter",
    path,
    total: visits,
    countries,
    unknown: Math.max(0, visits - located),
    generatedAt: new Date(generatedAt).toISOString(),
  };
}

export async function collectStats({ apiBase, token, path = "/", generatedAt = new Date() }) {
  const totalParams = new URLSearchParams({
    path_by_name: "true",
    include_paths: path,
    start: ALL_TIME_START,
  });
  const totalData = await fetchJson(`${apiBase}/stats/total?${totalParams}`, token);

  const stats = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params = new URLSearchParams({
      path_by_name: "true",
      include_paths: path,
      start: ALL_TIME_START,
      limit: String(PAGE_LIMIT),
      offset: String(stats.length),
    });
    const data = await fetchJson(`${apiBase}/stats/locations?${params}`, token);
    const batch = Array.isArray(data.stats) ? data.stats : [];
    stats.push(...batch);
    if (!data.more || batch.length === 0) break;
    // GoatCounter allows 4 requests/second; keep pagination comfortably below.
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return buildSnapshot({ total: totalData.total, stats, generatedAt, path });
}

function toCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.trunc(number) : 0;
}

async function fetchJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    const body = (await response.text()).slice(0, 300);
    throw new Error(`${response.status} ${response.statusText} for ${url}: ${body}`);
  }
  return response.json();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = (process.env.GOATCOUNTER_API_TOKEN || "").trim();
  if (!token) {
    console.warn("visitor stats: GOATCOUNTER_API_TOKEN is not set; skipping");
    return;
  }

  const config = JSON.parse(await readFile(CONFIG_PATH, "utf-8"));
  const code = (args.code || config.goatcounterCode || "").trim();
  if (!code) {
    console.warn("visitor stats: goatcounterCode is empty; skipping");
    return;
  }
  if (!CODE_RE.test(code)) {
    throw new Error("goatcounterCode must be a GoatCounter subdomain (letters, digits, hyphens)");
  }

  const apiBase = (args.apiBase || `https://${code}.goatcounter.com/api/v0`).replace(/\/+$/, "");
  const snapshot = await collectStats({ apiBase, token });
  const out = resolve(args.out);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(snapshot, null, 2)}\n`, "utf-8");
  console.log(
    `visitor stats → ${out} (${snapshot.total} visits, ${snapshot.countries.length} countries/regions)`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`visitor stats failed: ${error.message}`);
    process.exit(1);
  });
}
