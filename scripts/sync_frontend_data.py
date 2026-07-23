from __future__ import annotations

import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output"
FRONTEND_DATA_DIR = ROOT / "docs" / "data"
OUTPUT_FILES = [
    "summary.json",
    "all_fully_enhanced_teams.json",
    "all_fully_enhanced_teams.md",
    "fully_enhanced_222_teams.json",
    "fully_enhanced_222_teams.md",
]
DATA_FILES = [
    "heroes.json",
    "teamups.json",
]


def main() -> int:
    FRONTEND_DATA_DIR.mkdir(parents=True, exist_ok=True)
    for name in OUTPUT_FILES:
        source = OUTPUT_DIR / name
        if not source.exists():
            raise FileNotFoundError(f"Missing generated output file: {source}")
        shutil.copy2(source, FRONTEND_DATA_DIR / name)
        print(f"Copied {source} -> {FRONTEND_DATA_DIR / name}")
    for name in DATA_FILES:
        source = ROOT / "data" / name
        if not source.exists():
            raise FileNotFoundError(f"Missing source data file: {source}")
        shutil.copy2(source, FRONTEND_DATA_DIR / name)
        print(f"Copied {source} -> {FRONTEND_DATA_DIR / name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
