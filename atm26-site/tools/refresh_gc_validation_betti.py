#!/usr/bin/env python3
"""Add per-team ``Betti0Error`` to the frozen GC validation overlay.

Background
----------
The official Grand Challenge *Track-1 Validation phase* leaderboard ranks six
metrics — ``DSC, clDice, TLD, BD, Precision, Recall`` — and does **not** show
``Betti0Error``. The challenge's own ranking spec (``EVALUATION.md``) however
lists five Track-1 metrics **including Betti Error**, and the in-house
evaluation platform (and therefore the Final Test board) ranks on those five.

Grand Challenge does compute ``Betti0Error`` for every submission: each public
evaluation page embeds the full ``metrics.json`` (as a ``data:text/plain`` URI)
whose ``aggregates`` block carries it. This script re-reads the current
leaderboard, pulls that number for every row, and rewrites the overlay so the
website can rank Track-1 on the documented five metrics.

Usage::

    python3 refresh_gc_validation_betti.py --dry-run   # print, do not write
    python3 refresh_gc_validation_betti.py             # rewrite the overlay

The overlay is ``gc_validation_snapshot.json`` next to this script; the
publisher (``atm26-remote-ops/publish_leaderboard.py``) merges it into the
public snapshot and re-ranks the merged board, so the recomputed rank fields
here are for the file's own consistency.
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
LEADERBOARD = (
    "https://atm26.grand-challenge.org/evaluation/"
    "track-1-final-test-phase/leaderboard/"
)
EVALUATION = "https://atm26.grand-challenge.org/evaluation/{uuid}/"
UA = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0 Safari/537.36"
}

# Metric columns of the GC leaderboard, in display order, and the metrics the
# published board ranks on (EVALUATION.md Track-1).
GC_COLUMNS = ["DSC", "clDice", "TLD", "BD", "Precision", "Recall"]
RANKED = [
    ("DSC", True),
    ("clDice", True),
    ("TLD", True),
    ("BD", True),
    ("Betti0Error", False),
]


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


def fetch_leaderboard() -> list[dict]:
    session = requests.Session()
    page = session.get(LEADERBOARD, headers=UA, timeout=(30, 90))
    page.raise_for_status()
    token = re.search(r'name="csrfmiddlewaretoken" value="([^"]+)"', page.text)
    token = token.group(1) if token else ""
    headers = dict(UA)
    headers.update(
        {"X-CSRFToken": token, "Referer": LEADERBOARD, "X-Requested-With": "XMLHttpRequest"}
    )
    payload = {
        "draw": "1", "start": "0", "length": "500", "search[value]": "",
        "order[0][column]": "0", "order[0][dir]": "asc",
        "csrfmiddlewaretoken": token,
    }
    response = session.post(LEADERBOARD, data=payload, headers=headers, timeout=(30, 120))
    response.raise_for_status()
    rows = []
    for row in response.json().get("data", []):
        cells = [clean(cell) for cell in row]
        uuid = re.search(r"/evaluation/([0-9a-f-]{36})/", row[4] or "")
        if not uuid:
            raise RuntimeError(f"no evaluation id in row: {cells[:5]}")
        # "user ( Team )" / "user", plus the verified-email icon noise.
        who = re.sub(r"\s*\((.*)\)\s*$", r" (\1)", cells[1]).strip()
        rows.append(
            {
                "who": who,
                "created": cells[3],
                "mean_position": cells[4],
                "metrics": {
                    name: float(re.match(r"([\d.]+)", cells[5 + index]).group(1))
                    for index, name in enumerate(GC_COLUMNS)
                },
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
    match = re.match(r"^(.*?)\s*\((.*)\)$", who)
    if match:
        user, team = match.group(1).strip(), match.group(2).strip()
        return f"{user} ({team})" if team else user
    return who


def gc_username(name: str) -> str:
    """GC account name: the leading token of ``user (Team)`` or the whole name."""
    return name.split(" (")[0].strip()


def row_metric(rows: list[dict], user: str, column: str) -> float:
    """Leaderboard value of one metric column for a GC account."""
    for row in rows:
        if gc_username(row["who"]) == user:
            return row["metrics"][column]
    raise KeyError(f"{user} is not on the leaderboard")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="print, do not write")
    args = parser.parse_args()

    overlay = json.loads(OVERLAY.read_text(encoding="utf-8"))
    board = overlay["phases"]["validation"]["tracks"]["track-1"]
    entries = {entry["team_display_name"]: entry for entry in board["entries"]}

    session = requests.Session()
    rows = fetch_leaderboard()
    print(f"leaderboard rows: {len(rows)} | overlay entries: {len(entries)}")

    fetched: dict[str, dict] = {}
    for index, row in enumerate(rows):
        user = gc_username(row["who"])
        aggregates = fetch_aggregates(row["uuid"], session)
        for column in GC_COLUMNS:
            shown, actual = row["metrics"][column], aggregates.get(column)
            if actual is None or abs(round(actual, 4) - shown) > 1e-9:
                raise RuntimeError(
                    f"{row['who']}: {column} mismatch, leaderboard {shown} vs metrics {actual}"
                )
        if "Betti0Error" not in aggregates:
            raise RuntimeError(f"{row['who']}: metrics.json has no aggregates.Betti0Error")
        fetched[user] = {
            "gc_name": display_name(row["who"]),
            "betti": float(aggregates["Betti0Error"]),
            "created": row["created"],
            "mean_position": row["mean_position"],
        }
        print(
            f"  {row['who']:30s} {row['created']:15s} mean={row['mean_position']:6s} "
            f"Betti0Error={fetched[user]['betti']}"
        )
        if index + 1 < len(rows):
            time.sleep(1.0)

    # The overlay is keyed by GC account name: Grand Challenge lets a team rename
    # itself, and two overlay rows have had their team label changed since the
    # mirror was frozen. Renaming here would also change the publisher's merge
    # keys (collapsing rows), so the frozen labels stay and only the metric is
    # added.
    overlay_users = {gc_username(name): name for name in entries}
    unknown = sorted(set(fetched) - set(overlay_users))
    missing = sorted(set(overlay_users) - set(fetched))
    if unknown or missing:
        raise RuntimeError(f"overlay/leaderboard mismatch: only-overlay={missing} only-gc={unknown}")

    for user, name in sorted(overlay_users.items()):
        drifted = fetched[user]["gc_name"] != name
        for column in ("DSC", "clDice", "TLD", "BD"):
            if abs(entries[name]["metrics"][column] - row_metric(rows, user, column)) > 1e-9:
                raise RuntimeError(
                    f"{name}: frozen {column} does not match the GC row for {user}"
                )
        if drifted:
            print(f"  note: GC now labels {user!r} as {fetched[user]['gc_name']!r}; keeping {name!r}")

    board["metrics"] = [
        {"name": name, "higher_is_better": higher} for name, higher in RANKED
    ]
    for user, name in overlay_users.items():
        entries[name]["metrics"]["Betti0Error"] = fetched[user]["betti"]
    for name in [metric["name"] for metric in board["metrics"]]:
        for entry, rank in zip(
            board["entries"],
            average_ranks(
                [entry["metrics"][name] for entry in board["entries"]],
                higher_is_better=dict(RANKED)[name],
            ),
        ):
            entry.setdefault("metric_ranks", {})[name] = rank
    for entry in board["entries"]:
        entry["mean_rank"] = round(
            sum(entry["metric_ranks"][name] for name, _ in RANKED) / len(RANKED), 4
        )
    board["entries"].sort(key=lambda e: (e["mean_rank"], e["team_display_name"].casefold()))
    for entry, rank in zip(
        board["entries"], average_ranks([e["mean_rank"] for e in board["entries"]], higher_is_better=False)
    ):
        entry["rank"] = rank
    overlay["_source"] = (
        "Frozen mirror of the official Grand Challenge validation-phase leaderboards "
        f"(rows re-read {datetime.now(timezone.utc):%Y-%m-%d}; per-team Betti0Error "
        "taken from each evaluation's "
        "public metrics.json, which the leaderboard does not display). "
        "Merged by publish_leaderboard.py --mode real; do not edit by hand."
    )

    print("\nre-ranked overlay (5 metrics):")
    for entry in board["entries"]:
        print(
            f"  {entry['rank']:>5} | {entry['team_display_name']:30s} "
            f"| mean {entry['mean_rank']:6.3f} "
            f"| Betti0Error {entry['metrics']['Betti0Error']:>8}"
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
