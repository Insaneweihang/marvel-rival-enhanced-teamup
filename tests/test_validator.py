from __future__ import annotations

from marvel_teamups.models import Hero, Role
from marvel_teamups.validator import validate_dataset


def heroes(*names: str) -> list[Hero]:
    return [Hero(name, Role.VANGUARD) for name in names]


def test_unknown_partner_is_rejected() -> None:
    result = validate_dataset(heroes("A"), {"A": frozenset({"B", "C"})}, "x", "x")
    assert any("unknown partner: B" in error for error in result.errors)


def test_self_partner_is_rejected() -> None:
    result = validate_dataset(heroes("A", "B"), {"A": frozenset({"A", "B"}), "B": frozenset({"A", "B"})}, "x", "x")
    assert any("self-reference" in error for error in result.errors)


def test_duplicate_normalized_hero_is_rejected() -> None:
    result = validate_dataset(heroes("Star Lord", "Star-Lord"), {}, "x", "x")
    assert any("Duplicate normalized" in error for error in result.errors)


def test_missing_mapping_is_rejected() -> None:
    result = validate_dataset(heroes("A", "B"), {"A": frozenset({"B", "C"})}, "x", "x")
    assert any("Hero missing from Team-Up map: B" in error for error in result.errors)


def test_wrong_partner_count_is_rejected() -> None:
    result = validate_dataset(heroes("A", "B", "C"), {"A": frozenset({"B"}), "B": frozenset({"A", "C"}), "C": frozenset({"A", "B"})}, "x", "x")
    assert any("A has 1 partners" in error for error in result.errors)

