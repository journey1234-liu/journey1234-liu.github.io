# ATM26 public website & Test Phase leaderboard

Static, English-language public site for the ATM26 Challenge (Airway Tree
Modeling 2026). This directory is a Vite + TypeScript static site that builds to
a deployable directory and renders the public leaderboard from the versioned
`public/data/leaderboard.json` snapshot.

It lives at `sites/atm26/` in the personal Pages repository and is deployed to
`/atm26/` by `.github/workflows/deploy.yml`, which builds the homepage and this
site as two independent steps so this directory can be extracted into a
repository of its own (see *Standalone repository* below).

## Requirements

- Node.js LTS (see [`.nvmrc`](./.nvmrc); currently Node 22).
- `npm`. Dependencies are locked in `package-lock.json`; CI installs with `npm ci`.

## Commands

```bash
cd sites/atm26
npm ci            # install from the lockfile (reproducible)
npm run dev       # local dev server
npm run typecheck # TypeScript type-check only (tsc --noEmit)
npm test          # run vitest: JSON schema, base paths, visitors, secret scan
npm run build     # type-check + production build into dist/
npm run preview   # preview the production build
node --test tools/fetch_visits.test.mjs  # visitor snapshot tool (node:test)
```

## Layout

```text
sites/atm26/
  .nvmrc                    # Node version for CI/local
  vite.config.ts            # build + base-path configuration
  vitest.config.ts          # Vitest scope (tests/ only)
  tsconfig.json
  site.config.json          # public config: GoatCounter code + tracked path
  index.html                # SPA shell
  public/
    data/leaderboard.json   # versioned public leaderboard snapshot (generated)
    img/tasks/              # Track 1/2 training-example figures for the home Tasks panel / Tracks page
    img/workshop/           # MICCAI 2026 workshop day: agenda slide + 6 photos
  src/
    main.ts                 # entry point, hash routing, shell
    content.ts              # editable site copy, links, tracks, timeline, FAQ
    pages.ts                # static page renderers
    leaderboard.ts          # leaderboard fetch/render/sort/search
    leaderboardSchema.ts    # client-side shape validation
    metricLabels.ts         # display labels (Betti0Error → β₀ error)
    basePath.ts             # base-path resolution helpers
    visitors.ts             # visitor panel: snapshot parsing, rendering, tracker
    styles.css
  tests/
    leaderboard.test.ts     # validates public/data/leaderboard.json + schema
    basePath.test.ts        # non-root base-path resolution
    secretScan.test.ts      # blocks private identifiers / credentials
    homeBanner.test.ts      # home page banner copy and styling
    news.test.ts            # home page news list contract
    resultsCopy.test.ts     # no stale "results are confidential" copy
    portals.test.ts         # submission form URLs stay verbatim
    pitfalls.test.ts        # Rules page pitfalls contract
    workshop.test.ts        # home workshop agenda + seamless photo strip contract
    taskFigures.test.ts     # demo-figure metadata, asset presence and markup contract
    visitors.test.ts        # visitor snapshot parsing + country-row rendering
  tools/
    gc_validation_snapshot.json       # frozen GC validation mirror (public data)
    refresh_gc_validation_overlay.py  # re-reads GC: team labels + Betti0Error
    fetch_visits.mjs        # CI: GoatCounter aggregate snapshot (visitor panel)
    fetch_visits.test.mjs   # node:test suite for the snapshot tool
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
from `/atm26/` while the personal homepage stays at the site root. Nothing else
in the repository is referenced at build time, and the homepage's ATM26 links
come from `sites/homepage/site.config.json` (`atm26Url`).

## Visitor statistics

The home page shows an aggregate visitor panel (`#visitors`): all-time visits
and a country/region breakdown, deliberately without a world map. Data comes
from [GoatCounter](https://www.goatcounter.com/), which is cookie-free and does
not store IP addresses.

GoatCounter counts **visits**, not raw pageviews. A visit is the first load of
`/atm26` in a session; sessions are keyed on site + User-Agent + IP and expire
after 8 hours of inactivity. Reloading, moving between SPA hash routes, and
returning within that window do not add another visit; a return after 8 hours
(or from a different IP/User-Agent) does. To count every page load instead,
disable sessions in GoatCounter under **Settings → Data collection →
Sessions**.

- `site.config.json` holds the public `goatcounterCode` (the
  `https://<code>.goatcounter.com` subdomain) and `goatcounterPath` (`/atm26`;
  GoatCounter normalizes `/atm26/` to `/atm26`), the path the snapshot
  aggregates. An empty code removes the tracker and hides the panel.
- The browser only reads `data/visits.json`, an aggregate snapshot written by
  `tools/fetch_visits.mjs` in CI; the GoatCounter API token never reaches the
  browser.
- `public/data/visits.json` is the committed fallback (the last snapshot that
  was verified against the API), so the panel stays visible when a refresh
  fails or the secret is absent. It is replaced by the fetched snapshot at
  deploy time.
- The deploy workflow writes the snapshot to `deploy/atm26/data/visits.json`
  **after** the site is assembled, and a daily schedule refreshes it. Until the
  token exists the panel shows the committed snapshot and the build still
  succeeds.
- If the configured path has no stored pageviews yet, the tool retries without
  the path filter and aggregates the whole GoatCounter site instead.

The token is the repository secret `GOATCOUNTER_API_TOKEN`; create it in
GoatCounter with the statistics/read permission. To refresh locally:

```bash
GOATCOUNTER_API_TOKEN=... node tools/fetch_visits.mjs --out /tmp/visits.json
node --test tools/fetch_visits.test.mjs
```

The homepage at the repository root is not tracked.

## GitHub Pages deployment

The workflow `.github/workflows/deploy.yml` (at the repository root):

- builds on pushes to the production branch (`master`) that touch website
  source, public data, `package.json`, or the workflow; `workflow_dispatch` also
  redeploys;
- runs the same verification build for pull requests without publishing;
- uses a concurrency group so a newer deployment cancels a superseded one;
- installs Node from `.nvmrc`, runs `npm ci`, `npm test`, the visitor-tool
  `node --test tools/fetch_visits.test.mjs`, then `npm run build`, then uploads
  and deploys the assembled artifact. After assembly the job writes the
  aggregate visitor snapshot (`deploy/atm26/data/visits.json`) from the
  `GOATCOUNTER_API_TOKEN` secret; without the secret the committed
  `public/data/visits.json` is deployed instead.

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

## Task figures

The home Tasks panel and each Tracks section share the figures in
`public/img/tasks/`:

- **Track 1 / Track 2** use the same training CT case. The input cube is three
  orthogonal CT slices composed into a volume; the output is the airway lumen
  rendered as a red binary surface (Track 1) or as a 20-class coloured surface
  (Track 2, cool colours for left-lung branches, warm for right-lung branches,
  neutral grey for the trachea and main bronchi).
- **Track 3** packs ten frames of one training bronchoscopy sequence top to
  bottom (first frame at the top, last at the bottom). On the Tracks page each
  frame is labelled to its right with the landmark from the sequence's
  `labels.csv` (trachea, right main bronchus, bronchus intermedius, right middle
  lobe, RB5). The output is a translucent 32-class airway surface with the
  endoluminal path from the trachea (100) through the right main (102) and
  bronchus intermedius (112) to the right middle lobe (110) and RB5 (12), the
  sequence's destination. Five bronchoscopy frames sit on axial planes along
  the path, each tagged with the same per-frame landmark, so the sequence and
  the 3D route read as one scene. Frames live in `public/img/tasks/track3/`; the scene is
  `bronch-output.webp`, with an unlabelled `bronch-output-thumb.webp` for the
  home card.
- The home cards use the tighter, stylized `ct-volume-thumb.webp`; the Tracks
  page uses the larger `ct-volume.webp`. The Track 3 card uses the vertical
  timeline (`seq-strip`) plus `bronch-output-thumb.webp`; the Tracks page shows
  all ten frames and the labelled `bronch-output.webp`. Figures are transparent
  WebP so the dark viewer surface in `styles.css` provides the background.

Figure metadata (paths, intrinsic sizes, alt text, captions, legend labels and
the Track-3 output note) lives in `src/content.ts` under `TRACKS[].figure`; the
renderers are `renderTaskCard` / `renderTrackFigure` in `src/pages.ts`. Every task
image is lazy-loaded, while the intrinsic `width`/`height` attributes reserve
space and prevent layout shift.

## Leaderboard data contract

`public/data/leaderboard.json` is a **generated artifact**, not hand-maintained
copy. The evaluation-side publisher is its authoritative producer. The site
consumes this versioned shape (extra forward-compatible fields are ignored):

```json
{
  "schema_version": 3,
  "generated_at": "2026-08-27T00:00:00Z",
  "ranking_policy": {
    "submission_selection": "latest approved successful submission per team and track",
    "method": "mean rank across metrics; ties use average rank"
  },
  "phases": {
    "miccai26-final-test": {
      "label": "MICCAI 26 · Final Test",
      "track_order": ["track-1", "track-2"],
      "tracks": {
        "track-1": { "metrics": [], "entries": [] },
        "track-2": { "metrics": [], "entries": [] }
      }
    },
    "track3-test": {
      "label": "Track 3 · Test",
      "track_order": ["track-3"],
      "tracks": {
        "track-3": { "metrics": [], "entries": [] }
      }
    }
  }
}
```

Schema 3 names the tracks **per phase**: `track_order` lists the phase's tracks
in display order and must match the keys of `tracks`. The leaderboard renders a
phase selector plus one tab per declared track, so a Track 3 phase has a single
"Track 3" tab while the CT phases keep Track 1 / Track 2. Schema 2 documents
(no `track_order`, always the two CT tracks) are still accepted. The phase id
maps to the URL sub-route `#/leaderboard/<phase>`.

The published snapshot carries five phases: `miccai26-final-test` and
`miccai26-validation` (the frozen MICCAI 26 archives), `longterm-test` (the
Final Test ranking carried forward), and `track3-test` / `track3-validation`
(the live Track 3 boards, one track each, ranked by frame Macro-F1, frame
accuracy, segmental edit and segmental F1@50). `longterm-test` rows carry a
`submission_tag`: `miccai26` for a frozen challenge result, `post-miccai26` for
an evaluation scored after the challenge closed. Older routes
(`#/leaderboard/longterm-validation`, `#/leaderboard/track3`) are aliased in
`leaderboard.ts`.

Each entry exposes only public fields (`rank`, `team_display_name`, metric
values, optional `metric_ranks`/`mean_rank`/`submission_timestamp`). The
website validates the top-level structure and ignores malformed optional
display fields. It never fetches the evaluation server, Google Sheets, a
database, or any private endpoint at runtime.

The committed `leaderboard.json` carries the frozen MICCAI 26 archives and the
live Longterm Test board (its frozen rows tagged as challenge submissions and
later Final Test results tagged as post-challenge). The leaderboard page notice
is driven by `LEADERBOARD_NOTICE` in `content.ts`; per-phase update logs live in
`PHASE_UPDATE_LOGS`.

## Standalone repository

This directory has no dependency on the rest of the repository, so it can be
lifted out at any time:

1. Copy `sites/atm26/` into the new repository and make it the repository root.
2. In `vite.config.ts`, set `DEFAULT_BASE` to `/` (a root site or custom domain)
   or to `/<repository-name>/` (an organization project site); `VITE_BASE_PATH`
   still overrides it for one-off builds.
3. Add the *ATM26 Challenge site* steps of `.github/workflows/deploy.yml`
   (checkout → setup-node → `npm ci` → `npm test` →
   `node --test tools/fetch_visits.test.mjs` → `npm run build` → upload `dist/`)
   as the new repository's workflow, dropping the `cp` into `deploy/atm26/`.
   If the visitor panel is kept, add the `Add ATM26 visitor statistics` step,
   write its output to `deploy/atm26/data/visits.json` **after** assembly, and add the
   `GOATCOUNTER_API_TOKEN` secret; an empty `goatcounterCode` disables it all.
4. Point the publisher at the new working copy (its `DEFAULT_SITE` /
   `publish_and_push.sh` paths) — the publishing pipeline lives in the private
   ops repository, not here.
5. On the homepage, change `atm26Url` in `sites/homepage/site.config.json` to
   the new address and let the workflow rebuild it.
6. Verify: home page, deep links (`#/leaderboard/validation`, `#/tracks`,
   `#/rules`), `data/leaderboard.json` load, and `npm test` under the new base.

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
