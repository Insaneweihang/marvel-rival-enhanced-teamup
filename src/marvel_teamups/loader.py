from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .models import Hero, LoadedData, Role, TeamupEffect


class DataLoadError(ValueError):
    """Raised when data files cannot be parsed into the expected shape."""


def _read_json(path: Path) -> dict[str, Any]:
    try:
        with path.open(encoding="utf-8") as handle:
            data = json.load(handle)
    except FileNotFoundError as exc:
        raise DataLoadError(f"Missing data file: {path}") from exc
    except json.JSONDecodeError as exc:
        raise DataLoadError(f"Invalid JSON in {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise DataLoadError(f"Expected top-level JSON object in {path}")
    return data


def load_heroes(path: Path) -> tuple[str, list[Hero]]:
    data = _read_json(path)
    patch_version = data.get("patch_version")
    raw_heroes = data.get("heroes")
    if not isinstance(patch_version, str) or not patch_version.strip():
        raise DataLoadError(f"{path} must contain a non-empty patch_version")
    if not isinstance(raw_heroes, list):
        raise DataLoadError(f"{path} must contain a heroes list")

    heroes: list[Hero] = []
    for index, item in enumerate(raw_heroes, start=1):
        if not isinstance(item, dict):
            raise DataLoadError(f"Hero entry #{index} in {path} must be an object")
        name = item.get("name")
        role_value = item.get("role")
        if not isinstance(name, str) or not name.strip():
            raise DataLoadError(f"Hero entry #{index} in {path} has an empty name")
        try:
            role = Role(role_value)
        except ValueError as exc:
            raise DataLoadError(f"Unknown role for hero {name!r}: {role_value!r}") from exc
        raw_roles = item.get("roles")
        roles: frozenset[Role] | None = None
        if raw_roles is not None:
            if not isinstance(raw_roles, list) or not raw_roles:
                raise DataLoadError(f"Hero {name!r} has an invalid roles list")
            parsed_roles: list[Role] = []
            for raw_role in raw_roles:
                try:
                    parsed_roles.append(Role(raw_role))
                except ValueError as exc:
                    raise DataLoadError(
                        f"Unknown eligible role for hero {name!r}: {raw_role!r}"
                    ) from exc
            roles = frozenset(parsed_roles)
            if role not in roles:
                raise DataLoadError(f"Hero {name!r} primary role must be included in roles")
        active = item.get("active", True)
        if not isinstance(active, bool):
            raise DataLoadError(f"Hero entry #{index} in {path} has a non-boolean active value")
        heroes.append(Hero(name=name, role=role, active=active, roles=roles))
    return patch_version, heroes


def load_teamups(path: Path) -> tuple[str, dict[str, frozenset[str]]]:
    data = _read_json(path)
    patch_version = data.get("patch_version")
    raw_teamups = data.get("teamups")
    if not isinstance(patch_version, str) or not patch_version.strip():
        raise DataLoadError(f"{path} must contain a non-empty patch_version")
    if not isinstance(raw_teamups, dict):
        raise DataLoadError(f"{path} must contain a teamups object")

    teamups: dict[str, frozenset[str]] = {}
    for hero, partners in raw_teamups.items():
        if not isinstance(hero, str) or not hero.strip():
            raise DataLoadError(f"{path} contains an empty Team-Up map hero name")
        if not isinstance(partners, list):
            raise DataLoadError(f"Team-Up partners for {hero!r} must be a list")
        parsed: list[str] = []
        for partner in partners:
            if not isinstance(partner, str) or not partner.strip():
                raise DataLoadError(f"Team-Up partner for {hero!r} must be a non-empty string")
            parsed.append(partner)
        teamups[hero] = frozenset(parsed)
    return patch_version, teamups


def _nullable_string(value: object, field: str, hero: str, partner: str) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise DataLoadError(f"{field} for {hero!r} / {partner!r} must be a string or null")
    return value


def load_teamup_effects(path: Path) -> tuple[str, dict[str, tuple[TeamupEffect, ...]]]:
    data = _read_json(path)
    patch_version = data.get("patch_version")
    raw_effects = data.get("effects")
    if not isinstance(patch_version, str) or not patch_version.strip():
        raise DataLoadError(f"{path} must contain a non-empty patch_version")
    if not isinstance(raw_effects, dict):
        raise DataLoadError(f"{path} must contain an effects object")

    effects: dict[str, tuple[TeamupEffect, ...]] = {}
    for hero, entries in raw_effects.items():
        if not isinstance(hero, str) or not hero.strip():
            raise DataLoadError(f"{path} contains an empty Team-Up effect hero name")
        if not isinstance(entries, list):
            raise DataLoadError(f"Team-Up effects for {hero!r} must be a list")
        parsed: list[TeamupEffect] = []
        for index, entry in enumerate(entries, start=1):
            if not isinstance(entry, dict):
                raise DataLoadError(f"Effect entry #{index} for {hero!r} must be an object")
            partner = entry.get("partner")
            if not isinstance(partner, str) or not partner.strip():
                raise DataLoadError(f"Effect entry #{index} for {hero!r} has an empty partner")
            status = entry.get("verification_status")
            if not isinstance(status, str) or not status.strip():
                raise DataLoadError(f"Effect entry #{index} for {hero!r} has an empty verification_status")
            parsed.append(
                TeamupEffect(
                    partner=partner,
                    ability_name=_nullable_string(entry.get("ability_name"), "ability_name", hero, partner),
                    base_effect=_nullable_string(entry.get("base_effect"), "base_effect", hero, partner),
                    enhanced_effect=_nullable_string(entry.get("enhanced_effect"), "enhanced_effect", hero, partner),
                    source_url=_nullable_string(entry.get("source_url"), "source_url", hero, partner),
                    verification_status=status,
                )
            )
        effects[hero] = tuple(parsed)
    return patch_version, effects


def load_data(data_dir: Path) -> LoadedData:
    heroes_patch, heroes = load_heroes(data_dir / "heroes.json")
    teamups_patch, teamups = load_teamups(data_dir / "teamups.json")
    if heroes_patch != teamups_patch:
        raise DataLoadError(
            f"Patch-version mismatch: heroes.json={heroes_patch!r}, teamups.json={teamups_patch!r}"
        )
    return LoadedData(
        patch_version=heroes_patch,
        heroes_by_name={hero.name: hero for hero in heroes},
        teamup_partners=teamups,
    )
