from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from marvel_teamups.loader import DataLoadError, load_heroes, load_teamup_effects, load_teamups
from marvel_teamups.validator import validate_dataset


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Marvel Rivals Team-Up data.")
    parser.add_argument("--data-dir", type=Path, default=ROOT / "data")
    args = parser.parse_args()

    try:
        heroes_patch, heroes = load_heroes(args.data_dir / "heroes.json")
        teamups_patch, teamups = load_teamups(args.data_dir / "teamups.json")
        effects_patch, effects = load_teamup_effects(args.data_dir / "teamup_effects.json")
    except DataLoadError as exc:
        print(f"Data validation failed:\n- {exc}", file=sys.stderr)
        return 1

    result = validate_dataset(heroes, teamups, heroes_patch, teamups_patch, effects, effects_patch)
    if not result.ok:
        print("Data validation failed:", file=sys.stderr)
        for error in result.errors:
            print(f"- {error}", file=sys.stderr)
        for warning in result.warnings:
            print(f"Warning: {warning}", file=sys.stderr)
        return 1

    for warning in result.warnings:
        print(f"Warning: {warning}", file=sys.stderr)
    print("Data validation passed.")
    print(f"Heroes: {len(heroes)}")
    print(f"Team-Up mappings: {len(teamups)}")
    print(f"Patch: {heroes_patch}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
