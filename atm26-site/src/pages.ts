// Static page renderers. Each returns an HTML string; content comes from
// `content.ts` so copy can be edited without touching markup.

import {
  SITE,
  IMAGES,
  TRACKS,
  INTRODUCTION,
  TRACKS_INTRO,
  NEWS,
  RANKING_POLICY_DESCRIPTION,
  TIMELINE,
  ORGANIZERS,
  CITATIONS,
  FAQ,
  CONTACT,
  COMMON_PITFALLS,
  SUBMISSION_PORTALS,
  SUBMISSION_TIPS,
} from "./content";
import { resolveAsset } from "./basePath";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Inline link placeholders used inside content.ts strings. */
const INLINE_LINKS: Record<string, { href: string; label: string }> = {
  leaderboard: { href: "#/leaderboard/validation", label: "leaderboard" },
  guidelines: {
    href: "https://github.com/EndoluminalSurgicalVision-IMR/Airway-Tree-Modeling-26/tree/master/baseline-and-submission-guideline",
    label: "guidelines",
  },
  "batch contract section": {
    href: "https://github.com/EndoluminalSurgicalVision-IMR/Airway-Tree-Modeling-26/tree/master/baseline-and-submission-guideline#batch-execution-validation--final-test-phases",
    label: "batch contract section",
  },
};

/** Escape plain text, then expand {placeholder} tokens into safe inline links. */
function renderInlineLinks(value: string): string {
  let html = escapeHtml(value);
  for (const [token, link] of Object.entries(INLINE_LINKS)) {
    const rel = link.href.startsWith("http")
      ? ' rel="noopener noreferrer" target="_blank"'
      : "";
    const anchor = `<a href="${escapeHtml(link.href)}"${rel}>${escapeHtml(link.label)}</a>`;
    html = html.replaceAll(`{${token}}`, anchor);
  }
  return html;
}

export function renderHome(): string {
  const introHtml = INTRODUCTION.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
  const newsHtml = NEWS.length
    ? NEWS.map(
        (n) => `<li><strong>${escapeHtml(n.date)}</strong> — ${escapeHtml(n.title)}<br /><span class="muted">${escapeHtml(n.detail)}</span></li>`,
      ).join("")
    : "<li>No news yet.</li>";
  const trackCards = TRACKS.map(
    (track) => `
      <div class="home-track">
        <h2>${escapeHtml(track.title)}</h2>
        <p>${escapeHtml(track.short)}</p>
      </div>`,
  ).join("");

  return `
    <section class="panel hero-banner-panel">
      <img
        class="hero-banner"
        src="${escapeHtml(resolveAsset(IMAGES.banner))}"
        alt="${escapeHtml(SITE.fullTitle)} banner"
      />
    </section>
    <section class="panel hero">
      <div class="section-kicker">Airway Tree Modeling &middot; 2026</div>
      <h1>${escapeHtml(SITE.title)}</h1>
      <p class="subtitle">${escapeHtml(SITE.tagline)}</p>
      <p class="lede">${escapeHtml(SITE.intro)}</p>
      <div class="cta-row">
        <a class="cta" href="#/leaderboard">View leaderboard</a>
        <a class="cta" href="#/rules">Submit to Validation Phase</a>
        <a class="cta cta-secondary" href="#/rules">Submit to Final Test Phase</a>
      </div>
    </section>
    <section class="panel">
      <div class="section-kicker">Challenge</div>
      <h2>About ATM26</h2>
      ${introHtml}
    </section>
    <section class="panel">
      <div class="section-kicker">News</div>
      <h2>Latest updates</h2>
      <ul class="news-list">${newsHtml}</ul>
    </section>
    <section class="panel">
      <div class="section-kicker">Tasks</div>
      <h2>Tracks</h2>
      <div class="home-tracks">${trackCards}</div>
      <p class="muted">${escapeHtml(TRACKS_INTRO)}</p>
      <p><a href="#/tracks">Metric definitions and track details</a></p>
    </section>`;
}

export function renderTracks(): string {
  const sections = TRACKS.map((track) => {
    const metricRows = track.metrics
      .map(
        (metric) => `
        <tr>
          <td>${escapeHtml(metric.name)}</td>
          <td>${metric.higherIsBetter ? "Higher is better" : "Lower is better"}</td>
          <td>${escapeHtml(metric.note)}</td>
        </tr>`,
      )
      .join("");
    return `
      <section class="panel">
        <h2>${escapeHtml(track.title)}</h2>
        <p>${escapeHtml(track.short)}</p>
        <p>${escapeHtml(track.description)}</p>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Metric</th><th>Direction</th><th>Description</th></tr></thead>
            <tbody>${metricRows}</tbody>
          </table>
        </div>
      </section>`;
  }).join("");

  return `
    <section class="panel">
      <h1>Tracks</h1>
      <p>${escapeHtml(TRACKS_INTRO)}</p>
    </section>
    ${sections}`;
}

