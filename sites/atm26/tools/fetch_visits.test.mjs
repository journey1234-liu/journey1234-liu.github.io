import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import { buildSnapshot, collectStats, normalizeCountries, normalizePath, parseArgs } from "./fetch_visits.mjs";

test("normalizePath mirrors GoatCounter's trailing-slash normalization", () => {
  assert.equal(normalizePath("/"), "/");
  assert.equal(normalizePath("/atm26/"), "/atm26");
  assert.equal(normalizePath("atm26"), "/atm26");
  assert.equal(normalizePath("  /atm26///  "), "/atm26");
  assert.equal(normalizePath(""), "/");
});

test("normalizeCountries maps, filters, and sorts location stats", () => {
  const countries = normalizeCountries([
    { id: "us", name: "United States", count: "4" },
    { id: "DE", name: "Germany", count: 6 },
    { id: "FR", name: "France", count: 0 },
    { id: "", name: "", count: 9 },
  ]);

  assert.deepEqual(countries, [
    { code: "DE", name: "Germany", visits: 6 },
    { code: "US", name: "United States", visits: 4 },
  ]);
});

test("normalizeCountries tolerates malformed input", () => {
  assert.deepEqual(normalizeCountries(undefined), []);
  assert.deepEqual(normalizeCountries([null, { id: "US" }]), []);
});

test("buildSnapshot keeps located and unknown visits consistent", () => {
  const snapshot = buildSnapshot({
    total: 10,
    stats: [{ id: "US", name: "United States", count: 6 }],
    generatedAt: new Date("2026-11-18T12:00:00Z"),
    path: "/atm26",
  });

  assert.equal(snapshot.configured, true);
  assert.equal(snapshot.source, "GoatCounter");
  assert.equal(snapshot.path, "/atm26");
  assert.equal(snapshot.total, 10);
  assert.equal(snapshot.unknown, 4);
  assert.equal(snapshot.generatedAt, "2026-11-18T12:00:00.000Z");
  assert.deepEqual(snapshot.countries, [{ code: "US", name: "United States", visits: 6 }]);
});

test("parseArgs accepts documented flags and rejects malformed ones", () => {
  assert.deepEqual(parseArgs(["--out", "deploy/atm26/data/visits.json"]), {
    out: "deploy/atm26/data/visits.json",
    code: "",
    apiBase: "",
    path: "",
  });
  assert.equal(
    parseArgs(["--out", "x.json", "--path", "/atm26/"]).path,
    "/atm26/",
  );
  assert.throws(() => parseArgs([]), /usage/);
  assert.throws(() => parseArgs(["--out"]), /requires a value/);
  assert.throws(() => parseArgs(["--oops", "x"]), /unknown argument/);
});

test("collectStats surfaces API errors without exposing the token", async () => {
  const server = createServer((request, response) => {
    response.statusCode = 401;
    response.end(JSON.stringify({ error: "invalid token" }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();

  try {
    await assert.rejects(
      () => collectStats({ apiBase: `http://127.0.0.1:${port}/api/v0`, token: "secret-token" }),
      (error) => error.message.includes("401") && !error.message.includes("secret-token"),
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("collectStats requests the ATM26 path and follows pagination", async () => {
  const requests = [];
  const server = createServer((request, response) => {
    requests.push({ url: request.url, auth: request.headers.authorization });
    const url = new URL(request.url, "http://127.0.0.1");
    response.setHeader("content-type", "application/json");

    if (url.pathname.endsWith("/stats/total")) {
      response.end(JSON.stringify({ total: 7 }));
      return;
    }
    if (url.pathname.endsWith("/stats/locations")) {
      const offset = Number(url.searchParams.get("offset") || 0);
      response.end(
        JSON.stringify(
          offset === 0
            ? { stats: [{ id: "US", name: "United States", count: 4 }], more: true }
            : { stats: [{ id: "DE", name: "Germany", count: 2 }], more: false },
        ),
      );
      return;
    }
    response.statusCode = 404;
    response.end("{}");
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();

  try {
    const snapshot = await collectStats({
      apiBase: `http://127.0.0.1:${port}/api/v0`,
      token: "test-token",
      path: "/atm26",
      generatedAt: new Date("2026-11-18T12:00:00Z"),
    });

    assert.equal(snapshot.total, 7);
    assert.equal(snapshot.unknown, 1);
    assert.deepEqual(
      snapshot.countries.map((country) => country.code),
      ["US", "DE"],
    );
    assert.equal(requests.length, 3);
    assert.ok(requests.every((request) => request.auth === "Bearer test-token"));

    const locations = new URL(requests[1].url, "http://127.0.0.1");
    assert.equal(locations.pathname, "/api/v0/stats/locations");
    assert.equal(locations.searchParams.get("path_by_name"), "true");
    assert.equal(locations.searchParams.get("include_paths"), "/atm26");
    assert.equal(locations.searchParams.get("start"), "2000-01-01T00:00:00Z");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
