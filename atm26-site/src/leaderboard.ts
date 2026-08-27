// Client-side leaderboard rendering and interaction.
//
// The leaderboard is the only dynamically updated part of the public site. It
// fetches the deployed `data/leaderboard.json` (resolved against the base
// path), validates it, and renders each phase (validation / final-test / …)
// with a Track 1 / Track 2 selector, client-side sorting and team-name search.
// It degrades to a generic message when the file is unavailable or malformed,
// and never exposes fetch errors or internal data.

import { resolveAsset } from "./basePath";
import { LEADERBOARD_NOTICE } from "./content";
import {
  type LeaderboardSnapshot,
  type PhaseLeaderboard,
  type TrackLeaderboard,
  type LeaderboardEntry,
  parseLeaderboard,
  TRACK_IDS,
} from "./leaderboardSchema";

interface SortState {
  key: "rank" | string;
  dir: "asc" | "desc";
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

function trackLabel(trackId: string): string {
  return trackId === "track-1" ? "Track 1" : "Track 2";
}

function emptyState(phaseLabel: string, trackId: string): string {
  return `<p class="lb-empty">No public results for ${escapeHtml(phaseLabel)} · ${escapeHtml(trackLabel(trackId))} yet.</p>`;
}

function errorState(): string {
  return `<p class="lb-error">The leaderboard is temporarily unavailable. Please check back later.</p>`;
}

export function renderLeaderboard(
  container: HTMLElement,
  data: unknown,
  activePhaseId: string | null,
): void {
  const { snapshot } = parseLeaderboard(data);
  if (!snapshot) {
    container.innerHTML = `<section class="panel">${errorState()}</section>`;
    return;
  }
  container.innerHTML = buildShell(snapshot, activePhaseId);
  bindControls(container, snapshot, activePhaseId);
}

function resolvePhase(
  snapshot: LeaderboardSnapshot,
  activePhaseId: string | null,
): { id: string; phase: PhaseLeaderboard } {
  const entries = Object.entries(snapshot.phases);
  if (entries.length === 0) {
    return { id: "", phase: { tracks: {} } };
  }
  const found = entries.find(([id]) => id === activePhaseId);
  return found ? { id: found[0], phase: found[1] } : { id: entries[0][0], phase: entries[0][1] };
}

function buildShell(snapshot: LeaderboardSnapshot, activePhaseId: string | null): string {
  const { id: activeId } = resolvePhase(snapshot, activePhaseId);
  const policy = snapshot.ranking_policy;
  const policyText =
    policy?.method || policy?.submission_selection
      ? [policy.submission_selection, policy.method].filter(Boolean).join(" · ")
      : "";

  const phaseTabs = Object.entries(snapshot.phases)
    .map(([phaseId, phase]) => {
      const label = phase.label || phaseId;
      const isActive = phaseId === activeId;
      return `<a class="lb-tab${isActive ? " is-active" : ""}" href="#/leaderboard/${phaseId}"${
        isActive ? ' aria-current="true"' : ""
      }>${escapeHtml(label)}</a>`;
    })
    .join("");

  const trackTabs = TRACK_IDS.map((trackId, index) => {
    const isActive = index === 0;
    return `<button class="lb-tab${isActive ? " is-active" : ""}" data-track="${trackId}" aria-pressed="${isActive}">${trackLabel(
      trackId,
    )}</button>`;
  }).join("");

  return `
    <section class="panel">
      <div class="section-kicker">Results</div>
      <h2>Leaderboard</h2>
      ${LEADERBOARD_NOTICE ? `<div class="lb-notice">${escapeHtml(LEADERBOARD_NOTICE)}</div>` : ""}
      <div class="lb-meta">
        <span>Updated: ${formatTimestamp(snapshot.generated_at)}</span>
        ${policyText ? `<span>Ranking: ${escapeHtml(policyText)}</span>` : ""}
      </div>
      <div class="lb-toolbar">
        <div class="lb-tabs" role="tablist" aria-label="Phase selector">${phaseTabs}</div>
      </div>
      <div class="lb-toolbar">
        <div class="lb-tabs" role="tablist" aria-label="Track selector">${trackTabs}</div>
        <label class="lb-search">
          <span class="visually-hidden">Search teams</span>
          <input type="search" id="lb-search" placeholder="Search teams…" autocomplete="off" />
        </label>
      </div>
      <div class="lb-boards"></div>
    </section>`;
}

function bindControls(
  container: HTMLElement,
  snapshot: LeaderboardSnapshot,
  activePhaseId: string | null,
): void {
  const { id: activeId, phase } = resolvePhase(snapshot, activePhaseId);
  const boardsEl = container.querySelector<HTMLElement>(".lb-boards");
  const searchEl = container.querySelector<HTMLInputElement>("#lb-search");
  const trackTabs = Array.from(
    container.querySelectorAll<HTMLButtonElement>(".lb-tab[data-track]"),
  );
  if (!boardsEl || !searchEl) return;

  const sortState: SortState = { key: "rank", dir: "asc" };

  const renderActive = (trackId: string, query: string): void => {
    const track: TrackLeaderboard = phase.tracks[trackId] ?? { metrics: [], entries: [] };
    boardsEl.innerHTML = renderBoard(phase.label || activeId, trackId, track, query, sortState);
    bindTableSort(boardsEl, track, sortState, renderActive);
  };

  let activeTrack: string = TRACK_IDS[0];
  for (const tab of trackTabs) {
    tab.addEventListener("click", () => {
      activeTrack = tab.dataset.track ?? TRACK_IDS[0];
      for (const other of trackTabs) {
        const selected = other === tab;
        other.classList.toggle("is-active", selected);
        other.setAttribute("aria-pressed", String(selected));
      }
      renderActive(activeTrack, searchEl.value);
    });
  }

  searchEl.addEventListener("input", () => renderActive(activeTrack, searchEl.value));
  renderActive(activeTrack, "");
}

function renderBoard(
  phaseLabel: string,
  trackId: string,
  track: TrackLeaderboard,
  query: string,
  sortState: SortState,
): string {
  if (track.entries.length === 0) {
    return `<div class="lb-board">${emptyState(phaseLabel, trackId)}</div>`;
  }

  const visible = track.entries.filter((entry) =>
    entry.team_display_name.toLowerCase().includes(query),
  );

  const metricNames = track.metrics.map((metric) => metric.name);
  const sorted = [...visible].sort((a, b) => compareEntries(a, b, sortState));

  const headers = [
    `<th scope="col" data-sort="rank" class="is-sortable">Rank</th>`,
    `<th scope="col" class="lb-team">Team</th>`,
    ...metricNames.map(
      (name) => `<th scope="col" data-sort="${escapeHtml(name)}" class="is-sortable">${escapeHtml(name)}</th>`,
    ),
    `<th scope="col" class="is-sortable" data-sort="mean_rank">Mean rank</th>`,
  ].join("");

  const rows = sorted
    .map(
      (entry) => `
      <tr>
        <td class="lb-rank">${formatNumber(entry.rank)}</td>
        <td class="lb-team">${escapeHtml(entry.team_display_name)}</td>
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

  return `
    <div class="lb-board">
      ${visible.length === 0 && query ? `<p class="lb-empty">No teams match “${escapeHtml(query)}”.</p>` : ""}
      ${visible.length > 0 ? `
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

function bindTableSort(
  board: HTMLElement,
  track: TrackLeaderboard,
  sortState: SortState,
  renderActive: (trackId: string, query: string) => void,
): void {
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
      const searchEl = board.parentElement?.querySelector<HTMLInputElement>("#lb-search");
      const activeTrack = board
        .closest(".panel")
        ?.querySelector<HTMLButtonElement>(".lb-tab[data-track].is-active")?.dataset.track;
      renderActive(activeTrack ?? "track-1", searchEl?.value ?? "");
    });
  }
}

/** Fetch and render the deployed leaderboard snapshot for one phase. */
export async function mountLeaderboard(
  container: HTMLElement,
  activePhaseId: string | null,
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
  renderLeaderboard(container, data, activePhaseId);
}