export function renderRules(): string {
  const portalCards = SUBMISSION_PORTALS.map(
    (portal) => `
      <div class="portal-card">
        <h3>${escapeHtml(portal.title)}</h3>
        <ul class="portal-facts">
          ${portal.facts.map((fact) => `<li>${renderInlineLinks(fact)}</li>`).join("")}
        </ul>
        <p>
          <a
            class="cta-inline"
            href="${escapeHtml(portal.formUrl)}"
            rel="noopener noreferrer"
            target="_blank"
          >Open submission form</a>
        </p>
      </div>`,
  ).join("");
  const tipsHtml = SUBMISSION_TIPS.map(
    (tip) => `<li><strong>${escapeHtml(tip.title)}</strong> — ${renderInlineLinks(tip.note)}</li>`,
  ).join("");

  return `
    <section class="panel">
      <h1>Rules and Submission Guide</h1>
      <h2>How to submit</h2>
      <p>
        Register for the challenge and sign the data usage agreement on the
        official Grand Challenge site. Your algorithm container is submitted
        through the phase-specific portal below (Final Test or Validation) and
        is evaluated on the organizers' own machines.
      </p>
      <h2>Submission portals</h2>
      <div class="portal-grid">${portalCards}</div>
      <h2>Submission tips</h2>
      <ul class="tips-list">${tipsHtml}</ul>
      <h2>Container contract</h2>
      <p>
        Submitted containers read the input CT image from <code>/input</code> and
        write the segmentation to <code>/output</code>. The exact interface is
        described in the challenge documentation distributed to registered
        participants.
      </p>
      <h2>Common pitfalls</h2>
      <p>
        Track-2 labels are 0&ndash;20 (class 20 is a real scored branch). Avoid
        these common submission mistakes:
      </p>
      <ul class="pitfall-list">
        ${COMMON_PITFALLS.map(
          (item) => `<li><strong>${escapeHtml(item.title)}</strong> — ${escapeHtml(item.note)}</li>`,
        ).join("")}
      </ul>
      <h2>Ranking policy</h2>
      <p>${escapeHtml(RANKING_POLICY_DESCRIPTION)}</p>
    </section>`;
}

export function renderTimeline(): string {
  const items = TIMELINE.map(
    (item) => `
      <li>
        <div class="timeline-date">${escapeHtml(item.date)}</div>
        <div><strong>${escapeHtml(item.title)}</strong><br />${escapeHtml(item.detail)}</div>
      </li>`,
  ).join("");
  return `
    <section class="panel">
      <h1>Timeline</h1>
      <ol class="timeline">${items || "<li>Timeline to be announced.</li>"}</ol>
    </section>`;
}

export function renderCitation(): string {
  const items = CITATIONS.map(
    (c, i) => `
      <li>
        <strong>[${i + 1}]</strong> ${escapeHtml(c.authors)} ${escapeHtml(c.title)}
        <em>${escapeHtml(c.venue)}</em>
        ${c.link ? ` <a href="${escapeHtml(c.link)}" rel="noopener noreferrer" target="_blank">${escapeHtml(c.link)}</a>` : ""}
      </li>`,
  ).join("");
  return `
    <section class="panel">
      <h1>Citation</h1>
      <p>If using the ATM26 dataset, please cite the following papers:</p>
      <ol class="citation-list">${items}</ol>
    </section>`;
}

export function renderFaq(): string {
  const items = FAQ.map(
    (item) => `
      <details>
        <summary>${escapeHtml(item.question)}</summary>
        <p>${escapeHtml(item.answer)}</p>
      </details>`,
  ).join("");
  return `
    <section class="panel">
      <h1>FAQ</h1>
      ${items || "<p>No entries yet.</p>"}
    </section>`;
}

export function renderContact(): string {
  return `
    <section class="panel">
      <h1>Contact</h1>
      <p>${escapeHtml(CONTACT.note)}</p>
      <p>Email: <a href="mailto:${escapeHtml(CONTACT.email)}">${escapeHtml(CONTACT.email)}</a></p>
    </section>`;
}

export function renderOrganizers(): string {
  const cards = ORGANIZERS.map(
    (org) => `
      <div class="org-card">
        <div class="org-logo-col">
          ${
            org.logo
              ? `<img src="${escapeHtml(resolveAsset(org.logo))}" alt="${escapeHtml(org.name)} logo" loading="lazy" />`
              : ""
          }
        </div>
        <div>
          <h2>${escapeHtml(org.name)}</h2>
          <p>${escapeHtml(org.members)}</p>
        </div>
      </div>`,
  ).join("");

  return `
    <section class="panel">
      <h1>Organizers</h1>
      <p>ATM26 is organized by the following partners. For challenge-related questions, contact the organizers by email.</p>
      <div class="org-logo-row">
        <img class="org-network-logo" src="${escapeHtml(resolveAsset(IMAGES.keylab))}" alt="Shanghai Key Laboratory of Flexible Medical Robotics" loading="lazy" />
        <img class="org-network-logo" src="${escapeHtml(resolveAsset(IMAGES.tongren))}" alt="Shanghai Tongren Hospital" loading="lazy" />
      </div>
      <div class="org-list">${cards}</div>
    </section>`;
}

export function renderStaticPage(route: string): string {
  switch (route) {
    case "tracks":
      return renderTracks();
    case "organizers":
      return renderOrganizers();
    case "rules":
      return renderRules();
    case "timeline":
      return renderTimeline();
    case "citation":
      return renderCitation();
    case "faq":
      return renderFaq();
    case "contact":
      return renderContact();
    case "home":
    default:
      return renderHome();
  }
}
