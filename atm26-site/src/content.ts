// Editable site content.
//
// Keep participant-facing wording, dates, named organizers, logos, outbound
// links and track-specific details here rather than scattered through UI
// components.

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

export interface CitationItem {
  authors: string;
  title: string;
  venue: string;
  link?: string;
}

export const SITE = {
  title: "ATM26 Challenge",
  fullTitle: "ATM26 — Airway Tree Modeling 2026",
  tagline:
    "A public benchmark challenge for automatic airway-tree modeling from chest CT.",
  intro:
    "ATM26 invites teams to develop and submit algorithms for automatic airway segmentation and anatomical labeling from computed tomography (CT) images. Submissions are evaluated by the organizers on a held-out test set, and the results are published on a public leaderboard.",
  organizer: "Institute of Medical Robotics, Shanghai Jiao Tong University",
};

// Public asset paths, served from <base>/img/ (Vite copies public/ verbatim).
// Renderers resolve them against the site base path.
export const IMAGES = {
  banner: "img/banner.webp",
  sensar: "img/sensar.webp",
  miccai: "img/miccai.webp",
};

export interface OrganizerInstitution {
  name: string;
  members: string;
  logo?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home" },
  { id: "overview", label: "Overview" },
  { id: "tracks", label: "Tracks" },
  { id: "organizers", label: "Organizers" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "rules", label: "Rules" },
  { id: "timeline", label: "Timeline" },
  { id: "citation", label: "Citation" },
  { id: "faq", label: "FAQ" },
  { id: "contact", label: "Contact" },
];

// Outbound links. Registration and submission are handled on the official
// Grand Challenge platform, not on this site; the organizer contact email is
// the public challenge address published there.
export const LINKS = {
  officialSite: "https://atm26.grand-challenge.org/",
  submissionGuidelines: "https://atm26.grand-challenge.org/submission-guidelines/",
  contactEmail: "IMR-ATM22@outlook.com",
};

export const TRACKS: TrackInfo[] = [
  {
    slug: "track-1",
    title: "Track 1 — Binary Airway Segmentation",
    short: "Segment the airway tree from chest CT.",
    description:
      "Produce a binary segmentation mask of the airway tree. Predictions are ranked by overlap (DSC, clDice, TLD, BD); methods are encouraged to preserve airway completeness, connectivity and distal branch structures.",
    metrics: [
      { name: "DSC", higherIsBetter: true, note: "Dice similarity coefficient" },
      { name: "clDice", higherIsBetter: true, note: "Centerline Dice" },
      { name: "TLD", higherIsBetter: true, note: "Tree-length detection" },
      { name: "BD", higherIsBetter: true, note: "Branch detection" },
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
      { name: "SC", higherIsBetter: true, note: "Subtree consistency" },
      { name: "TD", higherIsBetter: false, note: "Topological distance; lower is better" },
      { name: "TAcc", higherIsBetter: true, note: "Tree accuracy" },
      { name: "mDice", higherIsBetter: true, note: "Mean Dice (multi-class)" },
      { name: "mclDice", higherIsBetter: true, note: "Mean clDice (multi-class)" },
    ],
  },
];

export const RANKING_POLICY_DESCRIPTION =
  "Each metric is ranked independently; ties receive the average of the ranks they occupy. A submission's final score is the mean of its metric ranks, and the lowest mean rank is placed first.";

// Shown above the leaderboard. Validation Phase results are live;
// Final Test Phase results remain confidential until the official release.
export const LEADERBOARD_NOTICE =
  "Validation Phase results are live. Final Test Phase results remain confidential until the official release.";

export const TIMELINE: TimelineItem[] = [
  {
    date: "2026-06-15",
    title: "Registration open & release of training data",
    detail: "Registration opens and training data for Track 1 and Track 2 is released.",
  },
  {
    date: "2026-07-15",
    title: "Validation phase submission open",
    detail: "Open for validation phase submission for Track 1 and Track 2.",
  },
  {
    date: "2026-08-20",
    title: "Final test phase submission open",
    detail: "Open for final test phase submission for Track 1 and Track 2.",
  },
  {
    date: "2026-09-22",
    title: "Deadline for final test phase submission",
    detail: "11:59 PM PT (Pacific Time) on 22 September 2026 — final test phase submissions close.",
  },
];

