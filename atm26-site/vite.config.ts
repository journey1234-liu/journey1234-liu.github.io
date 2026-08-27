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

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? DEFAULT_BASE,
  build: {
    outDir: "dist",
    target: "es2022",
    sourcemap: false,
  },
});
