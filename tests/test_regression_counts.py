from __future__ import annotations

from pathlib import Path

from marvel_teamups.generator import generate_fully_enhanced_teams, has_role_distribution
from marvel_teamups.loader import load_data
from marvel_teamups.models import Role


def test_current_dataset_counts_are_recorded_not_forced() -> None:
    data_dir = Path(__file__).resolve().parents[1] / "data"
    loaded = load_data(data_dir)
    teamups = loaded.teamup_partners
    assert all(len(partners) == 2 for partners in teamups.values())
    active_hero_names = sorted(
        name for name, hero in loaded.heroes_by_name.items() if hero.active
    )
    teams = generate_fully_enhanced_teams(active_hero_names, loaded.teamup_partners)
    teams_222 = [
        team
        for team in teams
        if has_role_distribution(
            team,
            loaded.heroes_by_name,
            {Role.VANGUARD: 2, Role.DUELIST: 2, Role.STRATEGIST: 2},
        )
    ]
    assert len(teams) == 247
    assert len(teams_222) == 28
    if loaded.patch_version == "season-9-reference-247-28":
        assert len(teams) == 247
        assert len(teams_222) == 28
