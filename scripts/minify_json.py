#!/usr/bin/env python3
"""Minify models.json to single-line JSON and compare file sizes."""

import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
INPUT_FILE = DATA_DIR / "models.json"
OUTPUT_FILE = DATA_DIR / "models.min.json"


def main():
    # Read original
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Write minified
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

    # Compare sizes
    original_size = INPUT_FILE.stat().st_size
    minified_size = OUTPUT_FILE.stat().st_size
    reduction = (1 - minified_size / original_size) * 100

    print(f"Original:  {original_size:,} bytes ({original_size / 1024:.2f} KB)")
    print(f"Minified:  {minified_size:,} bytes ({minified_size / 1024:.2f} KB)")
    print(f"Reduction: {reduction:.1f}%")
    print(f"\nOutput: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
