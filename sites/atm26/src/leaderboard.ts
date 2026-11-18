// Client-side leaderboard rendering and interaction.
//
// The leaderboard is the only dynamically updated part of the public site. It
// fetches the deployed `data/leaderboard.json` (resolved against the base
// path), validates it, and renders each phase (the MICCAI 26 archive phases and
// the longterm leaderboard) with a Track 1 / Track 2 selector, client-side
// sorting, team-name search and paging (rows per page is adjustable:
// 10 / 20 / 50 / all). It degrades to a generic message when the file is
// unavailable or malformed, and never exposes fetch errors or internal data.

import { resolveAsset } from "./basePath";
import {
  LEADERBOARD_NOTICE,
  PHASE_NOTICES,
  PHASE_UPDATE_LOGS,
  SUBMISSION_TAG_LABELS,
} from "./content";
import { metricLabel } from "./metricLabels";
import {
  type LeaderboardSnapshot,
  type PhaseLeaderboard,
  type TrackLeaderboard,
  type LeaderboardEntry,
  parseLeaderboard,
} from "./leaderboardSchema";

interface SortState {
  key: "rank" | string;
  dir: "asc" | "desc";
}

/** Identity of the phase a board belongs to. */
export interface PhaseHeading {
  id: string;
  label: string;
}

interface PageState {
  /** Rows per page; 0 means "show every row". */
  size: number;
  /** 0-based index of the visible page. */
  index: number;
}

/** Rows-per-page choices of the pager; 0 renders every filtered row. */
const PAGE_SIZE_OPTIONS = [10, 20, 50, 0];
export const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_STORAGE_KEY = "atm26.leaderboard.pageSize";

/**
 * Stored rows-per-page choice, or the default. Exported for tests.
 *
 * Only the offered sizes are accepted: a missing key (`getItem` → null) and
 * any stale or hand-edited value fall back to the default instead of being
 * coerced (`Number(null)` is 0, which would silently mean "All").
 */
export function readStoredPageSize(): number {
  try {
    const raw = window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
    const stored = raw ? Number(raw) : Number.NaN;
    return PAGE_SIZE_OPTIONS.includes(stored) ? stored : DEFAULT_PAGE_SIZE;
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
}

function storePageSize(size: number): void {
  try {
    window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(size));
  } catch {
    // Storage unavailable (private mode, disabled cookies): keep it in memory.
  }
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(4);
}

function formatTimestamp(value: string | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return escapeHtml(value);
  return escapeHtml(parsed.toISOString());
}

/** Human-readable UTC form of a results cutoff, e.g. "23 September 2026, 06:59 UTC". */
function formatCutoff(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return escapeHtml(value);
  const date = parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const time = parsed.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  return escapeHtml(`${date}, ${time} UTC`);
}

/**
 * Marker for a row the organizers produced rather than the team: the team's
 * best Validation Phase model, re-evaluated on the Final Test set.
 */
function originBadge(entry: LeaderboardEntry): string {
  if (entry.origin !== "seeded") return "";
  return ` <span class="lb-origin lb-origin-seeded" title="Scored by the organizers from the team's best Validation Phase model — no own Final Test submission was made.">seeded</span>`;
}

/**
 * Era tag of a longterm row: challenge submissions versus later ones. The chip
 * carries the full tag text; the data only stores the short key.
 */
function tagBadge(entry: LeaderboardEntry): string {
  const tag = entry.submission_tag;
  if (!tag) return "";
  const label = SUBMISSION_TAG_LABELS[tag] ?? tag;
  return ` <span class="lb-tag lb-tag-${escapeHtml(tag)}" title="${escapeHtml(label)}">${escapeHtml(label)}</span>`;
}

const TRACK_LABELS: Record<string, string> = {
  "track-1": "Track 1",
  "track-2": "Track 2",
  "track-3": "Track 3",
};

function trackLabel(trackId: string): string {
  return TRACK_LABELS[trackId] ?? trackId;
}

