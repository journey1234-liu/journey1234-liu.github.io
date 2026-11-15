// Human-facing labels of the leaderboard metrics.
//
// The keys are the canonical metric names carried by the published data (they
// are also the sort keys and the column identifiers) and must never change; the
// values are trusted HTML fragments rendered in place of the raw name.
//
// `Betti0Error` is shown as β₀ error, the symbol used by the challenge's own
// evaluation notes (`EVALUATION.md`: "Betti-Error measures the difference of
// betti-0 value ... between the prediction and ground truth").

const METRIC_LABELS: Record<string, string> = {
  Betti0Error: "&beta;<sub>0</sub> error",
  // Track 3 (frame landmark recognition)
  frame_macro_f1: "Macro-F1",
  frame_accuracy: "Accuracy",
  sequence_edit: "Edit",
  segment_f1_50: "F1&#64;50",
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Display label of a metric: its Betti-style symbol, else the escaped name. */
export function metricLabel(name: string): string {
  return METRIC_LABELS[name] ?? escapeHtml(name);
}
