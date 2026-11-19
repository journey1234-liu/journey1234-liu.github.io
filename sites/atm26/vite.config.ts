import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

// Deployment base path.
//
// The site must work both at a repository subpath (a GitHub Pages project site)
// and at the root. This single value controls every asset and data URL so a
// migration never requires component rewrites.
//
//   - Personal Pages subpage (current):  /atm26/
//   - Future organization project site:  /<repository-name>/
//   - Custom domain / root:              /
//
// Override at build time with `VITE_BASE_PATH`; the default below matches the
// current deployment. Trailing slash is required.
const DEFAULT_BASE = "/atm26/";

// Public analytics config. An empty `goatcounterCode` disables the tracker, so
// a fork or a local build never sends hits to this deployment's GoatCounter.
const siteConfig = JSON.parse(
  readFileSync(new URL("./site.config.json", import.meta.url), "utf-8"),
) as { goatcounterCode?: unknown };
const goatcounterCode =
  typeof siteConfig.goatcounterCode === "string" ? siteConfig.goatcounterCode.trim() : "";
if (goatcounterCode && !/^[a-z0-9][a-z0-9-]{0,62}$/i.test(goatcounterCode)) {
  throw new Error("site.config.json: goatcounterCode must be a GoatCounter subdomain");
}
const goatcounterUrl = goatcounterCode
  ? `https://${goatcounterCode}.goatcounter.com/count`
  : "";

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? DEFAULT_BASE,
  define: {
    __GOATCOUNTER_URL__: JSON.stringify(goatcounterUrl),
  },
  build: {
    outDir: "dist",
    target: "es2022",
    sourcemap: false,
  },
});
