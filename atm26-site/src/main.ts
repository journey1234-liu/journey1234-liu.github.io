import "./styles.css";
import { NAV_ITEMS, SITE } from "./content";
import { renderStaticPage } from "./pages";
import { mountLeaderboard } from "./leaderboard";

function currentRoute(): string {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return hash || "home";
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
  const items = NAV_ITEMS.map((item) => {
    const isActive = item.id === active;
    return `<a class="nav-item${isActive ? " is-active" : ""}" href="#/${item.id}"${
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
        <a class="brand" href="#/home">${escapeHtml(SITE.title)}</a>
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
  const route = currentRoute();
  const pageLabel = NAV_ITEMS.find((item) => item.id === route)?.label;
  document.title = route === "home" || !pageLabel ? SITE.title : `${pageLabel} — ${SITE.title}`;

  app.innerHTML = renderShell(
    route,
    route === "leaderboard" ? '<p class="loading">Loading leaderboard…</p>' : renderStaticPage(route),
  );

  if (route === "leaderboard") {
    const page = document.getElementById("page");
    if (page) await mountLeaderboard(page);
  }
  const main = document.getElementById("main");
  main?.focus({ preventScroll: true });
}

window.addEventListener("hashchange", () => {
  void mount();
});

void mount();
