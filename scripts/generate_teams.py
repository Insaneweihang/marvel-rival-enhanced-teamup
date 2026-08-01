from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from marvel_teamups.exporters import export_role_format, export_summary, export_unrestricted
from marvel_teamups.generator import (
    filter_teams_by_hero,
    generate_fully_enhanced_teams,
    has_role_distribution,
)
from marvel_teamups.loader import DataLoadError, load_data, load_heroes, load_teamups
from marvel_teamups.role_formats import ROLE_FORMATS, ROLE_FORMAT_ORDER
from marvel_teamups.validator import validate_dataset


def _formats(value: str) -> set[str]:
    return {"csv", "json", "md"} if value == "all" else {value}


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate fully enhanced six-hero teams.")
    parser.add_argument("--data-dir", type=Path, default=ROOT / "data")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "output")
    parser.add_argument("--team-size", type=int, default=6)
    parser.add_argument("--role-format", choices=["unrestricted", *ROLE_FORMAT_ORDER, "role", "both"], default="both")
    parser.add_argument("--hero", action="append", default=[])
    parser.add_argument("--exclude-hero", action="append", default=[])
    parser.add_argument("--format", choices=["csv", "json", "md", "all"], default="all")
    parser.add_argument("--show-details", action="store_true")
    parser.add_argument("--expected-unrestricted", type=int, default=247)
    parser.add_argument("--expected-222", type=int, default=28)
    parser.add_argument("--fail-on-count-mismatch", action="store_true")
    args = parser.parse_args()

    try:
        heroes_patch, heroes = load_heroes(args.data_dir / "heroes.json")
        teamups_patch, teamups = load_teamups(args.data_dir / "teamups.json")
        result = validate_dataset(heroes, teamups, heroes_patch, teamups_patch)
        if not result.ok:
            raise DataLoadError("; ".join(result.errors))
        loaded = load_data(args.data_dir)
    except DataLoadError as exc:
        print(f"Cannot generate teams: {exc}", file=sys.stderr)
        return 1

    unknown_filters = (set(args.hero) | set(args.exclude_hero)) - set(loaded.heroes_by_name)
    if unknown_filters:
        print(f"Unknown hero filter(s): {', '.join(sorted(unknown_filters))}", file=sys.stderr)
        return 1

    hero_names = sorted(
        name for name, hero in loaded.heroes_by_name.items() if hero.active
    )
    all_teams = generate_fully_enhanced_teams(hero_names, loaded.teamup_partners, args.team_size)
    all_teams = filter_teams_by_hero(all_teams, set(args.hero), set(args.exclude_hero))
    role_teams = {
        key: [
            team
            for team in all_teams
            if args.team_size == 6 and has_role_distribution(team, loaded.heroes_by_name, role_format.distribution)
        ]
        for key, role_format in ROLE_FORMATS.items()
    }

    formats = _formats(args.format)
    if args.role_format in {"unrestricted", "both"}:
        export_unrestricted(all_teams, loaded.heroes_by_name, loaded.teamup_partners, loaded.patch_version, args.output_dir, formats)
    role_format_keys = ROLE_FORMAT_ORDER if args.role_format in {"role", "both"} else [args.role_format]
    for key in role_format_keys:
        if key in ROLE_FORMATS:
            export_role_format(
                role_teams[key],
                loaded.heroes_by_name,
                loaded.teamup_partners,
                loaded.patch_version,
                args.output_dir,
                formats,
                key,
            )

    total_combinations = math.comb(len(hero_names), args.team_size)
    summary = {
        "patch_version": loaded.patch_version,
        "hero_count": len(hero_names),
        "total_heroes_loaded": len(loaded.heroes_by_name),
        "team_size": args.team_size,
        "total_combinations_checked": total_combinations,
        "fully_enhanced_unrestricted_count": len(all_teams),
        "fully_enhanced_222_count": len(role_teams["222"]),
        "role_distribution_counts": {key: len(role_teams[key]) for key in ROLE_FORMAT_ORDER},
        "role_distribution_labels": {key: ROLE_FORMATS[key].label for key in ROLE_FORMAT_ORDER},
        "expected_counts": {
            "unrestricted": args.expected_unrestricted,
            "222": args.expected_222,
        },
        "count_match": {
            "unrestricted": len(all_teams) == args.expected_unrestricted,
            "222": len(role_teams["222"]) == args.expected_222,
        },
        "filters": {
            "hero": sorted(args.hero),
            "exclude_hero": sorted(args.exclude_hero),
        },
    }
    export_summary(summary, args.output_dir)

    print(f"Patch version: {loaded.patch_version}")
    print(f"Heroes loaded: {len(hero_names)}")
    print(f"Total six-hero combinations checked: {total_combinations}")
    print(f"Fully enhanced unrestricted teams: {len(all_teams)}")
    for key in ROLE_FORMAT_ORDER:
        print(f"Fully enhanced {ROLE_FORMATS[key].label} teams: {len(role_teams[key])}")
    print(f"Output directory: {args.output_dir}")

    mismatch = not all(summary["count_match"].values())
    if mismatch:
        print("Reference count mismatch detected; see output/summary.json.")
    if args.fail_on_count_mismatch and mismatch:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
