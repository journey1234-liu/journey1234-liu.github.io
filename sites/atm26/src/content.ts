// Editable site content.
//
// Keep participant-facing wording, dates, named organizers, logos, outbound
// links and track-specific details here rather than scattered through UI
// components.

export interface NavItem {
  id: string;
  label: string;
}

export interface TrackFigureFrame {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Numeric tag shown on the timeline, e.g. "000". */
  label?: string;
  /** "start" or "final" when the frame bounds the sequence. */
  role?: string;
}

export interface TrackFigurePane {
  label: string;
  kind: string;
  note: string;
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  thumbSrc?: string;
  thumbWidth?: number;
  thumbHeight?: number;
}

export interface TrackFigureLegendItem {
  label: string;
  className: string;
}

export interface TrackFigure {
  caption: string;
  input: TrackFigurePane;
  output: TrackFigurePane | null;
  frames?: TrackFigureFrame[];
  legend?: TrackFigureLegendItem[];
}

export interface TrackInfo {
  slug: string;
  title: string;
  cardKicker: string;
  cardTitle: string;
  cardShort: string;
  /** Decorative cover copy for a card without a demo figure. */
  coverNumber?: string;
  coverCaption?: string;
  short: string;
  description: string;
  metrics: { name: string; higherIsBetter: boolean; note: string }[];
  /** Visual demo for the Tasks panel / Tracks page; omitted while a track's
   * output representation is still being designed. */
  figure?: TrackFigure;
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

export interface NewsItem {
  date: string;
  title: string;
  detail: string;
}

export const SITE = {
  title: "ATM26 Challenge",
  fullTitle: "ATM26 — Airway Tree Modeling 2026",
  tagline:
    "A public benchmark challenge for airway-tree modeling from chest CT and bronchoscopy frames.",
  intro:
    "ATM26 invites teams to develop and submit algorithms for automatic airway segmentation and anatomical labeling from computed tomography (CT) images, and frame-level landmark recognition from bronchoscopy sequences. Submissions are evaluated by the organizers on a held-out test set, and the results are published on a public leaderboard.",
  organizer: "Institute of Medical Robotics, Shanghai Jiao Tong University",
};

// Public asset paths, served from <base>/img/ (Vite copies public/ verbatim).
// Renderers resolve them against the site base path.
export const IMAGES = {
  banner: "img/banner.webp",
  track3Labels: "img/track3-labels.webp",
  keylab: "img/keylab.webp",
  tongren: "img/tongren.webp",
  taskCtVolume: "img/tasks/ct-volume.webp",
  taskCtVolumeThumb: "img/tasks/ct-volume-thumb.webp",
  taskAirwayBinary: "img/tasks/airway-binary.webp",
  taskAirwayMulticlass: "img/tasks/airway-multiclass.webp",
  taskBronchOutput: "img/tasks/bronch-output.webp",
  taskBronchOutputThumb: "img/tasks/bronch-output-thumb.webp",
};

/** Ten evenly spaced frames of one Track 3 training sequence. */
const TRACK3_FRAME_IDS = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180];

const TRACK3_FRAMES: TrackFigureFrame[] = TRACK3_FRAME_IDS.map((id, index) => {
  const tag = String(id).padStart(3, "0");
  const role =
    index === 0 ? "start" : index === TRACK3_FRAME_IDS.length - 1 ? "final" : undefined;
  return {
    src: `img/tasks/track3/frame-${tag}.webp`,
    alt: `Bronchoscopy frame ${tag}${role ? `, the ${role} frame shown` : ""} of a training sequence.`,
    width: 400,
    height: 400,
    label: tag,
    role,
  };
});

/** Shared input panel: the same CT case illustrates Track 1 and Track 2. */
const CT_FIGURE_INPUT: TrackFigurePane = {
  label: "Input",
  kind: "CT volume",
  note: "Axial, coronal and sagittal views of a training case.",
  src: IMAGES.taskCtVolume,
  alt: "A CT volume shown as three intersecting axial, coronal and sagittal slices inside a wireframe cube.",
  width: 1434,
  height: 1566,
  thumbSrc: IMAGES.taskCtVolumeThumb,
  thumbWidth: 802,
  thumbHeight: 866,
};

export interface OrganizerInstitution {
  name: string;
  members: string;
  logo?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home" },
  { id: "tracks", label: "Tracks" },
  { id: "organizers", label: "Organizers" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "rules", label: "Submission" },
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
  huggingFace:
    "https://huggingface.co/Endoluminal-Surg-Vision-IMR/Airway-Tree-Modeling-26-baselines",
  github: "https://github.com/EndoluminalSurgicalVision-IMR/Airway-Tree-Modeling-26",
};

