from __future__ import annotations

import csv
import json
from pathlib import Path

from .generator import active_partners, role_assignment
from .models import Hero, Role


def enhancement_details(
    team: tuple[str, ...], teamup_partners: dict[str, frozenset[str]]
) -> dict[str, list[str]]:
    team_set = frozenset(team)
    return {
        hero: sorted(active_partners(hero, team_set, teamup_partners))
        for hero in sorted(team)
    }


def details_text(team: tuple[str, ...], teamup_partners: dict[str, frozenset[str]]) -> str:
    details = enhancement_details(team, teamup_partners)
    return "; ".join(f"{hero} <- {', '.join(partners)}" for hero, partners in details.items())


def _heroes_json(
    team: tuple[str, ...],
    heroes_by_name: dict[str, Hero],
    teamup_partners: dict[str, frozenset[str]],
    assigned_roles: dict[str, Role] | None = None,
) -> list[dict[str, object]]:
    details = enhancement_details(team, teamup_partners)
    return [
        {
            "name": hero,
            "role": (assigned_roles or {}).get(hero, heroes_by_name[hero].role).value,
            "primary_role": heroes_by_name[hero].role.value,
            "eligible_roles": sorted(role.value for role in heroes_by_name[hero].eligible_roles),
            "active": heroes_by_name[hero].active,
            "active_partners": details[hero],
        }
        for hero in sorted(team)
    ]


def export_unrestricted(
    teams: list[tuple[str, ...]],
    heroes_by_name: dict[str, Hero],
    teamup_partners: dict[str, frozenset[str]],
    patch_version: str,
    output_dir: Path,
    formats: set[str],
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    if "csv" in formats:
        with (output_dir / "all_fully_enhanced_teams.csv").open("w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["team_number", "hero_1", "hero_2", "hero_3", "hero_4", "hero_5", "hero_6", "enhancement_details"])
            for index, team in enumerate(teams, start=1):
                writer.writerow([index, *team, details_text(team, teamup_partners)])
    if "json" in formats:
        payload = {
            "patch_version": patch_version,
            "team_count": len(teams),
            "teams": [
                {
                    "team_number": index,
                    "heroes": _heroes_json(team, heroes_by_name, teamup_partners),
                }
                for index, team in enumerate(teams, start=1)
            ],
        }
        (output_dir / "all_fully_enhanced_teams.json").write_text(
            json.dumps(payload, indent=2), encoding="utf-8"
        )
    if "md" in formats:
        rows = ["| # | Heroes | Enhancement paths |", "|---:|---|---|"]
        rows.extend(
            f"| {index} | {', '.join(team)} | {details_text(team, teamup_partners)} |"
            for index, team in enumerate(teams, start=1)
        )
        (output_dir / "all_fully_enhanced_teams.md").write_text("\n".join(rows) + "\n", encoding="utf-8")


def _role_names(
    team: tuple[str, ...],
    heroes_by_name: dict[str, Hero],
    role: Role,
    assigned_roles: dict[str, Role],
) -> list[str]:
    return sorted(hero for hero in team if assigned_roles[hero] == role)


def export_222(
    teams: list[tuple[str, ...]],
    heroes_by_name: dict[str, Hero],
    teamup_partners: dict[str, frozenset[str]],
    patch_version: str,
    output_dir: Path,
    formats: set[str],
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    if "csv" in formats:
        with (output_dir / "fully_enhanced_222_teams.csv").open("w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["team_number", "vanguard_1", "vanguard_2", "duelist_1", "duelist_2", "strategist_1", "strategist_2", "enhancement_details"])
            for index, team in enumerate(teams, start=1):
                assigned_roles = role_assignment(
                    team,
                    heroes_by_name,
                    {Role.VANGUARD: 2, Role.DUELIST: 2, Role.STRATEGIST: 2},
                )
                if assigned_roles is None:
                    raise ValueError(f"2-2-2 team has no valid role assignment: {team}")
                row = (
                    [index]
                    + _role_names(team, heroes_by_name, Role.VANGUARD, assigned_roles)
                    + _role_names(team, heroes_by_name, Role.DUELIST, assigned_roles)
                    + _role_names(team, heroes_by_name, Role.STRATEGIST, assigned_roles)
                    + [details_text(team, teamup_partners)]
                )
                writer.writerow(row)
    if "json" in formats:
        payload = {
            "patch_version": patch_version,
            "team_count": len(teams),
            "teams": [
                {
                    "team_number": index,
                    "heroes": _heroes_json(
                        team,
                        heroes_by_name,
                        teamup_partners,
                        role_assignment(
                            team,
                            heroes_by_name,
                            {Role.VANGUARD: 2, Role.DUELIST: 2, Role.STRATEGIST: 2},
                        ),
                    ),
                }
                for index, team in enumerate(teams, start=1)
            ],
        }
        (output_dir / "fully_enhanced_222_teams.json").write_text(
            json.dumps(payload, indent=2), encoding="utf-8"
        )
    if "md" in formats:
        rows = ["| # | Vanguards | Duelists | Strategists | Enhancement paths |", "|---:|---|---|---|---|"]
        for index, team in enumerate(teams, start=1):
            assigned_roles = role_assignment(
                team,
                heroes_by_name,
                {Role.VANGUARD: 2, Role.DUELIST: 2, Role.STRATEGIST: 2},
            )
            if assigned_roles is None:
                raise ValueError(f"2-2-2 team has no valid role assignment: {team}")
            rows.append(
                f"| {index} | {', '.join(_role_names(team, heroes_by_name, Role.VANGUARD, assigned_roles))} | "
                f"{', '.join(_role_names(team, heroes_by_name, Role.DUELIST, assigned_roles))} | "
                f"{', '.join(_role_names(team, heroes_by_name, Role.STRATEGIST, assigned_roles))} | "
                f"{details_text(team, teamup_partners)} |"
            )
        (output_dir / "fully_enhanced_222_teams.md").write_text("\n".join(rows) + "\n", encoding="utf-8")


def export_summary(payload: dict[str, object], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "summary.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
