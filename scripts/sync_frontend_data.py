from __future__ import annotations

import argparse
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND_DATA_DIR = ROOT / "docs" / "data"
OUTPUT_FILES = [
    "summary.json",
    "all_fully_enhanced_teams.json",
    "all_fully_enhanced_teams.md",
    "fully_enhanced_222_teams.json",
    "fully_enhanced_222_teams.md",
    "fully_enhanced_132_teams.json",
    "fully_enhanced_132_teams.md",
    "fully_enhanced_213_teams.json",
    "fully_enhanced_213_teams.md",
    "fully_enhanced_123_teams.json",
    "fully_enhanced_123_teams.md",
    "fully_enhanced_312_teams.json",
    "fully_enhanced_312_teams.md",
]
DATA_FILES = [
    "heroes.json",
    "teamups.json",
    "teamup_effects.json",
    "hero_details.json",
]


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync a generated patch snapshot into the static frontend.")
    parser.add_argument("--patch-id", default="20260710-season-9")
    parser.add_argument("--output-dir", type=Path, default=None)
    parser.add_argument("--data-dir", type=Path, default=None)
    args = parser.parse_args()

    output_dir = args.output_dir or ROOT / "output" / args.patch_id
    data_dir = args.data_dir or ROOT / "data" / "patches" / args.patch_id
    frontend_data_dir = FRONTEND_DATA_DIR / "patches" / args.patch_id
    frontend_data_dir.mkdir(parents=True, exist_ok=True)
    for name in OUTPUT_FILES:
        source = output_dir / name
        if not source.exists():
            raise FileNotFoundError(f"Missing generated output file: {source}")
        shutil.copy2(source, frontend_data_dir / name)
        print(f"Copied {source} -> {frontend_data_dir / name}")
    for name in DATA_FILES:
        source = data_dir / name
        if not source.exists():
            raise FileNotFoundError(f"Missing source data file: {source}")
        shutil.copy2(source, frontend_data_dir / name)
        print(f"Copied {source} -> {frontend_data_dir / name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