export const TRACKS: TrackInfo[] = [
  {
    slug: "track-1",
    title: "Track 1 · Binary Airway Segmentation",
    cardKicker: "Track 1 · CT",
    cardTitle: "Binary Airway Segmentation",
    cardShort: "Segment the airway tree from chest CT into one connected mask.",
    short: "Segment the airway tree from chest CT.",
    description:
      "Track 1 focuses on automatic binary segmentation of the airway tree from chest CT scans. Participants are expected to generate a connected airway mask covering the trachea, main bronchi, lobar bronchi, segmental bronchi, and distal branches. Unlike conventional segmentation tasks that primarily emphasize voxel-wise overlap, this track encourages methods that preserve airway completeness, connectivity, and distal branch structures. Topological correctness is a critical component of clinically useful airway modeling.",
    metrics: [
      { name: "DSC", higherIsBetter: true, note: "Dice similarity coefficient" },
      { name: "clDice", higherIsBetter: true, note: "Centerline Dice" },
      { name: "TLD", higherIsBetter: true, note: "Tree-length detection" },
      { name: "BD", higherIsBetter: true, note: "Branch detection" },
      {
        name: "Betti0Error",
        higherIsBetter: false,
        note: "Betti-0 error: the difference in the number of connected components against the reference; lower is better",
      },
    ],
    figure: {
      caption:
        "Input: axial, coronal and sagittal slices of a training CT case, composed into a volume. Output: the airway lumen as a single-class red surface.",
      input: CT_FIGURE_INPUT,
      output: {
        label: "Output",
        kind: "Binary airway surface",
        note: "One class: the airway lumen, rendered in red.",
        src: IMAGES.taskAirwayBinary,
        alt: "The airway tree as a red three-dimensional surface, from the trachea down to the distal bronchi.",
        width: 884,
        height: 1176,
      },
    },
  },
  {
    slug: "track-2",
    title: "Track 2 · Branch-wise Anatomical Labeling",
    cardKicker: "Track 2 · CT",
    cardTitle: "Branch-wise Anatomical Labeling",
    cardShort: "Assign one of 20 anatomical labels to every airway branch.",
    short: "Label airway branches into the 20 scored foreground classes (labels 1–20; 0 is background; class 20 is a real scored branch).",
    description:
      "Track 2 moves beyond binary segmentation toward structured airway understanding. Participants are required to assign anatomical labels to airway branches and generate an anatomically consistent airway representation. Target labels include the segmental airway branches. This task is designed to support automated route planning, lesion-to-airway association, and standardized anatomical reporting for endobronchial intervention.",
    metrics: [
      { name: "ACC", higherIsBetter: true, note: "Branch classification accuracy" },
      { name: "F1", higherIsBetter: true, note: "Branch F1 score" },
      { name: "SC", higherIsBetter: true, note: "Subtree consistency" },
      { name: "TD", higherIsBetter: false, note: "Topological distance; lower is better" },
      { name: "TAcc", higherIsBetter: true, note: "Tree accuracy" },
      { name: "mDice", higherIsBetter: true, note: "Mean Dice (multi-class)" },
      { name: "mclDice", higherIsBetter: true, note: "Mean clDice (multi-class)" },
    ],
    figure: {
      caption:
        "The same CT input, with the airway tree labelled into 20 anatomical classes. Cool colours mark left-lung branches, warm colours right-lung branches, and the trachea and main bronchi are neutral.",
      input: CT_FIGURE_INPUT,
      output: {
        label: "Output",
        kind: "20-class airway surface",
        note: "Each segmental branch is rendered in its own class colour.",
        src: IMAGES.taskAirwayMulticlass,
        alt: "The airway tree as a multicoloured three-dimensional surface: cool colours for left-lung branches, warm colours for right-lung branches, and a grey trachea and main bronchi.",
        width: 902,
        height: 1188,
      },
      legend: [
        { label: "Left lung", className: "legend-left" },
        { label: "Right lung", className: "legend-right" },
        { label: "Trachea & main bronchi", className: "legend-trachea" },
      ],
    },
  },
  {
    slug: "track-3",
    title: "Track 3 · Landmark Recognition for Endobronchial Intervention",
    cardKicker: "Track 3 · Bronchoscopy",
    cardTitle: "Landmark Recognition",
    cardShort: "Recognise the airway landmark visible in each bronchoscopy frame.",
    short:
      "Classify each bronchoscopy frame into the airway landmark it shows.",
    description:
      "Track 3 moves from CT volumes to the endobronchial view. Each case is a set of rendered bronchoscopy sequences along the airway tree; every frame carries the anatomical landmark visible at that moment. Participants submit one inference container that reads PNG sequences and writes a per-frame label CSV, and are ranked by frame Macro-F1, frame accuracy, segmental edit score and segmental F1@50. The Track 3 training data is being uploaded; a download link will be published when it is ready.",
    metrics: [
      { name: "frame_macro_f1", higherIsBetter: true, note: "Mean F1 over the fixed 32 landmark classes" },
      { name: "frame_accuracy", higherIsBetter: true, note: "Correct frames over all frames" },
      { name: "sequence_edit", higherIsBetter: true, note: "Segmental edit score: label order and extra/missing segments" },
      { name: "segment_f1_50", higherIsBetter: true, note: "Segmental F1 at temporal IoU 0.5" },
    ],
    figure: {
      caption:
        "Input: ten bronchoscopy frames. Output: the 32-class airway model with its planned path.",
      input: {
        label: "Input",
        kind: "Bronchoscopy frames",
        note: "Frames run top to bottom.",
      },
      output: {
        label: "Output",
        kind: "32-class model + path",
        note: "Translucent classes; the rest of the tree faded.",
        src: IMAGES.taskBronchOutput,
        alt: "A translucent multicoloured airway tree with a glowing navigation path from the top of the trachea to the RB10 segment; five bronchoscopy frames lie on horizontal planes along the path.",
        width: 1042,
        height: 1222,
        thumbSrc: IMAGES.taskBronchOutputThumb,
        thumbWidth: 720,
        thumbHeight: 761,
      },
      frames: TRACK3_FRAMES,
      legend: [
        { label: "100 · trachea", className: "legend-100" },
        { label: "102 · right main", className: "legend-102" },
        { label: "112 · bronchus intermedius", className: "legend-112" },
        { label: "111 · right lower", className: "legend-111" },
        { label: "115 · right basal trunk", className: "legend-115" },
        { label: "17 · RB10", className: "legend-17" },
        { label: "Navigation path", className: "legend-path" },
      ],
    },
  },
];

