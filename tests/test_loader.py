from __future__ import annotations

import json
from pathlib import Path

import pytest

from marvel_teamups.loader import DataLoadError, load_data, load_heroes


def test_valid_files_load_correctly(tmp_path: Path) -> None:
    (tmp_path / "heroes.json").write_text(
        json.dumps({"patch_version": "x", "heroes": [{"name": "A", "role": "Vanguard"}]}),
        encoding="utf-8",
    )
    (tmp_path / "teamups.json").write_text(
        json.dumps({"patch_version": "x", "teamups": {"A": ["B", "C"]}}),
        encoding="utf-8",
    )
    loaded = load_data(tmp_path)
    assert loaded.patch_version == "x"
    assert loaded.heroes_by_name["A"].role.value == "Vanguard"
    assert loaded.heroes_by_name["A"].active is True
    assert loaded.teamup_partners["A"] == frozenset({"B", "C"})


def test_missing_file_fails_clearly(tmp_path: Path) -> None:
    with pytest.raises(DataLoadError, match="Missing data file"):
        load_heroes(tmp_path / "missing.json")


def test_invalid_json_fails_clearly(tmp_path: Path) -> None:
    path = tmp_path / "heroes.json"
    path.write_text("{", encoding="utf-8")
    with pytest.raises(DataLoadError, match="Invalid JSON"):
        load_heroes(path)


def test_patch_mismatch_is_detected(tmp_path: Path) -> None:
    (tmp_path / "heroes.json").write_text(
        json.dumps({"patch_version": "a", "heroes": []}), encoding="utf-8"
    )
    (tmp_path / "teamups.json").write_text(
        json.dumps({"patch_version": "b", "teamups": {}}), encoding="utf-8"
    )
    with pytest.raises(DataLoadError, match="Patch-version mismatch"):
        load_data(tmp_path)


def test_unknown_role_is_rejected(tmp_path: Path) -> None:
    path = tmp_path / "heroes.json"
    path.write_text(
        json.dumps({"patch_version": "x", "heroes": [{"name": "A", "role": "Tank"}]}),
        encoding="utf-8",
    )
    with pytest.raises(DataLoadError, match="Unknown role"):
        load_heroes(path)


def test_non_boolean_active_is_rejected(tmp_path: Path) -> None:
    path = tmp_path / "heroes.json"
    path.write_text(
        json.dumps(
            {
                "patch_version": "x",
                "heroes": [{"name": "A", "role": "Vanguard", "active": "yes"}],
            }
        ),
        encoding="utf-8",
    )
    with pytest.raises(DataLoadError, match="non-boolean active"):
        load_heroes(path)