function emptyState(phaseLabel: string, trackId: string): string {
  // A single-track phase already names its track in the label ("Track 3 ·
  // Test"), so appending it again would read "Track 3 · Test · Track 3".
  const label = trackLabel(trackId);
  const scope = phaseLabel.includes(label) ? phaseLabel : `${phaseLabel} · ${label}`;
  return `<p class="lb-empty">No public results for ${escapeHtml(scope)} yet.</p>`;
}

function errorState(): string {
  return `<p class="lb-error">The leaderboard is temporarily unavailable. Please check back later.</p>`;
}

export function renderLeaderboard(
  container: HTMLElement,
  data: unknown,
  route: string[] = [],
): void {
  const { snapshot } = parseLeaderboard(data);
  if (!snapshot) {
    container.innerHTML = `<section class="panel">${errorState()}</section>`;
    return;
  }
  container.innerHTML = buildShell(snapshot, route);
  bindControls(container, snapshot, route);
}

/**
 * Display order of the phase buttons, and therefore the landing phase: opening
 * the leaderboard without a phase in the route selects the first entry here
 * (the frozen MICCAI 26 Final Test ranking), not the first phase of the
 * published snapshot. Phase ids outside this list keep their snapshot order,
 * after the known ones.
 */
const PHASE_DISPLAY_ORDER = [
  "miccai26-final-test",
  "longterm-test",
  "validation",
  "miccai26-validation",
  "track3-validation",
  "track3-test",
];

/**
 * Phase ids the site used before the MICCAI 26 archive split and before the
 * Longterm Validation board became the Longterm Test board, so existing links
 * and bookmarks keep working. The old `validation` route pointed at what is now
 * the live board; that live board continues the Final Test ranking, so the route
 * now lands on the MICCAI 26 Validation archive it is named after.
 */
const PHASE_ALIASES: Record<string, string> = {
  "longterm-validation": "longterm-test",
  validation: "miccai26-validation",
  "final-test": "miccai26-final-test",
  track3: "track3-test",
  "track-3": "track3-test",
};

/**
 * Track-first navigation. A track is the top-level tab; inside it, the boards
 * ("MICCAI 26 Final Test", "Longterm Test", ...) are the second row. The
 * route is `#/leaderboard/<track>/<board>`; a bare `#/leaderboard/<board>`
 * still works for old links.
 */
const TRACK_ORDER = ["track-1", "track-2", "track-3"];

/** Short board labels inside a track (the published labels carry the track). */
const PHASE_TAB_LABELS: Record<string, string> = {
  "miccai26-final-test": "MICCAI 26 Final Test",
  "miccai26-validation": "MICCAI 26 Validation",
  "longterm-test": "Longterm Test",
  validation: "Validation",
  "track3-test": "Final Test",
  "track3-validation": "Validation",
};

/** Boards that stay closed until their phase opens (auto-unlock with rows). */
const LOCKED_PHASES = new Set(["track3-test"]);

const LOCK_ICON = `<svg class="lb-lock-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="3.2" y="7" width="9.6" height="6.6" rx="1.6" fill="currentColor"/></svg>`;

function orderPhases(
  phases: Record<string, PhaseLeaderboard>,
): Array<[string, PhaseLeaderboard]> {
  const rank = (id: string): number => {
    const index = PHASE_DISPLAY_ORDER.indexOf(id);
    return index === -1 ? PHASE_DISPLAY_ORDER.length : index;
  };
  return Object.entries(phases)
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => rank(a.entry[0]) - rank(b.entry[0]) || a.index - b.index)
    .map(({ entry }) => entry);
}

function phasesForTrack(
  snapshot: LeaderboardSnapshot,
  trackId: string,
): Array<[string, PhaseLeaderboard]> {
  return orderPhases(snapshot.phases).filter(([, phase]) =>
    phase.trackOrder.includes(trackId),
  );
}