/** Track 3 label schema: 13 proximal airway classes + 19 segmental classes. */
export interface Track3Label {
  id: number;
  name: string;
  meaning: string;
}

export const TRACK3_LABEL_INTRO =
  "Track 3 predicts one of 32 anatomical landmarks per frame: 13 proximal airway classes and 19 segmental classes. L/R refer to the patient's left and right side, and the ID is the value written in the prediction CSV.";

export const TRACK3_PROXIMAL_LABELS: Track3Label[] = [
  { id: 100, name: "trachea", meaning: "Trachea" },
  { id: 101, name: "Left main", meaning: "Left main bronchus" },
  { id: 102, name: "Right main", meaning: "Right main bronchus" },
  { id: 107, name: "Left Upper", meaning: "Left upper lobar bronchus" },
  { id: 108, name: "Left Lower", meaning: "Left lower lobar bronchus" },
  { id: 109, name: "Right Upper", meaning: "Right upper lobar bronchus" },
  { id: 110, name: "Right Middle", meaning: "Right middle lobar bronchus" },
  { id: 111, name: "Right Lower", meaning: "Right lower lobar bronchus" },
  { id: 112, name: "Bronchus intermedius", meaning: "Right intermediate bronchus" },
  { id: 113, name: "Left upper division", meaning: "Left upper division bronchus" },
  { id: 114, name: "Lingular", meaning: "Lingular bronchus" },
  { id: 115, name: "Right basal trunk", meaning: "Right basal trunk" },
  { id: 116, name: "Left basal trunk", meaning: "Left basal trunk" },
];

export const TRACK3_SEGMENTAL_LABELS: Track3Label[] = [
  { id: 0, name: "LB1+2", meaning: "Left apicoposterior segment" },
  { id: 1, name: "LB3", meaning: "Left anterior segment" },
  { id: 2, name: "LB4", meaning: "Left superior lingular segment" },
  { id: 3, name: "LB5", meaning: "Left inferior lingular segment" },
  { id: 4, name: "LB6", meaning: "Left superior segment (lower lobe)" },
  { id: 5, name: "LB8", meaning: "Left anterior basal segment" },
  { id: 6, name: "LB9", meaning: "Left lateral basal segment" },
  { id: 7, name: "LB10", meaning: "Left posterior basal segment" },
  { id: 8, name: "RB1", meaning: "Right apical segment" },
  { id: 9, name: "RB2", meaning: "Right posterior segment" },
  { id: 10, name: "RB3", meaning: "Right anterior segment" },
  { id: 11, name: "RB4", meaning: "Right lateral segment (middle lobe)" },
  { id: 12, name: "RB5", meaning: "Right medial segment (middle lobe)" },
  { id: 13, name: "RB6", meaning: "Right superior segment (lower lobe)" },
  { id: 14, name: "RB7", meaning: "Right medial basal segment" },
  { id: 15, name: "RB8", meaning: "Right anterior basal segment" },
  { id: 16, name: "RB9", meaning: "Right lateral basal segment" },
  { id: 17, name: "RB10", meaning: "Right posterior basal segment" },
  { id: 19, name: "LB7", meaning: "Left medial basal segment" },
];

export const TRACK3_LABEL_NOTES: string[] = [
  "A segment label is the union of all annotated branches belonging to that segment, not a single centerline.",
  "ID 0 (LB1+2) is a valid class, not background; ID 18 is unused.",
  "Anatomical variation may leave a class absent in an individual case, but never introduces a new class; daughter branches within a segment keep its label.",
];

export const RANKING_POLICY_DESCRIPTION =
  "Each metric is ranked independently; ties receive the average of the ranks they occupy. A submission's final score is the mean of its metric ranks, and the lowest mean rank is placed first.";

export interface PhaseUpdateLogEntry {
  date: string;
  note: string;
}

// Shown under the leaderboard of the phase it is keyed by (phase id). Newest
// entry first; entries shared by several phases are defined once.
const LOG_ARCHIVE_SPLIT: PhaseUpdateLogEntry = {
  date: "2026-10-08",
  note: "The MICCAI 26 rankings are frozen on this leaderboard, and the Longterm Test Leaderboard continues to grow: methods evaluated during the challenge are tagged “MICCAI 26 challenge submission”, anything submitted afterwards “Post-MICCAI 26 challenge submission”.",
};