export const ORGANIZERS: OrganizerInstitution[] = [
  {
    name: "Shanghai Key Laboratory of Flexible Medical Robotics, Tongren Hospital, Shanghai Jiao Tong University",
    members: "Guang-Zhong Yang, Hanxiao Zhang",
    logo: "img/org-keylab.webp",
  },
  {
    name: "Institute of Medical Robotics, Shanghai Jiao Tong University",
    members: "Guang-Zhong Yang, Yun Gu, Yaoyu Liu, Junyang Wu, Kefan Wang, Shangkun Li",
    logo: "img/org-imr.webp",
  },
  {
    name: "Shanghai Artificial Intelligence Laboratory",
    members: "Minghui Zhang, Yirong Chen",
    logo: "img/org-sail.webp",
  },
  {
    name: "Shanghai Chest Hospital",
    members: "Fangfang Xie, Chunxi Zhang, Jiayuan Sun",
    logo: "img/org-chest.webp",
  },
  {
    name: "Imperial College London",
    members: "Guang Yang",
    logo: "img/org-imperial.webp",
  },
  {
    name: "Technical University of Munich",
    members: "Dianye Huang, Nassir Navab",
    logo: "img/org-tum.webp",
  },
  {
    name: "Politecnico di Milano",
    members: "Elena De Momi",
    logo: "img/org-poli.webp",
  },
  {
    name: "Medical Image Insights",
    members: "Pengcheng Shi, Xinglin Zhang",
    logo: "img/org-mi.webp",
  },
];

export const CITATIONS: CitationItem[] = [
  {
    authors: "Zhang, M., et al.",
    title: "Multi-site, multi-domain airway tree modeling.",
    venue: "Medical Image Analysis, 2023 Dec 90:102957. doi: 10.1016/j.media.2023.102957.",
    link: "https://doi.org/10.1016/j.media.2023.102957",
  },
  {
    authors: "Li, C., Zhang, M., Zhang, C. and Gu, Y., 2025.",
    title: "Reflecting topology consistency and abnormality via learnable attentions for airway labeling.",
    venue: "International Journal of Computer Assisted Radiology and Surgery, 20(7), pp.1315-1323.",
  },
  {
    authors: "Zhang, M., Li, C., Xie, F., Liu, Y., Zhang, H., Wu, J., Zhang, C., Yang, J., Sun, J., Yang, G.Z. and Gu, Y., 2024.",
    title: "Airmorph: Topology-preserving deep learning for pulmonary airway analysis.",
    venue: "arXiv preprint arXiv:2412.11039.",
    link: "https://arxiv.org/abs/2412.11039",
  },
];

export const FAQ: FaqItem[] = [
  {
    question: "How do I register for ATM26?",
    answer:
      "Visit the official ATM26 Grand Challenge site and click Join to register your team. Registration and the signed data usage agreement are required before dataset access is granted.",
  },
  {
    question: "How do I submit an algorithm?",
    answer:
      "Algorithm submission is handled on the official Grand Challenge platform. See the Submission Guidelines there for the current submission portal and container interface.",
  },
  {
    question: "Which metrics are used for ranking?",
    answer:
      "Track 1 uses DSC, clDice, TLD and BD. Track 2 uses ACC, F1, SC, TD, TAcc, mDice and mclDice. See the Tracks page for details.",
  },
  {
    question: "Is the leaderboard final?",
    answer:
      "Validation Phase results are live and mirror the official Grand Challenge leaderboard. Final Test Phase results are confidential and are released by the organizers after the official publication.",
  },
];

export const CONTACT = {
  email: LINKS.contactEmail,
  note: "For challenge-related questions, contact the organizers by email.",
};
