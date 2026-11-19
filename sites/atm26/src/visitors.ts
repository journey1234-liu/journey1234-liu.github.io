import { resolveAsset } from "./basePath";

/** Aggregate snapshot written by tools/fetch_visits.mjs in CI. */
export interface VisitorSnapshot {
  total: number;
  countries: VisitorCountry[];
  unknown: number;
  generatedAt: string;
}

export interface VisitorCountry {
  name: string;
  visits: number;
}

const SNAPSHOT_PATH = "data/visits.json";

let cachedSnapshot: VisitorSnapshot | null = null;
let pendingSnapshot: Promise<VisitorSnapshot | null> | null = null;

function toCount(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.trunc(number) : 0;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Validate and normalise the CI snapshot; null means "do not show stats". */
export function parseVisitorSnapshot(data: unknown): VisitorSnapshot | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  if (record.configured !== true) return null;

  const countries = Array.isArray(record.countries)
    ? record.countries
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const country = item as Record<string, unknown>;
          const name = typeof country.name === "string" ? country.name.trim() : "";
          const visits = toCount(country.visits);
          return name && visits > 0 ? { name, visits } : null;
        })
        .filter((country): country is VisitorCountry => country !== null)
        .sort((a, b) => b.visits - a.visits || a.name.localeCompare(b.name, "en"))
    : [];

  return {
    total: toCount(record.total),
    countries,
    unknown: toCount(record.unknown),
    generatedAt: typeof record.generatedAt === "string" ? record.generatedAt : "",
  };
}

export function formatShare(visits: number, total: number): string {
  if (total <= 0) return "0%";
  const share = (visits / total) * 100;
  if (share > 0 && share < 1) return "<1%";
  return `${Math.round(share)}%`;
}

export function visitorTotalLabel(total: number): string {
  return total === 1 ? "visit to the ATM26 site" : "visits to the ATM26 site";
}

/** Render the country rows; empty string when there are no located visits. */
export function renderVisitorRows(snapshot: VisitorSnapshot): string {
  const rows: Array<VisitorCountry & { unknown: boolean }> = snapshot.countries.map(
    (country) => ({ ...country, unknown: false }),
  );
  if (snapshot.unknown > 0) {
    rows.push({ name: "Unknown location", visits: snapshot.unknown, unknown: true });
  }
  if (rows.length === 0) return "";

  const max = rows.reduce((highest, row) => Math.max(highest, row.visits), 1);
  return rows
    .map((row) => {
      const width = Math.max(2, (row.visits / max) * 100);
      const count = `${row.visits.toLocaleString("en-US")} · ${formatShare(row.visits, snapshot.total)}`;
      return `<li class="visitor-country-row${row.unknown ? " is-unknown" : ""}">
        <span class="visitor-country-name">${escapeHtml(row.name)}</span>
        <span class="visitor-country-track"><span class="visitor-country-bar" style="width:${width.toFixed(1)}%"></span></span>
        <span class="visitor-country-count">${count}</span>
      </li>`;
    })
    .join("");
}

async function loadSnapshot(): Promise<VisitorSnapshot | null> {
  try {
    const response = await fetch(resolveAsset(SNAPSHOT_PATH), { cache: "no-cache" });
    if (!response.ok) return null;
    return parseVisitorSnapshot(await response.json());
  } catch (error) {
    console.warn("Visitor statistics are unavailable:", error);
    return null;
  }
}

/** Fill the home-page panel from the cached snapshot, fetching it once. */
export async function mountVisitors(): Promise<void> {
  const section = document.getElementById("visitors");
  if (!section) return;

  if (!cachedSnapshot) {
    pendingSnapshot ??= loadSnapshot();
    cachedSnapshot = await pendingSnapshot;
    pendingSnapshot = null;
  }
  const snapshot = cachedSnapshot;
  if (!snapshot) return;

  const total = document.getElementById("visitor-total");
  if (total) total.textContent = snapshot.total.toLocaleString("en-US");

  const totalLabel = document.getElementById("visitor-total-label");
  if (totalLabel) totalLabel.textContent = visitorTotalLabel(snapshot.total);

  const meta = document.getElementById("visitor-meta");
  if (meta) {
    const updated = snapshot.generatedAt ? new Date(snapshot.generatedAt) : null;
    const date =
      updated && !Number.isNaN(updated.getTime())
        ? updated.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "";
    meta.textContent = date ? `All time · updated ${date}` : "All time";
  }

  const list = document.getElementById("visitor-country-list");
  if (list) list.innerHTML = renderVisitorRows(snapshot);

  const empty = document.getElementById("visitor-empty");
  if (empty) empty.hidden = snapshot.countries.length > 0 || snapshot.unknown > 0;

  const countryCount = document.getElementById("visitor-country-count");
  if (countryCount) {
    countryCount.textContent =
      snapshot.countries.length === 0
        ? ""
        : `${snapshot.countries.length.toLocaleString("en-US")} ${
            snapshot.countries.length === 1 ? "country/region" : "countries/regions"
          }`;
  }

  section.hidden = false;
}

/** Add GoatCounter's count.js; no-op when the site code is not configured. */
export function installTracker(url: string): void {
  if (!url || document.querySelector("script[data-goatcounter]")) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://gc.zgo.at/count.js";
  script.setAttribute("data-goatcounter", url);
  document.head.appendChild(script);
}
