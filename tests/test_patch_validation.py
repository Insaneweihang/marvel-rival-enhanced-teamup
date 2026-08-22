from __future__ import annotations

from scripts.validate_patch import allowed_reciprocal_pairs, reciprocal_pairs, validate_sources


def test_reciprocal_pairs_are_detected_as_explicit_edges() -> None:
    teamups = {
        "A": ["B", "C"],
        "B": ["A", "D"],
        "C": ["D", "E"],
        "D": ["C", "F"],
    }

    assert reciprocal_pairs(teamups) == {("A", "B"), ("C", "D")}


def test_reciprocal_allowlist_is_normalized() -> None:
    metadata = {"allowed_reciprocal_teamups": [["B", "A"]]}

    assert allowed_reciprocal_pairs(metadata) == {("A", "B")}


def test_verified_sources_require_source_and_effect_text() -> None:
    effects = {
        "A": [
            {
                "partner": "B",
                "verification_status": "verified_secondary",
                "source_url": "https://example.com",
                "base_effect": "Base",
                "enhanced_effect": "Enhanced",
            }
        ]
    }

    assert validate_sources(effects) == []


def test_needs_verification_is_explicitly_allowed_without_source_text() -> None:
    effects = {
        "A": [
            {
                "partner": "B",
                "verification_status": "needs_verification",
                "source_url": None,
                "base_effect": None,
                "enhanced_effect": None,
            }
        ]
    }

    assert validate_sources(effects) == []


def test_unknown_source_status_fails() -> None:
    effects = {
        "A": [
            {
                "partner": "B",
                "verification_status": "community_guess",
            }
        ]
    }

    assert len(validate_sources(effects)) == 1