function totalEntries(phase: PhaseLeaderboard): number {
  return phase.trackOrder.reduce(
    (sum, trackId) => sum + (phase.tracks[trackId]?.entries.length ?? 0),
    0,
  );
}

function isLocked(phaseId: string, phase: PhaseLeaderboard): boolean {
  return LOCKED_PHASES.has(phaseId) && totalEntries(phase) === 0;
}

/** First board of a track that has rows (and is not locked), else its first. */
function defaultPhaseFor(
  snapshot: LeaderboardSnapshot,
  trackId: string,
): [string, PhaseLeaderboard] | undefined {
  const phases = phasesForTrack(snapshot, trackId);
  return (
    phases.find(([id, phase]) => totalEntries(phase) > 0 && !isLocked(id, phase)) ??
    phases[0]
  );
}

interface ResolvedRoute {
  trackIds: string[];
  trackId: string;
  phaseId: string;
  phase: PhaseLeaderboard;
  phases: Array<[string, PhaseLeaderboard]>;
}

const EMPTY_PHASE: PhaseLeaderboard = { tracks: {}, trackOrder: [] };

function resolveRoute(snapshot: LeaderboardSnapshot, route: string[]): ResolvedRoute {
  const trackIds = TRACK_ORDER.filter(
    (trackId) => phasesForTrack(snapshot, trackId).length > 0,
  );
  const [first, second] = route;

  let trackId = first && trackIds.includes(first) ? first : undefined;
  let requested = trackId ? second : first;
  if (requested) requested = PHASE_ALIASES[requested] ?? requested;
  if (!trackId && requested) {
    trackId = trackIds.find((id) =>
      phasesForTrack(snapshot, id).some(([phaseId]) => phaseId === requested),
    );
  }
  trackId = trackId ?? trackIds[0] ?? "";

  const phases = trackId ? phasesForTrack(snapshot, trackId) : [];
  const chosen =
    (requested ? phases.find(([phaseId]) => phaseId === requested) : undefined) ??
    phases.find(([phaseId, phase]) => totalEntries(phase) > 0 && !isLocked(phaseId, phase)) ??
    phases[0];

  return {
    trackIds,
    trackId,
    phaseId: chosen?.[0] ?? "",
    phase: chosen?.[1] ?? EMPTY_PHASE,
    phases,
  };
}