const LOG_TRACK3: PhaseUpdateLogEntry = {
  date: "2026-11-15",
  note: "The Track 3 leaderboard is published: a single Track 3 board per phase, ranked by frame Macro-F1, frame accuracy, segmental edit and segmental F1@50.",
};

const LOG_LONGTERM_VALIDATION: PhaseUpdateLogEntry = {
  date: "2026-11-18",
  note: "The Longterm Validation board opens: the MICCAI 26 validation archive stays frozen, and validation results scored afterwards are ranked alongside it and tagged \u201cPost-MICCAI 26 challenge submission\u201d.",
};

const LOG_LONGTERM_TEST: PhaseUpdateLogEntry = {
  date: "2026-11-13",
  note: "The Longterm Test board now continues the Final Test ranking (it continued the Validation one before): deeptree's new Final Test result is ranked together with the frozen MICCAI 26 Final Test results and leads Track 2.",
};

const LOG_BETTI: PhaseUpdateLogEntry = {
  date: "2026-10-01",
  note: "We are adding Betti-0 error back to validation phase ranking metric to enable more comprehensive evaluation! Newer metric design are on the way.",
};

export const PHASE_UPDATE_LOGS: Record<string, PhaseUpdateLogEntry[]> = {
  "miccai26-final-test": [LOG_ARCHIVE_SPLIT],
  "longterm-test": [LOG_LONGTERM_TEST, LOG_ARCHIVE_SPLIT, LOG_BETTI],
  "longterm-validation": [LOG_LONGTERM_VALIDATION, LOG_ARCHIVE_SPLIT, LOG_BETTI],
  "track3-test": [LOG_TRACK3],
  "track3-validation": [LOG_TRACK3],
};

// One-line framing above the board of a phase (the frozen cutoff notice is
// rendered separately from the data itself).
export const PHASE_NOTICES: Record<string, string> = {
  "miccai26-final-test":
    "Final ranking of the MICCAI 26 challenge: the Final Test Phase results, including the organizer-seeded models of teams that did not submit their own container.",
  "track3-test":
    "Track 3 test-phase ranking: frame-level landmark classification on the held-out test sequences, ranked by equal mean rank over the four Track 3 metrics.",
  "track3-validation":
    "Track 3 validation-phase ranking: the same metrics on the validation sequences.",
  "longterm-validation":
    "Continuously maintained Validation leaderboard — the frozen MICCAI 26 validation ranking is the baseline, and results scored after the challenge closed are ranked alongside it. Rows tagged \u201cMICCAI 26 challenge submission\u201d are archived results; later rows are tagged \u201cPost-MICCAI 26 challenge submission\u201d.",
  "longterm-test":
    "Continuously maintained Final Test leaderboard — the frozen MICCAI 26 Final Test results are ranked together with results scored after the challenge closed. Rows tagged “MICCAI 26 challenge submission” were evaluated during the challenge; later rows are tagged “Post-MICCAI 26 challenge submission”.",
};

// Human-readable text of the row tags (the data carries the short keys).
export const SUBMISSION_TAG_LABELS: Record<string, string> = {
  miccai26: "MICCAI 26 challenge submission",
  "post-miccai26": "Post-MICCAI 26 challenge submission",
};

// Introduction paragraphs (mirrors the official challenge description).
export const INTRODUCTION: string[] = [
  "ATM26 is part of the SENSAR (Sino-European Surgical Autonomy in Robotics) Network challenges. The SENSAR Network is focused on innovative, reproducible solutions for surgical autonomy and robot assisted interventions. ATM26 is organized in conjunction with MICCAI 2026, which was held in Strasbourg, September 27 - October 1, 2026.",
  "Accurate airway tree modeling is clinically important for respiratory disease assessment and endobronchial intervention. Patient-specific airway models can support pre-operative planning, bronchoscopic navigation, and peripheral pulmonary nodule biopsy by helping identify optimal branch-level access routes and reduce procedural uncertainty and operation risks. A complete and topologically reliable airway tree provides the geometric foundation for intervention planning, while anatomical branch labels connect imaging findings with standardized airway nomenclature and clinically interpretable procedure plans.",
  "Building on ATM22 (Airway Tree Modeling): Multi-site, Multi-domain Airway Tree Modeling, which focused on binary airway segmentation, ATM26 extends airway tree modeling from binary segmentation to structured airway understanding, supporting clinically meaningful airway segmentation, branch-wise anatomical labeling, and frame-level landmark recognition from the endobronchial view.",
];

// Header paragraph for the Tracks section.
export const TRACKS_INTRO =
  "ATM26 is designed to promote robust, topology-aware, and clinically applicable airway modeling under realistic CT acquisition conditions, including variations in image spacing, image quality, and airway anatomy. The challenge includes three tracks — CT airway segmentation, CT branch-wise anatomical labeling, and bronchoscopy frame-level landmark recognition — which participants may enter individually or together.";

