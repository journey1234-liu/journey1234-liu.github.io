#!/usr/bin/env node
// Build the personal homepage into a deploy directory.
//
// The homepage is hand-written static HTML, with one thing that must not be
// hard-coded in five places: the URL of the ATM26 sub-site. It lives in
// `site.config.json` as `atm26Url`, and every `__ATM26_URL__` token in the
// site's files (HTML and JSON alike) is replaced here. Moving ATM26 to its own
// domain is therefore a one-line change plus a rebuild.
//
// Usage:
//   node build.mjs --out <dir>        # write the site into <dir>
//
// Exits non-zero if any token survives the substitution, so a stale build can
// never be deployed silently.

import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const TOKEN = "__ATM26_URL__";
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

  await mkdir(out, { recursive: true });
  let rewritten = 0;
  for await (const path of walk(ROOT)) {
    const name = relative(ROOT, path);
    if (name.startsWith(".") || name === "build.mjs" || name === "site.config.json") continue;
    const target = join(out, name);
    if (!TEXT_EXTENSIONS.has(extensionOf(path))) {
      await mkdir(dirname(target), { recursive: true });
      await cp(path, target);
      continue;
    }
    const text = await readFile(path, "utf-8");
    const replaced = text.split(TOKEN).join(atm26Url);
    if (replaced !== text) rewritten += 1;
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, replaced, "utf-8");
  }

  // Fail loudly rather than shipping a placeholder.
  const leftovers = [];
  for await (const path of walk(out)) {
    if (!TEXT_EXTENSIONS.has(extensionOf(path))) continue;
    if ((await readFile(path, "utf-8")).includes(TOKEN)) leftovers.push(relative(out, path));
  }
  if (leftovers.length > 0) {
    throw new Error(`unreplaced ${TOKEN} in: ${leftovers.join(", ")}`);
  }

  const files = await readdir(out);
  console.log(
    `homepage → ${out} (${files.length} entries, ${rewritten} file(s) with __ATM26_URL__ → ${atm26Url})`,
  );
}

main().catch((error) => {
  console.error(`homepage build failed: ${error.message}`);
  process.exit(1);
});
