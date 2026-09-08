// Static page renderers. Each returns an HTML string; content comes from
// `content.ts` so copy can be edited without touching markup.

import {
  SITE,
  LINKS,
  IMAGES,
  TRACKS,
  RANKING_POLICY_DESCRIPTION,
  TIMELINE,
  ORGANIZERS,
  CITATIONS,
  FAQ,
  CONTACT,
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

/** Render an outbound link; placeholder URLs become a clearly marked pending label. */
function ctaLink(url: string, label: string, className = "cta"): string {
  if (!url || url.includes("PLACEHOLDER")) {
    return `<span class="${className} is-pending" title="Link pending approval">${escapeHtml(label)} (pending)</span>`;
  }
  const rel = url.startsWith("http") ? 'rel="noopener noreferrer" target="_blank"' : "";
  return `<a class="${className}" href="${escapeHtml(url)}" ${rel}>${escapeHtml(label)}</a>`;
}

export function renderHome(): string {
  const timelineSummary = TIMELINE.slice(0, 3)
    .map((item) => `<li><strong>${escapeHtml(item.date)}</strong> — ${escapeHtml(item.title)}</li>`)
    .join("");

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
        <a class="cta cta-secondary" href="#/rules">Rules &amp; submission guide</a>
        ${ctaLink(LINKS.officialSite, "Official challenge site")}
      </div>
    </section>
    <section class="panel">
      <div class="section-kicker">Timeline</div>
      <h2>Status</h2>
      <ul class="timeline-compact">${timelineSummary || "<li>Timeline to be announced.</li>"}</ul>
      <p><a href="#/timeline">Full timeline</a></p>
    </section>`;
}

export function renderOverview(): string {
  return `
    <section class="panel">
      <h1>Challenge Overview</h1>
      <p>${escapeHtml(SITE.intro)}</p>
      <p>
        Registration and submission are handled on the official Grand Challenge
        platform, not on this website. Prepare an algorithm that reads a CT
        image and writes a segmentation; the organizers evaluate submissions on
        a held-out test set and publish the results on the public leaderboard.
      </p>
      <h2>Task</h2>
      <p>Automatic airway-tree modeling from chest CT, evaluated across two complementary tracks.</p>
      <ul>
        <li><strong>Track 1</strong> — binary airway segmentation.</li>
        <li><strong>Track 2</strong> — branch-wise anatomical labeling into 21 classes.</li>
      </ul>
      <p>See the <a href="#/tracks">Tracks</a> page for metric definitions and the <a href="#/rules">Rules</a> page for submission constraints.</p>
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
      <p>ATM26 has two tracks. Teams may participate in one or both.</p>
    </section>
    ${sections}`;
}

export function renderRules(): string {
  return `
    <section class="panel">
      <h1>Rules and Submission Guide</h1>
      <h2>How to submit</h2>
      <p>
        Registration and submission are handled on the official Grand Challenge
        platform, not on this website. Use the official site to register your
        team and to follow the current submission guidelines.
      </p>
      <p>
        ${ctaLink(LINKS.officialSite, "Official challenge site", "cta-inline")}
        ${ctaLink(LINKS.submissionGuidelines, "Submission Guidelines", "cta-inline")}
      </p>
      <h2>Container contract</h2>
      <p>
        Submitted containers read the input CT image from <code>/input</code> and
        write the segmentation to <code>/output</code>. The exact interface is
        described in the challenge documentation distributed to registered
        participants.
      </p>
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
        <img class="org-network-logo" src="${escapeHtml(resolveAsset(IMAGES.sensar))}" alt="SENSAR Network" loading="lazy" />
        <img class="org-network-logo" src="${escapeHtml(resolveAsset(IMAGES.miccai))}" alt="MICCAI 2026" loading="lazy" />
      </div>
      <div class="org-list">${cards}</div>
    </section>`;
}

export function renderStaticPage(route: string): string {
  switch (route) {
    case "overview":
      return renderOverview();
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