// Prominent Track-3 status banner on the home page, directly below the hero
// CTA row and above the News list. It replaces the former submission-status
// notice: Track 3 is live (leaderboard, label guide, baseline); its training
// data is still being uploaded. `title` is rendered bold and italic in title
// case; the emphasised fragment is rendered bold, larger, and in an amber
// accent colour.
export const TRACK3_NOTICE = {
  kicker: "TRACK-3 STATUS",
  title: "Track 3: Landmark Recognition for Endobronchial Intervention",
  emphasis: "LEADERBOARD LIVE",
  after: "!",
};

// Challenge news. Newest first; entries superseded by a later announcement are
// retired from this list (sanity check announcement omitted — sanity check is
// not part of the published phases).
export const NEWS: NewsItem[] = [
  {
    date: "2026-11-16",
    title: "Track 3 label guide, container contract and baseline released",
    detail:
      "The 32-class label guide is on the Tracks page, the container contract on the Rules page, and the official Track 1, Track 2 and Track 3 baseline checkpoints are on Hugging Face. The Track 3 training data is being uploaded; a download link will be published when it is ready.",
  },
  {
    date: "2026-11-15",
    title: "Track 3 leaderboard opened",
    detail:
      "The Track 3 (Landmark Recognition for Endobronchial Intervention) leaderboard is now public, with a validation and a test board ranked by frame Macro-F1, frame accuracy, segmental edit score and segmental F1@50.",
  },
  {
    date: "2026-11-13",
    title: "Longterm Test leaderboard opened — deeptree takes the Track 2 lead",
    detail:
      "The Longterm Test board continues the Final Test ranking: the frozen MICCAI 26 Final Test results are ranked together with results scored after the challenge closed. The first post-challenge result, deeptree's new Final Test submission, leads Track 2 and is tagged “Post-MICCAI 26 challenge submission”; the frozen challenge rows keep the tag “MICCAI 26 challenge submission”.",
  },
  {
    date: "2026-10-08",
    title: "MICCAI 26 results frozen and archived",
    detail:
      "The MICCAI 26 Final Test and Validation rankings are now archived as the MICCAI 26 Leaderboard. The challenge rankings stay frozen as they stood when the challenge closed.",
  },
  {
    date: "2026-10-01",
    title: "Track-1 & Track-2 submission re-opened!",
    detail:
      "Both Validation Phase submissions and Final Test Phase submissions are now limited to once every 24 hours. The Final Test ranking is published on the Longterm Test board, which is updated manually by the organizers.",
  },
  {
    date: "2026-08-20",
    title: "Final test phase submission for Track 1 and Track 2 open!",
    detail:
      "See the official submission portal and the Submission Guidelines for detailed instructions. Contact the organizers if any problems occur.",
  },
];

export interface WorkshopAgendaItem {
  /** Local time at the venue (CEST, UTC+2). */
  time: string;
  session: string;
  speaker: string;
  kind: "opening" | "team" | "invited" | "award";
}

export interface WorkshopPhoto {
  src: string;
  alt: string;
  caption: string;
  /** Intrinsic pixel size: reserves layout space before the image loads. */
  width: number;
  height: number;
}

