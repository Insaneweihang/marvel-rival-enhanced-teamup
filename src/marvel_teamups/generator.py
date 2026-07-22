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
    counts = Counter(heroes_by_name[name].role for name in team)
    return all(counts[role] == expected for role, expected in required.items()) and sum(
        counts.values()
    ) == sum(required.values())


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
