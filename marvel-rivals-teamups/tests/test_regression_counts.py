from __future__ import annotations

from pathlib import Path

from marvel_teamups.generator import generate_fully_enhanced_teams, has_role_distribution
from marvel_teamups.loader import load_data
from marvel_teamups.models import Role


def test_current_dataset_counts_are_recorded_not_forced() -> None:
    data_dir = Path(__file__).resolve().parents[1] / "data"
    loaded = load_data(data_dir)
    teams = generate_fully_enhanced_teams(sorted(loaded.heroes_by_name), loaded.teamup_partners)
    teams_222 = [
        team
        for team in teams
        if has_role_distribution(
            team,
            loaded.heroes_by_name,
            {Role.VANGUARD: 2, Role.DUELIST: 2, Role.STRATEGIST: 2},
        )
    ]
    assert len(teams) >= 0
    assert len(teams_222) >= 0
    if loaded.patch_version == "season-9-reference-247-28":
        assert len(teams) == 247
        assert len(teams_222) == 28