function buildShell(snapshot: LeaderboardSnapshot, route: string[]): string {
  const { trackIds, trackId, phaseId: activeId, phase: activePhase, phases } =
    resolveRoute(snapshot, route);
  const policy = snapshot.ranking_policy;
  const policyText =
    policy?.method || policy?.submission_selection
      ? [policy.submission_selection, policy.method].filter(Boolean).join(" · ")
      : "";

  // A frozen phase carries its results cutoff: nothing submitted afterwards is
  // in the board, so it must read as a static snapshot, not a live board.
  const frozenNotice =
    activePhase.results_cutoff !== undefined
      ? `<div class="lb-frozen">
          <strong>${activePhase.frozen ? "Frozen snapshot" : "Results cutoff"}:</strong>
          this board contains no result submitted after
          <strong>${formatCutoff(activePhase.results_cutoff)}</strong>
          and is not updated live.
        </div>`
      : "";

  const updateLogHtml = renderUpdateLog(activeId);
  const locked = isLocked(activeId, activePhase);
  const phaseNotice =
    !locked && PHASE_NOTICES[activeId]
      ? `<div class="lb-phase-notice">${escapeHtml(PHASE_NOTICES[activeId])}</div>`
      : "";

  const trackTabs = trackIds
    .map((id) => {
      const target = defaultPhaseFor(snapshot, id);
      const isActive = id === trackId;
      return `<a class="lb-tab${isActive ? " is-active" : ""}" href="#/leaderboard/${id}/${
        target?.[0] ?? ""
      }"${isActive ? ' aria-current="page"' : ""}>${escapeHtml(trackLabel(id))}</a>`;
    })
    .join("");

  const phaseTabs = phases
    .map(([phaseId, phase]) => {
      const isActive = phaseId === activeId;
      const locked = isLocked(phaseId, phase);
      const label = PHASE_TAB_LABELS[phaseId] ?? phase.label ?? phaseId;
      return `<a class="lb-tab${isActive ? " is-active" : ""}${
        locked ? " is-locked" : ""
      }" href="#/leaderboard/${trackId}/${phaseId}"${
        isActive ? ' aria-current="page"' : ""
      }>${escapeHtml(label)}${locked ? LOCK_ICON : ""}</a>`;
    })
    .join("");

  return `
    <section class="panel">
      <div class="section-kicker">Results</div>
      <h2>Leaderboard</h2>
      ${LEADERBOARD_NOTICE ? `<div class="lb-notice">${escapeHtml(LEADERBOARD_NOTICE)}</div>` : ""}
      ${frozenNotice}
      <div class="lb-meta">
        <span>Updated: ${formatTimestamp(snapshot.generated_at)}</span>
        ${policyText ? `<span>Ranking: ${escapeHtml(policyText)}</span>` : ""}
      </div>
      <div class="lb-toolbar">
        <div class="lb-tabs" role="tablist" aria-label="Track">${trackTabs}</div>
      </div>
      <div class="lb-toolbar">
        <div class="lb-tabs" role="tablist" aria-label="Board">${phaseTabs}</div>
        <label class="lb-search">
          <span class="visually-hidden">Search teams</span>
          <input type="search" id="lb-search" placeholder="Search teams…" autocomplete="off" />
        </label>
      </div>
      ${phaseNotice}
      <div class="lb-boards">${
        locked ? lockedState(trackId, activePhase.label || activeId) : ""
      }</div>
      ${updateLogHtml}
    </section>`;
}

/** Placeholder for a board whose phase has not opened yet. */
function lockedState(trackId: string, phaseLabel: string): string {
  return `
    <div class="lb-board lb-locked">
      <div class="lb-locked-card">
        <span class="lb-locked-icon" aria-hidden="true">${LOCK_ICON}</span>
        <p class="lb-locked-title">${escapeHtml(trackLabel(trackId))} · ${escapeHtml(
          PHASE_TAB_LABELS["track3-test"] ?? phaseLabel,
        )} is locked</p>
        <p class="lb-locked-note">
          This leaderboard opens when the phase opens. Track-3 validation results
          are on the Validation board.
        </p>
      </div>
    </div>`;
}

/** Update log of a phase, rendered under its board. Empty when none. */
function renderUpdateLog(phaseId: string): string {
  const entries = PHASE_UPDATE_LOGS[phaseId] ?? [];
  if (entries.length === 0) return "";
  return `
      <div class="lb-updatelog">
        <div class="section-kicker">Update log</div>
        <ul>
          ${entries
            .map(
              (entry) =>
                `<li><strong>${escapeHtml(entry.date)}</strong>${escapeHtml(entry.note)}</li>`,
            )
            .join("")}
        </ul>
      </div>`;
}

function bindControls(
  container: HTMLElement,
  snapshot: LeaderboardSnapshot,
  route: string[],
): void {
  const { trackId, phaseId: activeId, phase } = resolveRoute(snapshot, route);
  const boardsEl = container.querySelector<HTMLElement>(".lb-boards");
  const searchEl = container.querySelector<HTMLInputElement>("#lb-search");
  if (!boardsEl || !searchEl) return;

  if (isLocked(activeId, phase)) {
    searchEl.disabled = true;
    return;
  }

  const sortState: SortState = { key: "rank", dir: "asc" };
  const pageState: PageState = { size: readStoredPageSize(), index: 0 };

  const renderActive = (query: string, resetPage = true): void => {
    if (resetPage) pageState.index = 0;
    const track: TrackLeaderboard = phase.tracks[trackId] ?? { metrics: [], entries: [] };
    boardsEl.innerHTML = renderBoard(
      { id: activeId, label: phase.label || activeId },
      trackId,
      track,
      query,
      sortState,
      pageState,
    );
    bindBoard(boardsEl, track, sortState, pageState, (_trackId, query, resetPage) =>
      renderActive(query, resetPage),
    );
  };

  searchEl.addEventListener("input", () => renderActive(searchEl.value));
  renderActive("");
}

