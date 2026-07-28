from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass

from .models import Hero, TeamupEffect


@dataclass(frozen=True)
class ValidationResult:
    errors: tuple[str, ...]
    warnings: tuple[str, ...] = ()

    @property
    def ok(self) -> bool:
        return not self.errors


def normalized_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", name.casefold())


def validate_dataset(
    heroes: list[Hero],
    teamup_partners: dict[str, frozenset[str]],
    heroes_patch_version: str,
    teamups_patch_version: str,
    teamup_effects: dict[str, tuple[TeamupEffect, ...]] | None = None,
    teamup_effects_patch_version: str | None = None,
) -> ValidationResult:
    errors: list[str] = []
    warnings: list[str] = []
    hero_names = [hero.name for hero in heroes]
    hero_set = set(hero_names)

    for name in hero_names:
        if not name.strip():
            errors.append("Hero names must not be empty or whitespace-only")

    duplicates = [name for name, count in Counter(hero_names).items() if count > 1]
    for name in sorted(duplicates):
        errors.append(f"Duplicate hero name: {name}")

    case_groups: dict[str, list[str]] = {}
    normalized_groups: dict[str, list[str]] = {}
    for name in hero_names:
        case_groups.setdefault(name.casefold(), []).append(name)
        normalized_groups.setdefault(normalized_name(name), []).append(name)

    for names in case_groups.values():
        unique = sorted(set(names))
        if len(unique) > 1:
            errors.append(f"Case-insensitive duplicate hero names: {', '.join(unique)}")

    for names in normalized_groups.values():
        unique = sorted(set(names))
        if len(unique) > 1:
            errors.append(f"Duplicate normalized hero names: {', '.join(unique)}")

    if heroes_patch_version != teamups_patch_version:
        errors.append(
            f"Patch-version mismatch: heroes.json={heroes_patch_version!r}, "
            f"teamups.json={teamups_patch_version!r}"
        )
    if teamup_effects_patch_version is not None and heroes_patch_version != teamup_effects_patch_version:
        errors.append(
            f"Patch-version mismatch: heroes.json={heroes_patch_version!r}, "
            f"teamup_effects.json={teamup_effects_patch_version!r}"
        )

    missing_mappings = sorted(hero_set - set(teamup_partners))
    for name in missing_mappings:
        errors.append(f"Hero missing from Team-Up map: {name}")

    unknown_mappings = sorted(set(teamup_partners) - hero_set)
    for name in unknown_mappings:
        errors.append(f"Team-Up map entry for unknown hero: {name}")

    for hero, partners in sorted(teamup_partners.items()):
        if not hero.strip():
            errors.append("Team-Up map contains an empty hero name")
        if len(partners) != 2:
            errors.append(f"{hero} has {len(partners)} partners; expected exactly 2")
        if hero in partners:
            errors.append(f"{hero} has a self-reference")
        for partner in sorted(partners):
            if partner not in hero_set:
                errors.append(f"{hero} has unknown partner: {partner}")
            if normalized_name(partner) == normalized_name(hero) and partner != hero:
                warnings.append(f"{hero} has a suspiciously similar partner spelling: {partner}")
            if not partner.strip():
                errors.append(f"{hero} has an empty partner name")
        if not partners:
            errors.append(f"{hero} has no possible enhancement path")

    if teamup_effects is not None:
        missing_effects = sorted(set(teamup_partners) - set(teamup_effects))
        for name in missing_effects:
            errors.append(f"Hero missing from Team-Up effects: {name}")

        unknown_effects = sorted(set(teamup_effects) - hero_set)
        for name in unknown_effects:
            errors.append(f"Team-Up effects entry for unknown hero: {name}")

        for hero, entries in sorted(teamup_effects.items()):
            partners = teamup_partners.get(hero, frozenset())
            effect_partners = [entry.partner for entry in entries]
            duplicate_partners = [
                partner for partner, count in Counter(effect_partners).items() if count > 1
            ]
            if len(entries) != 2:
                errors.append(f"{hero} has {len(entries)} effect records; expected exactly 2")
            for partner in sorted(duplicate_partners):
                errors.append(f"{hero} has duplicate effect records for partner: {partner}")
            if set(effect_partners) != set(partners):
                errors.append(
                    f"{hero} effect partners do not match Team-Up partners: "
                    f"effects={', '.join(sorted(effect_partners))}; "
                    f"teamups={', '.join(sorted(partners))}"
                )
            for entry in entries:
                if entry.partner not in hero_set:
                    errors.append(f"{hero} has effect for unknown partner: {entry.partner}")
                if entry.verification_status == "needs_verification":
                    continue
                if not entry.source_url:
                    errors.append(f"{hero} / {entry.partner} verified effect is missing source_url")
                if not entry.base_effect or not entry.enhanced_effect:
                    errors.append(f"{hero} / {entry.partner} verified effect is missing effect text")

    return ValidationResult(tuple(errors), tuple(warnings))
