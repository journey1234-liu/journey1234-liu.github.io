import "./styles.css";
import { NAV_ITEMS, SITE } from "./content";
import { currentBase } from "./basePath";
import { renderStaticPage } from "./pages";
import { mountLeaderboard } from "./leaderboard";

function parseHash(): { page: string; phase: string | null } {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const segments = (hash || "home").split("/");
  return {
    page: segments[0] || "home",
    phase: segments.length > 1 ? segments[1] : null,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderNav(active: string): string {
  const base = currentBase();
  const items = NAV_ITEMS.map((item) => {
    const isActive = item.id === active;
    // "Home" is the site root (/atm26/), not a hash sub-route.
    const href = item.id === "home" ? base : `#/${item.id}`;
    return `<a class="nav-item${isActive ? " is-active" : ""}" href="${href}"${
      isActive ? ' aria-current="page"' : ""
    }>${escapeHtml(item.label)}</a>`;
  }).join("");
  return `<nav class="nav" aria-label="Primary">${items}</nav>`;
}

function renderShell(route: string, content: string): string {
  const pageLabel = NAV_ITEMS.find((item) => item.id === route)?.label ?? SITE.title;
  return `
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="${currentBase()}">${escapeHtml(SITE.title)}</a>
        ${renderNav(route)}
      </div>
    </header>
    <main id="main" class="site-main" tabindex="-1">
      <div id="page">${content}</div>
    </main>
    <footer class="site-footer">
      <p>${escapeHtml(SITE.organizer)}</p>
      <p class="muted">${escapeHtml(SITE.organizerPlaceholderNote)}</p>
      <p class="muted">${escapeHtml(pageLabel)} — ${escapeHtml(SITE.fullTitle)}</p>
    </footer>`;
}

async function mount(): Promise<void> {
  const app = document.getElementById("app");
  if (!app) return;
  const { page: route, phase } = parseHash();
  const pageLabel = NAV_ITEMS.find((item) => item.id === route)?.label;
  document.title = route === "home" || !pageLabel ? SITE.title : `${pageLabel} — ${SITE.title}`;

  app.innerHTML = renderShell(
    route,
    route === "leaderboard" ? '<p class="loading">Loading leaderboard…</p>' : renderStaticPage(route),
  );

  if (route === "leaderboard") {
    const page = document.getElementById("page");
    if (page) await mountLeaderboard(page, phase);
  }
  const main = document.getElementById("main");
  main?.focus({ preventScroll: true });
}

window.addEventListener("hashchange", () => {
  void mount();
});

void mount();