// Workshop day (MICCAI 2026 satellite event, Thursday 1 October 2026).
// Agenda, room/host details and the photos mirror the official page
// https://atm26.grand-challenge.org/final-test-results-for-miccai-2026-workshop/
export const WORKSHOP = {
  kicker: "MICCAI 2026 WORKSHOP",
  title: "ATM26 Workshop Day",
  when: "Thursday, 1 October 2026, 10:30–12:30 CEST (UTC+2)",
  where: "Room Amsterdam (G), MICCAI 2026, Strasbourg",
  hosts: "Shangkun Li, Junyang Wu, Yaoyu Liu",
  intro:
    "The workshop closed the MICCAI 2026 challenge: the Final Test Phase rankings were announced, the top three teams of each track presented their methods, and two invited talks covered topology-guided tubular-structure modelling and agentic development for biomedical image analysis.",
  agendaNote: "All times are local time at the venue (CEST, UTC+2).",
  agenda: [
    { time: "10:30–10:40", session: "Opening talk & ATM26 challenge summary", speaker: "Yaoyu Liu", kind: "opening" },
    { time: "10:40–10:50", session: "Presentation + Q&A", speaker: "Alexander Berger", kind: "team" },
    { time: "10:50–11:00", session: "Presentation + Q&A", speaker: "Qibiao Wu", kind: "team" },
    { time: "11:00–11:10", session: "Presentation + Q&A", speaker: "Ruochong Lin", kind: "team" },
    { time: "11:10–11:20", session: "Presentation + Q&A", speaker: "Junqiang Chen", kind: "team" },
    { time: "11:20–11:30", session: "Presentation + Q&A", speaker: "Qingyao Tian", kind: "team" },
    { time: "11:30–11:40", session: "Presentation + Q&A", speaker: "Ruochong Lin", kind: "team" },
    {
      time: "11:40–11:50",
      session: "On the Topological Sculpting for Vessel-like Structure Segmentation",
      speaker: "Minghui Zhang",
      kind: "invited",
    },
    {
      time: "11:50–12:00",
      session: "Towards Agentic Development for Biomedical Image Analysis",
      speaker: "Ziyan Huang",
      kind: "invited",
    },
    {
      time: "12:00–12:10",
      session: "Beyond Voxel-wise Airway Segmentation and Classification & Track 3 Warm-up",
      speaker: "Junyang Wu",
      kind: "team",
    },
    { time: "12:10–12:20", session: "Award Ceremony & Conclusion", speaker: "Prof. Yun Gu", kind: "award" },
  ] as WorkshopAgendaItem[],
  agendaSlide: {
    src: "img/workshop/agenda.webp",
    alt: "Official ATM26 workshop agenda slide: schedule, room and Zoom details",
  },
  photosTitle: "Photos from the workshop",
  photosNote: "The strip scrolls automatically and loops seamlessly; hover to pause.",
  photos: [
    {
      src: "img/workshop/photo-01.webp",
      alt: "Audience seated in the workshop room during a presentation",
      caption: "The workshop room during the opening session.",
      width: 800,
      height: 600,
    },
    {
      src: "img/workshop/photo-02.webp",
      alt: "Group of workshop participants posing for a photo in the meeting room",
      caption: "Participants after the sessions.",
      width: 800,
      height: 600,
    },
    {
      src: "img/workshop/photo-03.webp",
      alt: "Members of the audience listening to a talk",
      caption: "The audience during a team presentation.",
      width: 800,
      height: 600,
    },
    {
      src: "img/workshop/photo-04.webp",
      alt: "Speaker at the podium presenting the ATM26 challenge overview slide",
      caption: "Opening talk: the ATM26 challenge summary.",
      width: 800,
      height: 600,
    },
    {
      src: "img/workshop/photo-05.webp",
      alt: "Speaker presenting a slide on exploration and final training to the audience",
      caption: "A participating team presenting its training strategy.",
      width: 800,
      height: 600,
    },
    {
      src: "img/workshop/photo-06.webp",
      alt: "Invited speaker presenting a slide on topological priors for 3D tubular structure modelling",
      caption: "Invited talk on topology-guided 3D tubular-structure modelling.",
      width: 800,
      height: 600,
    },
    {
      src: "img/workshop/photo-07.webp",
      alt: "Two workshop hosts and a guest posing on stage in front of the ATM26 title slide",
      caption: "The two hosts with a guest.",
      width: 800,
      height: 600,
    },
  ] as WorkshopPhoto[],
  resultsUrl:
    "https://atm26.grand-challenge.org/final-test-results-for-miccai-2026-workshop/",
  resultsLinkLabel: "Final Test results and workshop agenda on Grand Challenge",
};

// Shown above the leaderboard. The challenge is over: its results are archived
// and a longterm board keeps running.
export const LEADERBOARD_NOTICE =
  "The MICCAI 26 Final Test board is a frozen archive. The Longterm Test board is live and is updated as post-challenge Final Test results arrive, and the Longterm Validation board is live the same way for Track-1 and Track-2 validation results. The Track 3 validation board is live; the Track 3 test board opens with the Track 3 Final Test phase.";

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
  {
    date: "2026-10-01",
    title: "Post-MICCAI long-term submissions re-opened",
    detail: "Final Test and Validation submissions re-opened on the organizers' platform, limited to one submission every 24 hours.",
  },
  {
    date: "2026-11-13",
    title: "Longterm Test leaderboard opened",
    detail: "The Longterm Test board continues the Final Test ranking and is updated as post-challenge Final Test results arrive.",
  },
  {
    date: "2026-11-15",
    title: "Track 3 leaderboard opened",
    detail: "The Track 3 validation and test leaderboards are public.",
  },
  {
    date: "2026-11-16",
    title: "Track 3 label guide, container contract and baseline released",
    detail: "The 32-class label guide, the container contract and the Track 3 baseline checkpoint are available. The Track 3 training data is being uploaded.",
  },
];

