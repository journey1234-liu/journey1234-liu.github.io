#!/usr/bin/env python3
"""Build the collaborator logo strip assets from the ATM-Collaborators logo set.

What it does
------------
For every collaborator PNG in the source folder this writes one trimmed, WebP
copy under ``public/img/collaborators/`` and prints the TypeScript entry block
for ``content.ts``:

* **Trim.** The PNGs were cut out of a slide, so several keep a few dozen
  transparent pixels of slack around the artwork (Columbia University alone has
  83 px above and 107 px below). Trimmed to the alpha bounding box, every mark
  sits on the same optical edge in the strip.
* **Resize.** Each row of the strip is 60px high and a single mark may be at
  most 300px wide (see ``.logo-marquee-item img`` in ``styles.css``), so assets
  are rendered at twice that box to stay sharp on 2x displays.
* **WebP.** Alpha is preserved; the source is lossless PNG, exported at q=90
  with method 6. Logos are flat artwork, so the files stay small.

Names, slugs and the alphabetical order live in ``LOGOS`` below: the order is
computed from a punctuation-free lowercase key (``st. luke's`` -> ``stlukes``),
which is the order ``tests/collaborators.test.ts`` asserts on the site.

Two files in the source zip are deliberately skipped: the Imperial College
London *coat of arms* (the institution is represented by its wordmark, and two
marks for one partner would read as two partners), and
``Unidentified_blue_lion_shield.png``, whose owner the source notes could not
be established, so it cannot be credited yet. ``non_collaborator_items/``
(MICCAI header artwork, challenge poster) and ``originals_from_pdf/`` are not
collaborator logos and are ignored.

Usage::

    python3 tools/make_collaborator_logos.py \
        --src ../../../figures-for-render/ATM-Collaborators-Logos \
        --out public/img/collaborators

Re-run after adding a logo to ``LOGOS``; the script is idempotent.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from PIL import Image

#: Strip box at 1x, mirrored from ``.logo-marquee-item img`` in styles.css.
MAX_HEIGHT = 60
MAX_WIDTH = 300
SCALE = 2
QUALITY = 90

#: (source PNG stem, display name, output slug).
LOGOS = [
    ("Alibaba_DAMO_Academy", "Alibaba DAMO Academy", "alibaba-damo-academy"),
    ("Busan_Medical_Center", "Busan Medical Center", "busan-medical-center"),
    ("Columbia_University", "Columbia University", "columbia-university"),
    ("DIANGI", "DIANGI", "diangi"),
    ("DKFZ", "DKFZ", "dkfz"),
    ("ENSTA_Bretagne", "ENSTA Bretagne", "ensta-bretagne"),
    ("Fraunhofer_MEVIS", "Fraunhofer MEVIS", "fraunhofer-mevis"),
    ("Fudan_University", "Fudan University", "fudan-university"),
    ("Fuzhou_University", "Fuzhou University", "fuzhou-university"),
    ("Harvard_Medical_School", "Harvard Medical School", "harvard-medical-school"),
    ("IIT_Madras", "IIT Madras", "iit-madras"),
    ("Imperial_College_London", "Imperial College London", "imperial-college-london"),
    ("InferVision", "InferVision", "infervision"),
    ("Institute_of_Medical_Robotics_SJTU", "Institute of Medical Robotics, SJTU", "institute-of-medical-robotics-sjtu"),
    ("Kings_College_London", "King's College London", "kings-college-london"),
    ("MBZUAI", "MBZUAI", "mbzuai"),
    ("MIT", "MIT", "mit"),
    ("Median_Technologies", "Median Technologies", "median-technologies"),
    ("Medical_Image_Insights_YingHe_YiMai", "Medical Image Insights", "medical-image-insights"),
    ("MicroPort_MedBot", "MicroPort MedBot", "microport-medbot"),
    ("NMED_National_Innovation_Center_for_Advanced_Medical_Devices", "NMED", "nmed"),
    ("Philips", "Philips", "philips"),
    ("Politecnico_di_Milano", "Politecnico di Milano", "politecnico-di-milano"),
    ("Pusan_National_University", "Pusan National University", "pusan-national-university"),
    ("Radboudumc", "Radboudumc", "radboudumc"),
    ("SANMED_Biotech", "SANMED Biotech", "sanmed-biotech"),
    ("SENSAR", "SENSAR", "sensar"),
    ("Shanghai_AI_Laboratory", "Shanghai AI Laboratory", "shanghai-ai-laboratory"),
    ("Shanghai_Chest_Hospital", "Shanghai Chest Hospital", "shanghai-chest-hospital"),
    ("Shanghai_Jiao_Tong_University", "Shanghai Jiao Tong University", "shanghai-jiao-tong-university"),
    ("Siemens_Healthineers", "Siemens Healthineers", "siemens-healthineers"),
    ("St_Lukes_Hospital_SJTU_School_of_Medicine", "St. Luke's Hospital, SJTU", "st-lukes-hospital-sjtu"),
    ("Stanford_University", "Stanford University", "stanford-university"),
    ("TUM", "TUM", "tum"),
    ("Tsinghua_University", "Tsinghua University", "tsinghua-university"),
    ("UCL_University_College_London", "UCL", "ucl"),
    ("UNICAMP", "UNICAMP", "unicamp"),
    ("United_Imaging_Intelligence", "United Imaging Intelligence", "united-imaging-intelligence"),
    ("Universiti_Kebangsaan_Malaysia", "Universiti Kebangsaan Malaysia", "universiti-kebangsaan-malaysia"),
    ("University_of_Science_and_Technology_of_China", "University of Science and Technology of China", "university-of-science-and-technology-of-china"),
    ("West_China_Hospital_Sichuan_University", "West China Hospital, Sichuan University", "west-china-hospital-sichuan-university"),
]


def sort_key(name: str) -> str:
    """Lowercase letters and digits only, so punctuation never decides the order."""
    return re.sub(r"[^a-z0-9]", "", name.lower())


def render(src: Path, dst: Path) -> tuple[int, int, int]:
    """Trim, downscale and save one logo; returns (width, height, bytes)."""
    with Image.open(src) as raw:
        image = raw.convert("RGBA")
    box = image.getchannel("A").getbbox()
    if box:
        image = image.crop(box)
    target_h = min(MAX_HEIGHT * SCALE, round(MAX_WIDTH * SCALE * image.height / image.width))
    target_w = max(1, round(target_h * image.width / image.height))
    if (target_w, target_h) != image.size:
        image = image.resize((target_w, target_h), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    image.save(dst, "WEBP", quality=QUALITY, method=6)
    return target_w, target_h, dst.stat().st_size


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--src", required=True, type=Path, help="folder with the collaborator PNGs")
    parser.add_argument("--out", required=True, type=Path, help="output folder, e.g. public/img/collaborators")
    parser.add_argument("--dry-run", action="store_true", help="report sizes without writing files")
    args = parser.parse_args(argv)

    if not args.src.is_dir():
        parser.error(f"source folder not found: {args.src}")

    missing = [stem for stem, _, _ in LOGOS if not (args.src / f"{stem}.png").is_file()]
    if missing:
        parser.error("source PNG missing: " + ", ".join(missing))

    total = 0
    entries = []
    for stem, name, slug in LOGOS:
        dst = args.out / f"{slug}.webp"
        if args.dry_run:
            with Image.open(args.src / f"{stem}.png") as image:
                width, height = image.size
            print(f"{slug:45s} {width:5d}x{height:<5d} (not written)")
            continue
        width, height, size = render(args.src / f"{stem}.png", dst)
        total += size
        entries.append((name, slug, width, height))
        print(f"{slug:45s} {width:5d}x{height:<5d} {size / 1024:6.1f} KiB")

    if args.dry_run:
        return 0

    print(f"\n{len(LOGOS)} logos, {total / 1024:.0f} KiB total\n")
    print("Paste into content.ts (the array is sorted by the same key the test uses):")
    print("export const COLLABORATOR_LOGOS: CollaboratorLogo[] = [")
    for name, slug, width, height in sorted(entries, key=lambda e: sort_key(e[0])):
        print(
            f'  {{ name: "{name}", src: "img/collaborators/{slug}.webp", '
            f'width: {width}, height: {height} }},'
        )
    print("];")
    return 0


if __name__ == "__main__":
    sys.exit(main())
