// Hand-drawn SVG glyphs for the submission-portal cards.
//
// They are inline markup (not image files) so they stay crisp at any size, need
// no network request, and can carry the track colour. Each glyph is decorative:
// the card title next to it already names the track, so the wrapper is marked
// aria-hidden.

import type { TrackKey } from "./content";

const wrap = (body: string): string =>
  `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false">${body}</svg>`;

/** Track-1: one airway tree, one colour — binary segmentation. */
const BINARY_AIRWAY = wrap(`
  <g stroke="#d13b3b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M24 7.5v12.5"/>
    <path d="M24 20c-4 4-8 6-11 10"/>
    <path d="M24 20c4 4 8 6 11 10"/>
    <path d="M13 30c-2 4-3 7-4 10"/>
    <path d="M13 30c1 4 3 7 4 10"/>
    <path d="M35 30c2 4 3 7 4 10"/>
    <path d="M35 30c-1 4-3 7-4 10"/>
  </g>
  <circle cx="9" cy="41" r="2.1" fill="#d13b3b"/>
  <circle cx="17" cy="41" r="2.1" fill="#d13b3b"/>
  <circle cx="31" cy="41" r="2.1" fill="#d13b3b"/>
  <circle cx="39" cy="41" r="2.1" fill="#d13b3b"/>
`);

/** Track-2: the same tree, every branch its own class colour. */
const LABELLED_AIRWAY = wrap(`
  <g stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M24 7.5v12.5" stroke="#a41034"/>
    <path d="M24 20c-4 4-8 6-11 10" stroke="#d97706"/>
    <path d="M24 20c4 4 8 6 11 10" stroke="#0f766e"/>
    <path d="M13 30c-2 4-3 7-4 10" stroke="#2563eb"/>
    <path d="M13 30c1 4 3 7 4 10" stroke="#7c3aed"/>
    <path d="M35 30c2 4 3 7 4 10" stroke="#db2777"/>
    <path d="M35 30c-1 4-3 7-4 10" stroke="#65a30d"/>
  </g>
  <circle cx="9" cy="41" r="2.1" fill="#2563eb"/>
  <circle cx="17" cy="41" r="2.1" fill="#7c3aed"/>
  <circle cx="31" cy="41" r="2.1" fill="#db2777"/>
  <circle cx="39" cy="41" r="2.1" fill="#65a30d"/>
`);

/** Track-3: the scope entering the airway lumen (concentric rings = depth). */
const BRONCHOSCOPE = wrap(`
  <circle cx="26" cy="21" r="12" stroke="#0e7490" stroke-width="2.4"/>
  <circle cx="26" cy="21" r="6.4" stroke="#0e7490" stroke-width="1.6" opacity="0.45"/>
  <path d="M2.5 44C10 37.5 15.5 32.5 19 28.5c1.6-1.8 3-3.4 4.4-4.8" stroke="#155e75" stroke-width="4" stroke-linecap="round"/>
  <circle cx="24" cy="23.5" r="3" fill="#155e75"/>
  <circle cx="24" cy="23.5" r="1.1" fill="#e0f2fe"/>
`);

export const TRACK_ICONS: Record<TrackKey, string> = {
  t1: BINARY_AIRWAY,
  t2: LABELLED_AIRWAY,
  t3: BRONCHOSCOPE,
};
