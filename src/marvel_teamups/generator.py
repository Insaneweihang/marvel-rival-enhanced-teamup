from __future__ import annotations

from collections import Counter
from itertools import combinations

from .models import Hero, Role


def active_partners(
    hero: str,
    team: frozenset[str],
    teamup_partners: dict[str, frozenset[str]],
) -> frozenset[str]:
    return frozenset(sorted(teamup_partners[hero] & (team - {hero})))


def is_fully_enhanced(
    team: tuple[str, ...],
    teamup_partners: dict[str, frozenset[str]],
) -> bool:
    team_set = frozenset(team)
    return all(bool(active_partners(hero, team_set, teamup_partners)) for hero in team)


def generate_fully_enhanced_teams(
    hero_names: list[str],
    teamup_partners: dict[str, frozenset[str]],
    team_size: int = 6,
) -> list[tuple[str, ...]]:
    return [
        team
        for team in combinations(sorted(hero_names), team_size)
        if is_fully_enhanced(team, teamup_partners)
    ]


def has_role_distribution(
    team: tuple[str, ...],
    heroes_by_name: dict[str, Hero],
    required: dict[Role, int],
) -> bool:
    return role_assignment(team, heroes_by_name, required) is not None


def role_assignment(
    team: tuple[str, ...],
    heroes_by_name: dict[str, Hero],
    required: dict[Role, int],
) -> dict[str, Role] | None:
    remaining = Counter(required)
    assignment: dict[str, Role] = {}
    ordered_team = sorted(
        team,
        key=lambda name: (len(heroes_by_name[name].eligible_roles), name),
    )

    def assign(index: int) -> bool:
        if index == len(ordered_team):
            return all(count == 0 for count in remaining.values())
        hero_name = ordered_team[index]
        for role in sorted(heroes_by_name[hero_name].eligible_roles, key=lambda item: item.value):
            if remaining[role] <= 0:
                continue
            assignment[hero_name] = role
            remaining[role] -= 1
            if assign(index + 1):
                return True
            remaining[role] += 1
            del assignment[hero_name]
        return False

    return assignment if assign(0) else None


def filter_teams_by_hero(
    teams: list[tuple[str, ...]],
    include_heroes: set[str] | None = None,
    exclude_heroes: set[str] | None = None,
) -> list[tuple[str, ...]]:
    include_heroes = include_heroes or set()
    exclude_heroes = exclude_heroes or set()
    return [
        team
        for team in teams
        if include_heroes.issubset(team) and not (set(team) & exclude_heroes)
    ]
