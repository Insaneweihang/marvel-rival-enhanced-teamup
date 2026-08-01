from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from marvel_teamups.loader import DataLoadError, load_heroes, load_teamup_effects, load_teamups
from marvel_teamups.validator import validate_dataset


def validate_hero_details(
    data_dir: Path,
    heroes: list,
    teamups: dict[str, frozenset[str]],
    patch_version: str,
) -> list[str]:
    path = data_dir / "hero_details.json"
    if not path.exists():
        return [f"Missing hero detail data: {path}"]
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return [f"{path} is not valid JSON: {exc}"]

    errors: list[str] = []
    details_patch = data.get("patch_version")
    details = data.get("heroes")
    if details_patch != patch_version:
        errors.append(
            f"Patch-version mismatch: heroes.json={patch_version!r}, "
            f"hero_details.json={details_patch!r}"
        )
    if not isinstance(details, dict):
        return errors + [f"{path} must contain a heroes object"]

    active_heroes = {hero.name for hero in heroes if hero.active}
    missing_details = sorted(active_heroes - set(details))
    for hero_name in missing_details:
        errors.append(f"Active hero missing official details: {hero_name}")

    unknown_details = sorted(set(details) - {hero.name for hero in heroes})
    for hero_name in unknown_details:
        errors.append(f"Official hero details entry for unknown hero: {hero_name}")

    for hero_name, detail in sorted(details.items()):
        if not isinstance(detail, dict):
            errors.append(f"Official hero details for {hero_name} must be an object")
            continue
        if not isinstance(detail.get("base_stats"), dict):
            errors.append(f"Official hero details for {hero_name} must include base_stats object")
        if not isinstance(detail.get("abilities"), list):
            errors.append(f"Official hero details for {hero_name} must include abilities list")
        team_up_abilities = detail.get("team_up_abilities")
        if not isinstance(team_up_abilities, list):
            errors.append(f"Official hero details for {hero_name} must include team_up_abilities list")
            continue
        expected_partners = set(teamups.get(hero_name, frozenset()))
        actual_partners = {
            entry.get("partner")
            for entry in team_up_abilities
            if isinstance(entry, dict) and isinstance(entry.get("partner"), str)
        }
        if expected_partners and actual_partners != expected_partners:
            errors.append(
                f"{hero_name} official Team-Up detail partners do not match teamups.json: "
                f"details={', '.join(sorted(actual_partners))}; "
                f"teamups={', '.join(sorted(expected_partners))}"
            )
        for entry in team_up_abilities:
            if not isinstance(entry, dict):
                errors.append(f"{hero_name} official Team-Up detail entries must be objects")
                continue
            for key in ("stats", "base_stats", "enhanced_stats"):
                if not isinstance(entry.get(key), dict):
                    errors.append(f"{hero_name} / {entry.get('partner', '?')} must include {key} object")
    return errors


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
    detail_errors = validate_hero_details(args.data_dir, heroes, teamups, heroes_patch)
    if not result.ok:
        print("Data validation failed:", file=sys.stderr)
        for error in result.errors:
            print(f"- {error}", file=sys.stderr)
        for error in detail_errors:
            print(f"- {error}", file=sys.stderr)
        for warning in result.warnings:
            print(f"Warning: {warning}", file=sys.stderr)
        return 1
    if detail_errors:
        print("Data validation failed:", file=sys.stderr)
        for error in detail_errors:
            print(f"- {error}", file=sys.stderr)
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
