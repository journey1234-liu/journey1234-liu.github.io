# ATM26 public website & Test Phase leaderboard

Static, English-language public site for the ATM26 Challenge (Airway Tree
Modeling 2026). This directory is a Vite + TypeScript static site that builds to
a deployable directory and renders the public leaderboard from the versioned
`public/data/leaderboard.json` snapshot. It is deployed by GitHub Actions to
GitHub Pages as a subpage of the personal pages repository.

## Requirements

- Node.js LTS (see [`.nvmrc`](./.nvmrc); currently Node 22).
- `npm`. Dependencies are locked in `package-lock.json`; CI installs with `npm ci`.

## Commands

```bash
cd atm26-site
npm ci            # install from the lockfile (reproducible)
npm run dev       # local dev server
npm run typecheck # TypeScript type-check only (tsc --noEmit)
npm test          # run vitest: JSON schema, base-path, secret-scan
npm run build     # type-check + production build into dist/
npm run preview   # preview the production build
```

## Layout

```text
atm26-site/
  .nvmrc                    # Node version for CI/local
  vite.config.ts            # build + base-path configuration
  tsconfig.json
  index.html                # SPA shell
  public/
    data/leaderboard.json   # versioned public leaderboard snapshot (generated)
  src/
    main.ts                 # entry point, hash routing, shell
    content.ts              # editable site copy, links, tracks, timeline, FAQ
    pages.ts                # static page renderers
    leaderboard.ts          # leaderboard fetch/render/sort/search
    leaderboardSchema.ts    # client-side shape validation
    basePath.ts             # base-path resolution helpers
    styles.css
  tests/
    leaderboard.test.ts     # validates public/data/leaderboard.json + schema
    basePath.test.ts        # non-root base-path resolution
    secretScan.test.ts      # blocks private identifiers / credentials
```

## Deployment base path

The site must work both at a repository subpath and at the root. One value in
[`vite.config.ts`](./vite.config.ts) controls every asset and data URL:

- Personal Pages subpage (current): `/atm26/`
- Future organization project site: `/<repository-name>/`
- Custom domain / root: `/`

Override at build time without touching components:

```bash
VITE_BASE_PATH=/ATM26-Website/ npm run build
```

The GitHub Actions workflow assembles the artifact so the built site is served
from `/atm26/` while the personal homepage stays at
the repository root.

## GitHub Pages deployment

The workflow `.github/workflows/pages.yml` (at the repository root):

- builds on pushes to the production branch (`master`) that touch website
  source, public data, `package.json`, or the workflow; `workflow_dispatch` also
  redeploys;
- runs the same verification build for pull requests without publishing;
- uses a concurrency group so a newer deployment cancels a superseded one;
- installs Node from `.nvmrc`, runs `npm ci`, `npm test`, `npm run build`, then
  uploads and deploys the assembled artifact.

Configure GitHub Pages to use **GitHub Actions** as the deployment source
(Settings → Pages → Source = GitHub Actions).

> The repository's production branch is currently `master`. If the branch is
> later renamed to `main`, update `branches:` in the workflow and the trigger
> paths accordingly.

## Editing content

Participant-facing copy, dates, organizers, outbound form URLs, track/metric
details, timeline and FAQ live in [`src/content.ts`](./src/content.ts) so they
can be edited without touching markup. Facts that are not yet approved are
marked `PLACEHOLDER` and must be filled in before public release.

The registration and submission form URLs are configurable content
(`LINKS.registration`, `LINKS.submission`); placeholder values render as a
clearly marked "pending" label instead of a dead link.

## Leaderboard data contract

`public/data/leaderboard.json` is a **generated artifact**, not hand-maintained
copy. The evaluation-side publisher is its authoritative producer. The site
consumes this versioned shape (extra forward-compatible fields are ignored):

```json
{
  "schema_version": 2,
  "generated_at": "2026-08-27T00:00:00Z",
  "ranking_policy": {
    "submission_selection": "latest approved successful submission per team and track",
    "method": "mean rank across metrics; ties use average rank"
  },
  "phases": {
    "validation": {
      "label": "Validation Phase",
      "tracks": {
        "track-1": { "metrics": [], "entries": [] },
        "track-2": { "metrics": [], "entries": [] }
      }
    },
    "final-test": {
      "label": "Final Test Phase",
      "tracks": {
        "track-1": { "metrics": [], "entries": [] },
        "track-2": { "metrics": [], "entries": [] }
      }
    }
  }
}
```

Each phase (`validation`, `final-test`, …) carries the two tracks, so the
leaderboard renders a phase selector plus a Track 1 / Track 2 selector. The
phase id maps to the URL sub-route `#/leaderboard/<phase>`.

Each entry exposes only public fields (`rank`, `team_display_name`, metric
values, optional `metric_ranks`/`mean_rank`/`submission_timestamp`). The
website validates the top-level structure and ignores malformed optional
display fields. It never fetches the evaluation server, Google Sheets, a
database, or any private endpoint at runtime.

While Final Test Phase results remain confidential, the committed
`leaderboard.json` contains **placeholder/sample teams and values**; the
leaderboard page shows a "Sample data" notice driven by `LEADERBOARD_NOTICE` in
`content.ts`. Set that notice to `""` when the official snapshot is published.

## Personal → Organization migration

1. Transfer (or push) the repository to the Organization and keep the branch.
2. If the site becomes an Organization project site, set
   `VITE_BASE_PATH` (or the `DEFAULT_BASE` in `vite.config.ts`) to
   `/<repository-name>/` and update the artifact-assembly path in the workflow.
3. Enable Pages in the destination repository and select the GitHub Actions
   source.
4. If a custom domain is used, configure it in Pages settings/DNS (no
   credentials in this repository).
5. Verify every navigation link, asset, and `leaderboard.json` load under the
   new base path (`npm test` covers base-path resolution).

## Security / privacy

- The repository, built artifact, browser requests, Actions logs and git history
  are public. No secrets, evaluation-server identifiers, credentials, private
  participant data, Docker details, or test-set paths may be committed.
- `tests/secretScan.test.ts` runs in CI and fails the build on known secret /
  private-data patterns (server host, private keys, real team IDs).
- The site renders `leaderboard.json` as untrusted input and HTML-escapes all
  displayed strings; fetch/validation failures show a generic message only.
