from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from marvel_teamups.generator import generate_fully_enhanced_teams, has_role_distribution
from marvel_teamups.loader import load_data
from marvel_teamups.models import Role

ROLE_222 = {Role.VANGUARD: 2, Role.DUELIST: 2, Role.STRATEGIST: 2}


def _counts(data_dir: Path) -> tuple[object, list[tuple[str, ...]], list[tuple[str, ...]]]:
    loaded = load_data(data_dir)
    teams = generate_fully_enhanced_teams(sorted(loaded.heroes_by_name), loaded.teamup_partners)
    teams_222 = [team for team in teams if has_role_distribution(team, loaded.heroes_by_name, ROLE_222)]
    return loaded, teams, teams_222


def main() -> int:
    parser = argparse.ArgumentParser(description="Compare Marvel Rivals Team-Up datasets.")
    parser.add_argument("--old-data-dir", type=Path, required=True)
    parser.add_argument("--new-data-dir", type=Path, default=ROOT / "data")
    parser.add_argument("--format", choices=["md", "json"], default="md")
    args = parser.parse_args()

    old, old_teams, old_222 = _counts(args.old_data_dir)
    new, new_teams, new_222 = _counts(args.new_data_dir)
    old_names = set(old.heroes_by_name)
    new_names = set(new.heroes_by_name)

    role_changes = {
        name: {
            "old": old.heroes_by_name[name].role.value,
            "new": new.heroes_by_name[name].role.value,
        }
        for name in sorted(old_names & new_names)
        if old.heroes_by_name[name].role != new.heroes_by_name[name].role
    }

    old_edges = {(hero, partner) for hero, partners in old.teamup_partners.items() for partner in partners}
    new_edges = {(hero, partner) for hero, partners in new.teamup_partners.items() for partner in partners}
    changed_pairs = {
        hero: {
            "old": sorted(old.teamup_partners.get(hero, frozenset())),
            "new": sorted(new.teamup_partners.get(hero, frozenset())),
        }
        for hero in sorted(set(old.teamup_partners) | set(new.teamup_partners))
        if old.teamup_partners.get(hero, frozenset()) != new.teamup_partners.get(hero, frozenset())
    }

    payload = {
        "old_patch_version": old.patch_version,
        "new_patch_version": new.patch_version,
        "added_heroes": sorted(new_names - old_names),
        "removed_heroes": sorted(old_names - new_names),
        "role_changes": role_changes,
        "added_teamup_relationships": sorted(new_edges - old_edges),
        "removed_teamup_relationships": sorted(old_edges - new_edges),
        "changed_partner_pairs": changed_pairs,
        "unrestricted_count_difference": len(new_teams) - len(old_teams),
        "role_222_count_difference": len(new_222) - len(old_222),
        "teams_added": [list(team) for team in sorted(set(new_teams) - set(old_teams))],
        "teams_removed": [list(team) for team in sorted(set(old_teams) - set(new_teams))],
    }

    if args.format == "json":
        print(json.dumps(payload, indent=2))
    else:
        print(f"# Patch Comparison: {old.patch_version} -> {new.patch_version}")
        print(f"- Added heroes: {', '.join(payload['added_heroes']) or 'None'}")
        print(f"- Removed heroes: {', '.join(payload['removed_heroes']) or 'None'}")
        print(f"- Role changes: {len(role_changes)}")
        print(f"- Added Team-Up relationships: {len(payload['added_teamup_relationships'])}")
        print(f"- Removed Team-Up relationships: {len(payload['removed_teamup_relationships'])}")
        print(f"- Changed partner pairs: {len(changed_pairs)}")
        print(f"- Unrestricted count difference: {payload['unrestricted_count_difference']}")
        print(f"- 2-2-2 count difference: {payload['role_222_count_difference']}")
        print(f"- Teams added: {len(payload['teams_added'])}")
        print(f"- Teams removed: {len(payload['teams_removed'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