function rangeLabel(start: number, shown: number, total: number): string {
  const noun = total === 1 ? "team" : "teams";
  if (shown === 0) return `No ${noun}`;
  return `${start + 1}–${start + shown} of ${total} ${noun}`;
}

/**
 * Header of the name column. Validation rows are keyed by Grand Challenge
 * account — the board shows ``user (Team)`` for them — while the Final Test and
 * Longterm Test boards rank our own team registrations and show the team alone.
 */
const TEAM_COLUMN_HEADERS: Record<string, string> = {
  "miccai26-validation": "Username (Team)",
};
const DEFAULT_TEAM_HEADER = "Team";

/**
 * One page of a track's board. Exported for tests; `page.index` is clamped to
 * the available pages, and the columns follow the phase (see above).
 */
export function renderBoard(
  phase: PhaseHeading,
  trackId: string,
  track: TrackLeaderboard,
  query: string,
  sortState: SortState,
  page: PageState = { size: DEFAULT_PAGE_SIZE, index: 0 },
): string {
  const phaseLabel = phase.label;
  if (track.entries.length === 0) {
    return `<div class="lb-board">${emptyState(phaseLabel, trackId)}</div>`;
  }

  const visible = track.entries.filter((entry) =>
    entry.team_display_name.toLowerCase().includes(query),
  );

  const metricNames = track.metrics.map((metric) => metric.name);
  const sorted = [...visible].sort((a, b) => compareEntries(a, b, sortState));

  const total = sorted.length;
  const size = page.size > 0 ? page.size : Math.max(total, 1);
  const pageCount = Math.max(1, Math.ceil(total / size));
  page.index = Math.min(Math.max(page.index, 0), pageCount - 1);
  const start = page.index * size;
  const pageRows = sorted.slice(start, start + size);

  const headers = [
    `<th scope="col" data-sort="rank" class="is-sortable">Rank</th>`,
    `<th scope="col" class="lb-team">${TEAM_COLUMN_HEADERS[phase.id] ?? DEFAULT_TEAM_HEADER}</th>`,
    ...metricNames.map(
      (name) => `<th scope="col" data-sort="${escapeHtml(name)}" class="is-sortable">${metricLabel(name)}</th>`,
    ),
    `<th scope="col" class="is-sortable" data-sort="mean_rank">Mean rank</th>`,
  ].join("");

  const rows = pageRows
    .map(
      (entry) => `
      <tr>
        <td class="lb-rank">${formatNumber(entry.rank)}</td>
        <td class="lb-team">${escapeHtml(entry.team_display_name)}${originBadge(entry)}${tagBadge(entry)}</td>
        ${metricNames
          .map((name) => {
            const value = entry.metrics[name];
            return `<td>${value === undefined ? "—" : formatNumber(value)}</td>`;
          })
          .join("")}
        <td>${entry.mean_rank === undefined ? "—" : formatNumber(entry.mean_rank)}</td>
      </tr>`,
    )
    .join("");

  const pager =
    total > 0
      ? `
      <div class="lb-pager">
        <label class="lb-pagesize">
          <span>Rows per page</span>
          <select id="lb-page-size">
            ${PAGE_SIZE_OPTIONS.map(
              (option) =>
                `<option value="${option}"${option === page.size ? " selected" : ""}>${
                  option === 0 ? "All" : option
                }</option>`,
            ).join("")}
          </select>
        </label>
        <span class="lb-range">${rangeLabel(start, pageRows.length, total)}</span>
        ${
          pageCount > 1
            ? `<span class="lb-pagenav">
          <button type="button" data-page="prev"${page.index === 0 ? " disabled" : ""}>Previous</button>
          <span class="lb-pageinfo">Page ${page.index + 1} of ${pageCount}</span>
          <button type="button" data-page="next"${
            page.index >= pageCount - 1 ? " disabled" : ""
          }>Next</button>
        </span>`
            : ""
        }
      </div>`
      : "";

  return `
    <div class="lb-board">
      ${visible.length === 0 && query ? `<p class="lb-empty">No teams match “${escapeHtml(query)}”.</p>` : ""}
      ${visible.length > 0 ? `
      ${pager}
      <div class="lb-table-wrap">
        <table>
          <thead><tr>${headers}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>` : ""}
    </div>`;
}

