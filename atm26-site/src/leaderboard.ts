// Client-side leaderboard rendering and interaction.
//
// The leaderboard is the only dynamically updated part of the public site. It
// fetches the deployed `data/leaderboard.json` (resolved against the base
// path), validates it, and renders Track 1 / Track 2 with client-side sorting
// and team-name search. It degrades to a generic message when the file is
// unavailable or malformed, and never exposes fetch errors or internal data.

import { resolveAsset } from "./basePath";
import { LEADERBOARD_NOTICE } from "./content";
import {
  type LeaderboardSnapshot,
  type TrackLeaderboard,
  type LeaderboardEntry,
  parseLeaderboard,
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

function emptyState(trackId: string): string {
  return `<p class="lb-empty">No public results for ${escapeHtml(trackId)} yet.</p>`;
}

function errorState(): string {
  return `<p class="lb-error">The leaderboard is temporarily unavailable. Please check back later.</p>`;
}

export function renderLeaderboard(container: HTMLElement, data: unknown): void {
  const { snapshot, result } = parseLeaderboard(data);
  if (!snapshot) {
    // Never surface validation details to end users.
    void result;
    container.innerHTML = `<section class="panel">${errorState()}</section>`;
    return;
  }
  container.innerHTML = buildShell(snapshot);
  bindControls(container, snapshot);
}

function buildShell(snapshot: LeaderboardSnapshot): string {
  const policy = snapshot.ranking_policy;
  const policyText =
    policy?.method || policy?.submission_selection
      ? [policy.submission_selection, policy.method].filter(Boolean).join(" · ")
      : "";

  return `
    <section class="panel">
      <h2>Leaderboard</h2>
      ${LEADERBOARD_NOTICE ? `<div class="lb-notice">${escapeHtml(LEADERBOARD_NOTICE)}</div>` : ""}
      <div class="lb-meta">
        <span>Updated: ${formatTimestamp(snapshot.generated_at)}</span>
        ${policyText ? `<span>Ranking: ${escapeHtml(policyText)}</span>` : ""}
      </div>
      <div class="lb-toolbar">
        <div class="lb-tabs" role="tablist" aria-label="Track selector">
          <button class="lb-tab is-active" data-track="track-1" role="tab" aria-selected="true">Track 1</button>
          <button class="lb-tab" data-track="track-2" role="tab" aria-selected="false">Track 2</button>
        </div>
        <label class="lb-search">
          <span class="visually-hidden">Search teams</span>
          <input type="search" id="lb-search" placeholder="Search teams…" autocomplete="off" />
        </label>
      </div>
      <div class="lb-boards"></div>
    </section>`;
}

function bindControls(container: HTMLElement, snapshot: LeaderboardSnapshot): void {
  const boardsEl = container.querySelector<HTMLElement>(".lb-boards");
  const searchEl = container.querySelector<HTMLInputElement>("#lb-search");
  const tabs = Array.from(container.querySelectorAll<HTMLButtonElement>(".lb-tab"));
  if (!boardsEl || !searchEl) return;

  let activeTrack = "track-1";
  const sortState: SortState = { key: "rank", dir: "asc" };

  const renderActive = (): void => {
    const track: TrackLeaderboard = snapshot.tracks[activeTrack as "track-1" | "track-2"];
    const query = searchEl.value.trim().toLowerCase();
    boardsEl.innerHTML = renderBoard(activeTrack, track, query, sortState);
    bindTableSort(boardsEl, track, sortState, renderActive);
  };

  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      activeTrack = tab.dataset.track ?? "track-1";
      for (const other of tabs) {
        const selected = other === tab;
        other.classList.toggle("is-active", selected);
        other.setAttribute("aria-selected", String(selected));
      }
      renderActive();
    });
  }

  searchEl.addEventListener("input", renderActive);
  renderActive();
}

function renderBoard(
  trackId: string,
  track: TrackLeaderboard,
  query: string,
  sortState: SortState,
): string {
  if (track.entries.length === 0) {
    return `<div class="lb-board" data-track="${escapeHtml(trackId)}">${emptyState(trackId)}</div>`;
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
    <div class="lb-board" data-track="${escapeHtml(trackId)}">
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

function compareEntries(
  a: LeaderboardEntry,
  b: LeaderboardEntry,
  sortState: SortState,
): number {
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
  renderActive: () => void,
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
      renderActive();
    });
  }
}

/** Fetch and render the deployed leaderboard snapshot. */
export async function mountLeaderboard(container: HTMLElement): Promise<void> {
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
  renderLeaderboard(container, data);
}
