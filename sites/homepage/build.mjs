#!/usr/bin/env node
// Build the personal homepage into a deploy directory.
//
// The homepage is hand-written static HTML, with one thing that must not be
// hard-coded in five places: the URL of the ATM26 sub-site. It lives in
// `site.config.json` as `atm26Url`, and every `__ATM26_URL__` token in the
// site's files (HTML and JSON alike) is replaced here. Moving ATM26 to its own
// domain is therefore a one-line change plus a rebuild.
//
// The GoatCounter tracking snippet is handled the same way: `goatcounterCode`
// becomes `__GOATCOUNTER_URL__`, and an empty code removes the whole
// `goatcounter:begin` / `goatcounter:end` block, so a fork never sends hits to
// a site it does not own. Analytics is optional; the build succeeds either way.
//
// Usage:
//   node build.mjs --out <dir>        # write the site into <dir>
//
// Exits non-zero if any token survives the substitution, so a stale build can
// never be deployed silently.

import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const ATM26_TOKEN = "__ATM26_URL__";
const GOATCOUNTER_TOKEN = "__GOATCOUNTER_URL__";
const GOATCOUNTER_BLOCK = /<!--\s*goatcounter:begin\s*-->[\s\S]*?<!--\s*goatcounter:end\s*-->/g;
const TEXT_EXTENSIONS = new Set([".html", ".json", ".js", ".css", ".xml", ".txt"]);

function parseArgs(argv) {
  const out = argv.indexOf("--out");
  if (out === -1 || !argv[out + 1]) {
    console.error("usage: node build.mjs --out <dir>");
    process.exit(2);
  }
  return resolve(argv[out + 1]);
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

function extensionOf(path) {
  const match = /\.[^./]+$/.exec(path);
  return match ? match[0].toLowerCase() : "";
}

async function main() {
  const out = parseArgs(process.argv.slice(2));
  const config = JSON.parse(await readFile(join(ROOT, "site.config.json"), "utf-8"));
  const atm26Url = config.atm26Url;
  if (typeof atm26Url !== "string" || atm26Url.trim() === "") {
    throw new Error("site.config.json: atm26Url must be a non-empty string");
  }
  const goatcounterCode = typeof config.goatcounterCode === "string" ? config.goatcounterCode.trim() : "";
  if (goatcounterCode && !/^[a-z0-9][a-z0-9-]{0,62}$/i.test(goatcounterCode)) {
    throw new Error("site.config.json: goatcounterCode must be a GoatCounter subdomain (letters, digits, hyphens)");
  }
  const goatcounterUrl = goatcounterCode ? `https://${goatcounterCode}.goatcounter.com/count` : "";

  await mkdir(out, { recursive: true });
  let rewritten = 0;
  for await (const path of walk(ROOT)) {
    const name = relative(ROOT, path);
    if (name.startsWith(".") || name === "build.mjs" || name === "site.config.json") continue;
    if (name === "tools" || name.startsWith("tools/")) continue;
    const target = join(out, name);
    if (!TEXT_EXTENSIONS.has(extensionOf(path))) {
      await mkdir(dirname(target), { recursive: true });
      await cp(path, target);
      continue;
    }
    const text = await readFile(path, "utf-8");
    let replaced = text.split(ATM26_TOKEN).join(atm26Url);
    if (goatcounterCode) {
      replaced = replaced.split(GOATCOUNTER_TOKEN).join(goatcounterUrl);
    } else {
      replaced = replaced.replace(GOATCOUNTER_BLOCK, "");
    }
    if (replaced !== text) rewritten += 1;
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, replaced, "utf-8");
  }

  // Fail loudly rather than shipping a placeholder.
  const leftovers = [];
  for await (const path of walk(out)) {
    if (!TEXT_EXTENSIONS.has(extensionOf(path))) continue;
    const built = await readFile(path, "utf-8");
    if (built.includes(ATM26_TOKEN) || built.includes(GOATCOUNTER_TOKEN)) {
      leftovers.push(relative(out, path));
    }
  }
  if (leftovers.length > 0) {
    throw new Error(`unreplaced build token(s) in: ${leftovers.join(", ")}`);
  }

  const files = await readdir(out);
  console.log(
    `homepage → ${out} (${files.length} entries, ${rewritten} rewritten; ATM26 → ${atm26Url}; GoatCounter ${goatcounterCode ? `→ ${goatcounterCode}` : "disabled"})`,
  );
}

main().catch((error) => {
  console.error(`homepage build failed: ${error.message}`);
  process.exit(1);
});