function compareEntries(a: LeaderboardEntry, b: LeaderboardEntry, sortState: SortState): number {
  const { key, dir } = sortState;
  const aValue = key === "rank" ? a.rank : key === "mean_rank" ? a.mean_rank : a.metrics[key];
  const bValue = key === "rank" ? b.rank : key === "mean_rank" ? b.mean_rank : b.metrics[key];

  if (aValue === undefined && bValue === undefined) return 0;
  if (aValue === undefined) return 1;
  if (bValue === undefined) return -1;

  const direction = dir === "asc" ? 1 : -1;
  if (aValue < bValue) return -1 * direction;
  if (aValue > bValue) return 1 * direction;
  return a.team_display_name.localeCompare(b.team_display_name);
}

function bindBoard(
  board: HTMLElement,
  track: TrackLeaderboard,
  sortState: SortState,
  pageState: PageState,
  renderActive: (trackId: string, query: string, resetPage?: boolean) => void,
): void {
  // The board is re-rendered in place, so the surrounding controls are read
  // back from the DOM instead of being captured.
  const currentTrack = (): string =>
    board.closest(".panel")?.querySelector<HTMLButtonElement>(".lb-tab[data-track].is-active")
      ?.dataset.track ?? "";
  const currentQuery = (): string =>
    board.closest(".panel")?.querySelector<HTMLInputElement>("#lb-search")?.value ?? "";

  const headers = board.querySelectorAll<HTMLTableCellElement>("th[data-sort]");
  for (const header of headers) {
    header.addEventListener("click", () => {
      const key = header.dataset.sort ?? "rank";
      const metric = track.metrics.find((m) => m.name === key);
      const naturalDesc = metric ? metric.higher_is_better : true;
      if (sortState.key === key) {
        sortState.dir = sortState.dir === "asc" ? "desc" : "asc";
      } else {
        sortState.key = key;
        sortState.dir = naturalDesc ? "desc" : "asc";
      }
      renderActive(currentTrack(), currentQuery());
    });
  }

  const sizeEl = board.querySelector<HTMLSelectElement>("#lb-page-size");
  sizeEl?.addEventListener("change", () => {
    pageState.size = Number(sizeEl.value);
    if (!PAGE_SIZE_OPTIONS.includes(pageState.size)) pageState.size = DEFAULT_PAGE_SIZE;
    storePageSize(pageState.size);
    renderActive(currentTrack(), currentQuery());
  });

  for (const button of board.querySelectorAll<HTMLButtonElement>("button[data-page]")) {
    button.addEventListener("click", () => {
      pageState.index += button.dataset.page === "next" ? 1 : -1;
      renderActive(currentTrack(), currentQuery(), false);
    });
  }
}

/** Fetch and render the deployed leaderboard snapshot for one phase. */
export async function mountLeaderboard(
  container: HTMLElement,
  route: string[] = [],
): Promise<void> {
  const url = resolveAsset("data/leaderboard.json");
  let data: unknown;
  try {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) {
      container.innerHTML = `<section class="panel">${errorState()}</section>`;
      return;
    }
    data = await response.json();
  } catch {
    container.innerHTML = `<section class="panel">${errorState()}</section>`;
    return;
  }
  renderLeaderboard(container, data, route);
}