export const ORGANIZERS: OrganizerInstitution[] = [
  {
    name: "Shanghai Key Laboratory of Flexible Medical Robotics, Tongren Hospital, Shanghai Jiao Tong University",
    members: "Guang-Zhong Yang, Hanxiao Zhang",
    logo: "img/keylab.webp",
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
  {
    authors: "Luo, M., Wu, J., Zhang, M., Liu, Y., Chen, Y., Zhang, H., Li, Q. and Gu, Y., 2026.",
    title: "Topology-constrained vision-language sequence modeling for bronchoscopic localization.",
    venue:
      "MICCAI 2026 EndoLINA Workshop (International Workshop on Endoluminal Intervention, Navigation and Autonomy), MICCAI 2026 Workshops and Challenges, LNCS 17275.",
    link: "https://papers.miccai.org/miccai-2026-sat/paper/EndoLINA_005.pdf",
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
      "Registration and the data usage agreement are handled on the official Grand Challenge site. Your container is then submitted through the phase-specific submission portal on the Rules page (Final Test or Validation form) and evaluated on the organizers' own machines.",
  },
  {
    question: "Which metrics are used for ranking?",
    answer:
      "Track 1 uses DSC, clDice, TLD, BD and β₀ error. Track 2 uses ACC, F1, SC, TD, TAcc, mDice and mclDice. Track 3 uses frame Macro-F1 over the fixed 32-class schema, frame accuracy, segmental edit score and segmental F1@50. See the Tracks page for details.",
  },
  {
    question: "Is the leaderboard final?",
    answer:
      "The MICCAI 26 Final Test board is a frozen archive. The Longterm Test board is live and is updated manually by the organizers as post-challenge Final Test results arrive, and the Longterm Validation board is live the same way for Track-1 and Track-2 validation results. The Track 3 validation board is live; the Track 3 test board opens with the Track 3 Final Test phase.",
  },
];

export const CONTACT = {
  email: LINKS.contactEmail,
  note: "For challenge-related questions, contact the organizers by email.",
};

export interface PitfallItem {
  title: string;
  note: string;
}

// Submission pitfalls shown in the "Common pitfalls" block of the Rules page.
export const COMMON_PITFALLS: PitfallItem[] = [
  {
    title: "Tag your image before saving",
    note: "Always build with 'docker build -t name:tag .' and save with 'docker save name:tag'; an untagged archive is rejected during intake ('archive has no tagged Docker/OCI image').",
  },
  {
    title: "Upload a complete, readable, ASCII-named archive",
    note: "Check the file size after upload, test it with 'tar tzf', and keep the file name ASCII-only with no spaces — truncated uploads and accented or illegal characters in the name are rejected.",
  },
  {
    title: "Run the container as a non-root user",
    note: "Add a 'USER user' directive to your Dockerfile; images configured to run as root are rejected before execution.",
  },
  {
    title: "Build on the CUDA 11.8 base",
    note: "The evaluation GPU driver supports CUDA up to 12.0 — use the 'atm26-nnunetv2:2.6.4-cuda11.8' base (or the provided cu118 recipe); cuda12.4-based images fail at the first GPU call.",
  },
  {
    title: "Declare the batch mode labels",
    note: "Include both 'LABEL org.atm26.batch=\"1\"' and 'LABEL org.grand-challenge.api-method=\"exec\"'; without them your container runs once per case (model reloaded each time) instead of once over the whole test set.",
  },
  {
    title: "Discover inputs by globbing, assume no case count",
    note: "Read all cases by globbing '/input/images/lung-ct/*.mha' and loop; do not assume a single case or rely on the inputs.json shape — real submissions crashed on the batch set with exactly that per-case assumption.",
  },
  {
    title: "Write one .mha per case, embedded and uint8",
    note: "Output exactly '<case-id>.mha' per case under '/output/images/<output-slug>/' (no output.mha in batch mode, no .nii.gz), uint8, compressed MHA with the pixel data embedded (ElementDataFile = LOCAL); missing, duplicate, unmatched or externally-referenced outputs are rejected.",
  },
  {
    title: "Keep memory flat across the whole test set",
    note: "Load the model once, use torch.inference_mode() and release large tensors per case (del, torch.cuda.empty_cache(), gc.collect()), and keep accumulators in uint8 on CPU — a 150-case run was killed with full-volume float maps on the GPU.",
  },
  {
    title: "Stay under the 40 GB output limit",
    note: "Write uint8 and compressed MHA; uncompressed float volumes across the full test set exceed the platform output cap and fail the run.",
  },
  {
    title: "Do not write to the home directory",
    note: "Point cache and config directories to writable paths (e.g., 'ENV MPLCONFIGDIR=/tmp/mplconfig'); a read-only $HOME broke a real run at the first per-case plot call.",
  },
  {
    title: "Build a fully self-contained image",
    note: "Bake all weights and dependencies into the image (containers run with --network none), and do not over-prune the provided base — removing training-side packages breaks nnUNetPredictor initialization.",
  },
];

export interface PortalBackupForm {
  label: string;
  url: string;
}

/** Which track a portal belongs to; drives the card glyph. */
export type TrackKey = "t1" | "t2" | "t3";

export interface SubmissionPortal {
  /** Track and phase, e.g. "Track-1 · Validation". */
  title: string;
  /** Track of this card, selecting its glyph. */
  track: TrackKey;
  /** One-line state of this intake, rendered as a badge under the card title. */
  status: string;
  /** Submission form; absent while the phase is still closed. */
  formUrl?: string;
  facts: string[];
  /** Optional secondary upload route, shown under the primary form link. */
  backupForm?: PortalBackupForm;
}

const FINAL_TEST_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfPv_OVm_PkOmF4YgsNW-zren6tDdrUzzZCV_J3oMSDMks13A/viewform?usp=sharing&ouid=117378226219491671209";
const VALIDATION_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSdwPtoBXp3iyy-s0S2lp629Vpq75OogvS8Xcr-B_bciSQGIPg/viewform?usp=sharing&ouid=117378226219491671209";

// Submission portals and tips (Rules page) — the form URLs are the two official
// public links and must stay byte-identical (tests/portals.test.ts). Cards are
// laid out as two rows of three: validation for the three tracks first, then
// the test intake (long-term for Track-1/2, not yet open for Track-3).
// Inline link placeholders ({leaderboard}, {guidelines}, {batch contract
// section}) are expanded by the Rules renderer; everything else is plain text.
export const SUBMISSION_PORTALS: SubmissionPortal[] = [
  {
    title: "Track-1 · Validation",
    track: "t1",
    status: "Open",
    formUrl: VALIDATION_FORM_URL,
    facts: [
      "CT airway segmentation on the full validation set.",
      "Results are returned by email and ranked on the Longterm Validation board.",
      "You only need your registration email address and team name — no PDF report.",
    ],
  },
  {
    title: "Track-2 · Validation",
    track: "t2",
    status: "Open",
    formUrl: VALIDATION_FORM_URL,
    facts: [
      "Branch-wise anatomical labeling on the full validation set.",
      "Results are returned by email and ranked on the Longterm Validation board.",
      "You only need your registration email address and team name — no PDF report.",
    ],
  },
  {
    title: "Track-3 · Validation",
    track: "t3",
    status: "Open",
    formUrl: VALIDATION_FORM_URL,
    facts: [
      "Frame-level landmark recognition: PNG sequences in, per-frame label CSV out, 32-class schema.",
      "Results appear on the Track 3 validation board.",
      "You only need your registration email address and team name — no PDF report.",
    ],
  },
  {
    title: "Track-1 · Longterm Test",
    track: "t1",
    status: "Open again — long-term",
    formUrl: FINAL_TEST_FORM_URL,
    facts: [
      "Post-MICCAI long-term Final Test intake; each result joins the {leaderboard}.",
      "Attach a brief PDF methodological report with the archive.",
    ],
    backupForm: {
      label: "Google Drive Upload Backup Form",
      url: "https://docs.google.com/forms/d/e/1FAIpQLSdc7J-rJMTg45IvSqnJRpd1byCbNVF0q_2dtaa0Cn6g15t9ng/viewform?usp=dialog",
    },
  },
  {
    title: "Track-2 · Longterm Test",
    track: "t2",
    status: "Open again — long-term",
    formUrl: FINAL_TEST_FORM_URL,
    facts: [
      "Post-MICCAI long-term Final Test intake; each result joins the {leaderboard}.",
      "Attach a brief PDF methodological report with the archive.",
    ],
    backupForm: {
      label: "Google Drive Upload Backup Form",
      url: "https://docs.google.com/forms/d/e/1FAIpQLSdc7J-rJMTg45IvSqnJRpd1byCbNVF0q_2dtaa0Cn6g15t9ng/viewform?usp=dialog",
    },
  },
  {
    title: "Track-3 · Test",
    track: "t3",
    status: "Opens later",
    facts: [
      "The Track-3 Test Phase is not open yet; no submissions are accepted.",
      "It will use the same form as Track-1 and Track-2 when it opens, and results will appear on the Track 3 test board.",
    ],
  },
];

export interface SubmissionTip {
  title: string;
  note: string;
}

export const SUBMISSION_TIPS: SubmissionTip[] = [
  {
    title: "Re-pack your algorithm for batch execution",
    note: "Follow the example algorithm docker in the official {guidelines} — your container will receive the whole test set in one run (the whole validation set for the validation phase), rather than one case per run; details in the {batch contract section}.",
  },
  {
    title: "Test locally before submission",
    note: "It is recommended that your candidate Docker container is tested locally first.",
  },
  {
    title: "[Final Test Phase Only] Attach a brief PDF methodological report",
    note: "Final Test phase only: attach a brief PDF methodological report together with the Docker container and carefully fill out the form table. For the Validation phase, only your registration email address and team name are needed (no PDF report).",
  },
  {
    title: "Submission frequency limit",
    note: "Both the Final Test Phase (post-MICCAI long-term) and the Validation Phase allow one submission every 24 hours (limited computation resources), for Track-1, Track-2 and Track-3. The limit counts evaluated submissions only — a run that fails does not use up your slot.",
  },
  {
    title: "A failed run does not use up your submission limit",
    note: "If your container is rejected at intake or fails during evaluation, it does not count against the frequency limit: our platform removes that submission's records, so your next slot is free right away. Fix the problem and submit again immediately — do not wait for the daily window to pass. If the form still reports that you are rate-limited, contact the organizers.",
  },
  {
    title: "Evaluation takes hours and results arrive by email",
    note: "Our system may take hours to finish evaluating your submission, then sends you an email. For the Final Test Phase the email only confirms whether your submission succeeded; the scores themselves appear on the Longterm Test leaderboard, which is updated manually by the organizers. For Track-1 and Track-2 Validation the email includes the evaluated metrics and the result is ranked on the Longterm Validation board; Track-3 validation results appear on the Track 3 validation board.",
  },
  {
    title: "Deadlines and release",
    note: "Post-MICCAI long-term Final Test submissions and Validation Phase submissions are open. Track-1 and Track-2 Final Test scores appear on the {leaderboard}; Track-1 and Track-2 Validation scores are returned by email and appear on the Longterm Validation board. Track-3 validation scores appear on the Track 3 validation board.",
  },
];
