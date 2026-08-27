// Editable site content.
//
// Keep participant-facing wording, dates, named organizers, logos, outbound
// links and track-specific details here rather than scattered through UI
// components. Facts that are not yet approved are clearly marked PLACEHOLDER.

export interface NavItem {
  id: string;
  label: string;
}

export interface TrackInfo {
  slug: string;
  title: string;
  short: string;
  description: string;
  metrics: { name: string; higherIsBetter: boolean; note: string }[];
}

export interface TimelineItem {
  date: string;
  title: string;
  detail: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export const SITE = {
  title: "ATM26 Challenge",
  fullTitle: "ATM26 — Airway Tree Modeling 2026",
  tagline:
    "A public benchmark challenge for automatic airway-tree modeling from chest CT.",
  intro:
    "ATM26 invites teams to develop and submit algorithms for automatic airway segmentation and anatomical labeling from computed tomography (CT) images. Participants submit Docker containers; organizers evaluate them on a held-out test set and publish a public leaderboard.",
  organizer: "Institute of Medical Robotics, Shanghai Jiao Tong University",
  organizerPlaceholderNote:
    "PLACEHOLDER: organizer wording and logos are provisional and must be confirmed before public release.",
};

export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home" },
  { id: "overview", label: "Overview" },
  { id: "tracks", label: "Tracks" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "rules", label: "Rules" },
  { id: "timeline", label: "Timeline" },
  { id: "faq", label: "FAQ" },
  { id: "contact", label: "Contact" },
];

// Outbound calls to action. The exact form URLs are configurable content; the
// placeholders below must be replaced with the real Google Forms before launch.
export const LINKS = {
  registration: "https://forms.gle/PLACEHOLDER_REGISTRATION",
  submission: "https://forms.gle/PLACEHOLDER_SUBMISSION",
  canonicalExternal: "",
  contactEmail: "atm26-organizers@example.com", // PLACEHOLDER
};

export const TRACKS: TrackInfo[] = [
  {
    slug: "track-1",
    title: "Track 1 — Binary Airway Segmentation",
    short: "Segment the airway tree from chest CT.",
    description:
      "Produce a binary segmentation mask of the airway tree. Predictions are evaluated for overlap (DSC, clDice, TLD, BD) and topological error (Betti0).",
    metrics: [
      { name: "DSC", higherIsBetter: true, note: "Dice similarity coefficient" },
      { name: "clDice", higherIsBetter: true, note: "Centerline Dice" },
      { name: "TLD", higherIsBetter: true, note: "Tree-length detection" },
      { name: "BD", higherIsBetter: true, note: "Branch detection" },
      { name: "Betti0Error", higherIsBetter: false, note: "Lower is better" },
    ],
  },
  {
    slug: "track-2",
    title: "Track 2 — Branch-wise Anatomical Labeling",
    short: "Label airway branches into 21 anatomical classes.",
    description:
      "Assign each airway voxel one of 21 segmental labels (LB1–10, RB1–10, trachea). Predictions are projected onto ground-truth branch nodes and scored for classification and voxel-level agreement.",
    metrics: [
      { name: "ACC", higherIsBetter: true, note: "Branch classification accuracy" },
      { name: "F1", higherIsBetter: true, note: "Branch F1 score" },
      { name: "SC", higherIsBetter: true, note: "Specificity" },
      { name: "TD", higherIsBetter: false, note: "Tree discrepancy; lower is better" },
      { name: "mDice", higherIsBetter: true, note: "Multi-class Dice" },
      { name: "mclDice", higherIsBetter: true, note: "Multi-class clDice" },
    ],
  },
];

export const RANKING_POLICY_DESCRIPTION =
  "Each metric is ranked independently; ties receive the average of the ranks they occupy. A submission's final score is the mean of its metric ranks, and the lowest mean rank is placed first.";

// Shown above the leaderboard. While Final Test Phase results remain
// confidential the site publishes placeholder/sample data; set to "" once the
// official leaderboard is released.
export const LEADERBOARD_NOTICE =
  "Sample data — the leaderboard currently shows placeholder results. Final Test Phase results remain confidential until the official release.";

export const TIMELINE: TimelineItem[] = [
  {
    date: "PLACEHOLDER",
    title: "Challenge announcement and registration open",
    detail: "Date to be confirmed before public release.",
  },
  {
    date: "PLACEHOLDER",
    title: "Test Phase opens",
    detail: "Participants submit Docker containers via the submission form.",
  },
  {
    date: "PLACEHOLDER",
    title: "Test Phase closes",
    detail: "Final submissions are frozen and evaluated.",
  },
  {
    date: "PLACEHOLDER",
    title: "Results and leaderboard publication",
    detail: "Final leaderboard is published on this site.",
  },
];

export const FAQ: FaqItem[] = [
  {
    question: "How do I register for ATM26?",
    answer:
      "Complete the registration form (see the link in the header/Home page). You will receive further instructions by email.",
  },
  {
    question: "How do I submit an algorithm?",
    answer:
      "Submissions are Docker containers uploaded through the submission form. The Rules and Submission Guide page describes the required interface.",
  },
  {
    question: "Which metrics are used for ranking?",
    answer:
      "Track 1 uses DSC, clDice, TLD, BD and Betti0Error. Track 2 uses ACC, F1, SC, TD, mDice and mclDice. See the Tracks page for details.",
  },
  {
    question: "Is the leaderboard final?",
    answer:
      "The Test Phase leaderboard may show sample data while results are being finalized. The official ranking is published by the organizers.",
  },
];

export const CONTACT = {
  email: LINKS.contactEmail,
  note: "For challenge-related questions, contact the organizers by email.",
};
