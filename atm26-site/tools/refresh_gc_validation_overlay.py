#!/usr/bin/env python3
"""Refresh the frozen GC validation overlay: team names, and Track-1 Betti0Error.

What it does
------------
1. **Team names.** The overlay mirrors the official Grand Challenge validation
   leaderboards, and GC lets a participant rename their team. The leaderboard is
   re-read and every overlay row is relabelled to GC's current ``user (Team)``.

2. **Track-1 ``Betti0Error``.** GC's Track-1 leaderboard ranks six metrics
   (``DSC, clDice, TLD, BD, Precision, Recall``) and never displays
   ``Betti0Error``, but the challenge's own ranking spec (``EVALUATION.md``)
   lists five Track-1 metrics *including Betti Error* — and the in-house
   platform (and the Final Test board) rank on those five. GC does compute it:
   each public evaluation page embeds the full ``metrics.json`` (as a
   ``data:text/plain`` URI) whose ``aggregates`` block carries it, so it is read
   from there after asserting the leaderboard's six columns match that file.

Rows are matched by **GC account name**, never by team label, so renames do not
lose rows. Rank fields inside the overlay are recomputed for the file's own
consistency; the publisher (``atm26-remote-ops/publish_leaderboard.py``)
re-ranks the merged board anyway.

Usage::

    python3 refresh_gc_validation_overlay.py --dry-run   # print, do not write
    python3 refresh_gc_validation_overlay.py             # rewrite the overlay
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

import requests

OVERLAY = Path(__file__).with_name("gc_validation_snapshot.json")
LEADERBOARD = "https://atm26.grand-challenge.org/evaluation/{slug}/leaderboard/"
EVALUATION = "https://atm26.grand-challenge.org/evaluation/{uuid}/"
UA = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0 Safari/537.36"
}

# Phase slugs keep their historical "-final-test-phase" names while their titles
# read "Track-N Validation phase" — both refer to the official validation phase.
TRACK_SLUGS = {
    "track-1": "track-1-final-test-phase",
    "track-2": "track-2-final-test-phase",
}

# Metric columns of the GC Track-1 leaderboard, in display order. Track-1 gains
# Betti0Error on top of the four overlap metrics; Track-2 keeps its own list.
GC_TRACK1_COLUMNS = ["DSC", "clDice", "TLD", "BD", "Precision", "Recall"]
TRACK1_OVERLAP = ["DSC", "clDice", "TLD", "BD"]
BETTI = ("Betti0Error", False)


def clean(cell: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", cell))).strip()


def average_ranks(values: list[float], *, higher_is_better: bool) -> list[float]:
    indexed = sorted(enumerate(values), key=lambda item: item[1], reverse=higher_is_better)
    ranks = [0.0] * len(values)
    start = 0
    while start < len(indexed):
        end = start + 1
        while end < len(indexed) and indexed[end][1] == indexed[start][1]:
            end += 1
        average = (start + 1 + end) / 2.0
        for position in range(start, end):
            ranks[indexed[position][0]] = average
        start = end
    return ranks


def fetch_leaderboard(slug: str) -> list[dict]:
    """Current leaderboard rows: display name, date, mean position, metrics, id."""
    url = LEADERBOARD.format(slug=slug)
    session = requests.Session()
    page = session.get(url, headers=UA, timeout=(30, 90))
    page.raise_for_status()
    token = re.search(r'name="csrfmiddlewaretoken" value="([^"]+)"', page.text)
    token = token.group(1) if token else ""
    headers = dict(UA)
    headers.update({"X-CSRFToken": token, "Referer": url, "X-Requested-With": "XMLHttpRequest"})
    payload = {
        "draw": "1", "start": "0", "length": "500", "search[value]": "",
        "order[0][column]": "0", "order[0][dir]": "asc",
        "csrfmiddlewaretoken": token,
    }
    response = session.post(url, data=payload, headers=headers, timeout=(30, 120))
    response.raise_for_status()

    rows = []
    for row in response.json().get("data", []):
        cells = [clean(cell) for cell in row]
        uuid = re.search(r"/evaluation/([0-9a-f-]{36})/", row[4] or "")
        if not uuid:
            raise RuntimeError(f"{slug}: no evaluation id in row: {cells[:5]}")
        # Drop the metric columns: they are positional and differ per track.
        rows.append(
            {
                "who": cells[1],
                "created": cells[3],
                "mean_position": cells[4],
                "numbers": [
                    float(match.group(1))
                    for cell in cells[5:]
                    if (match := re.match(r"([\d.]+)", cell))
                ],
                "uuid": uuid.group(1),
            }
        )
    return rows


def fetch_aggregates(uuid: str, session: requests.Session) -> dict[str, float]:
    page = session.get(EVALUATION.format(uuid=uuid), headers=UA, timeout=(30, 120))
    page.raise_for_status()
    text = page.text
    marker = text.find("%22aggregates%22")
    if marker == -1:
        raise RuntimeError(f"{uuid}: no metrics.json payload on the evaluation page")
    start = text.rfind('"', 0, marker) + 1
    blob = text[start : text.find('"', marker)]
    _, _, payload = blob.partition(",")  # strip the data:text/plain URI header
    return json.loads(urllib.parse.unquote(payload))["aggregates"]


def display_name(who: str) -> str:
    """Normalise ``user ( Team )`` to ``user (Team)``; ``user`` stays ``user``."""
    match = re.match(r"^(.*?)\s*\((.*)\)$", who)
    if match:
        user, team = match.group(1).strip(), match.group(2).strip()
        return f"{user} ({team})" if team else user
    return who


def gc_username(name: str) -> str:
    """GC account name: the leading token of ``user (Team)`` or the whole name."""
    return name.split(" (")[0].strip()


def sync_track(track_id: str, board: dict, session: requests.Session) -> None:
    slug = TRACK_SLUGS[track_id]
    rows = fetch_leaderboard(slug)
    by_user = {gc_username(display_name(row["who"])): row for row in rows}
    if len(by_user) != len(rows):
        raise RuntimeError(f"{track_id}: duplicate GC account on the leaderboard")

    print(f"\n=== {track_id} ({slug}): {len(rows)} leaderboard rows, "
          f"{len(board['entries'])} overlay entries")

    entries = {gc_username(entry["team_display_name"]): entry for entry in board["entries"]}
    unknown = sorted(set(by_user) - set(entries))
    missing = sorted(set(entries) - set(by_user))
    if unknown or missing:
        raise RuntimeError(
            f"{track_id}: overlay/leaderboard mismatch: only-overlay={missing} only-gc={unknown}"
        )

    metric_names = [metric["name"] for metric in board["metrics"]]
    with_betti = track_id == "track-1"

    for index, (user, row) in enumerate(sorted(by_user.items())):
        entry = entries[user]
        gc_name = display_name(row["who"])

        if with_betti:
            aggregates = fetch_aggregates(row["uuid"], session)
            for position, column in enumerate(GC_TRACK1_COLUMNS):
                shown, actual = row["numbers"][position], aggregates.get(column)
                if actual is None or abs(round(actual, 4) - shown) > 1e-9:
                    raise RuntimeError(
                        f"{gc_name}: {column} mismatch, leaderboard {shown} vs metrics {actual}"
                    )
            if "Betti0Error" not in aggregates:
                raise RuntimeError(f"{gc_name}: metrics.json has no aggregates.Betti0Error")
            entry["metrics"]["Betti0Error"] = float(aggregates["Betti0Error"])
            for column in TRACK1_OVERLAP:
                if abs(entry["metrics"][column] - row["numbers"][GC_TRACK1_COLUMNS.index(column)]) > 1e-9:
                    raise RuntimeError(f"{gc_name}: frozen {column} does not match the GC row")

        renamed = gc_name != entry["team_display_name"]
        entry["team_display_name"] = gc_name
        detail = f"Betti0Error={entry['metrics']['Betti0Error']}" if with_betti else ""
        print(
            f"  {gc_name:32s} {row['created']:15s} mean={row['mean_position']:6s} {detail}"
            + ("   (renamed)" if renamed else "")
        )
        if with_betti and index + 1 < len(by_user):
            time.sleep(1.0)

    if with_betti and BETTI[0] not in metric_names:
        board["metrics"] = [*board["metrics"], {"name": BETTI[0], "higher_is_better": BETTI[1]}]
        metric_names = [metric["name"] for metric in board["metrics"]]

    higher = {metric["name"]: metric["higher_is_better"] for metric in board["metrics"]}
    for name in metric_names:
        for entry, rank in zip(
            board["entries"],
            average_ranks(
                [entry["metrics"][name] for entry in board["entries"]],
                higher_is_better=higher[name],
            ),
        ):
            entry.setdefault("metric_ranks", {})[name] = rank
    for entry in board["entries"]:
        entry["mean_rank"] = round(
            sum(entry["metric_ranks"][name] for name in metric_names) / len(metric_names), 4
        )
    board["entries"].sort(key=lambda e: (e["mean_rank"], e["team_display_name"].casefold()))
    for entry, rank in zip(
        board["entries"],
        average_ranks([e["mean_rank"] for e in board["entries"]], higher_is_better=False),
    ):
        entry["rank"] = rank

    print(f"  re-ranked on {len(metric_names)} metrics ({', '.join(metric_names)})")
    for entry in board["entries"]:
        cells = " ".join(f"{name}={entry['metrics'][name]}" for name in metric_names)
        print(f"    {entry['rank']:>5} | {entry['team_display_name']:30s} | mean {entry['mean_rank']:6.3f} | {cells}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="print, do not write")
    args = parser.parse_args()

    overlay = json.loads(OVERLAY.read_text(encoding="utf-8"))
    validation = overlay["phases"]["validation"]
    session = requests.Session()
    for track_id in TRACK_SLUGS:
        sync_track(track_id, validation["tracks"][track_id], session)

    overlay["_source"] = (
        "Frozen mirror of the official Grand Challenge validation-phase leaderboards "
        f"(refreshed {datetime.now(timezone.utc):%Y-%m-%d}: team labels follow the "
        "current GC leaderboard, and each Track-1 row carries the Betti0Error of its "
        "evaluation metrics.json, which the leaderboard does not display). "
        "Merged by publish_leaderboard.py --mode real; do not edit by hand."
    )

    if args.dry_run:
        print("\n[dry-run] overlay not written")
        return 0
    OVERLAY.write_text(
        json.dumps(overlay, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"\nwrote {OVERLAY}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
