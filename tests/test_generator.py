from __future__ import annotations

from marvel_teamups.generator import (
    filter_teams_by_hero,
    generate_fully_enhanced_teams,
    has_role_distribution,
    is_fully_enhanced,
)
from marvel_teamups.models import Hero, Role

TEAMUPS = {
    "A": frozenset({"B", "C"}),
    "B": frozenset({"A", "D"}),
    "C": frozenset({"D", "A"}),
    "D": frozenset({"C", "B"}),
    "E": frozenset({"F", "A"}),
    "F": frozenset({"E", "B"}),
    "G": frozenset({"A", "B"}),
}


def test_valid_fully_enhanced_team_passes() -> None:
    assert is_fully_enhanced(("A", "B", "C", "D", "E", "F"), TEAMUPS)


def test_team_with_one_unenhanced_hero_fails() -> None:
    teamups = TEAMUPS | {"G": frozenset({"X", "Y"})}
    assert not is_fully_enhanced(("A", "B", "C", "D", "E", "G"), teamups)


def test_directional_relationship_is_not_treated_as_bidirectional() -> None:
    teamups = {
        "A": frozenset({"B", "C"}),
        "B": frozenset({"D", "E"}),
    }
    assert is_fully_enhanced(("A",), {"A": frozenset({"A", "B"})}) is False
    assert not is_fully_enhanced(("A", "B"), teamups)


def test_either_partner_is_sufficient_and_both_are_not_required() -> None:
    assert is_fully_enhanced(("A", "B"), {"A": frozenset({"B", "C"}), "B": frozenset({"A", "D"})})


def test_duplicate_permutations_are_not_produced() -> None:
    results = generate_fully_enhanced_teams(["B", "A"], {"A": frozenset({"B", "C"}), "B": frozenset({"A", "D"})}, team_size=2)
    assert results == [("A", "B")]


def test_results_are_deterministically_sorted() -> None:
    first = generate_fully_enhanced_teams(["F", "E", "D", "C", "B", "A"], TEAMUPS)
    second = generate_fully_enhanced_teams(["A", "B", "C", "D", "E", "F"], TEAMUPS)
    assert first == second == [("A", "B", "C", "D", "E", "F")]


def test_222_filter_works() -> None:
    heroes = {
        "A": Hero("A", Role.VANGUARD),
        "B": Hero("B", Role.VANGUARD),
        "C": Hero("C", Role.DUELIST),
        "D": Hero("D", Role.DUELIST),
        "E": Hero("E", Role.STRATEGIST),
        "F": Hero("F", Role.STRATEGIST),
    }
    assert has_role_distribution(
        ("A", "B", "C", "D", "E", "F"),
        heroes,
        {Role.VANGUARD: 2, Role.DUELIST: 2, Role.STRATEGIST: 2},
    )


def test_hero_inclusion_filtering_works() -> None:
    teams = [("A", "B"), ("A", "C"), ("B", "C")]
    assert filter_teams_by_hero(teams, include_heroes={"A"}) == [("A", "B"), ("A", "C")]


def test_hero_exclusion_filtering_works() -> None:
    teams = [("A", "B"), ("A", "C"), ("B", "C")]
    assert filter_teams_by_hero(teams, exclude_heroes={"A"}) == [("B", "C")]
