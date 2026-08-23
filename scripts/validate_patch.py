from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT / "scripts"))

from marvel_teamups.loader import DataLoadError, load_heroes, load_teamup_effects, load_teamups
from marvel_teamups.validator import validate_dataset
from validate_data import validate_hero_details

REQUIRED_DATA_FILES = (
    "metadata.json",
    "heroes.json",
    "teamups.json",
    "teamup_effects.json",
    "hero_details.json",
)
GENERATED_FILES = (
    "summary.json",
    "all_fully_enhanced_teams.csv",
    "all_fully_enhanced_teams.json",
    "all_fully_enhanced_teams.md",
    "fully_enhanced_222_teams.csv",
    "fully_enhanced_222_teams.json",
    "fully_enhanced_222_teams.md",
    "fully_enhanced_132_teams.csv",
    "fully_enhanced_132_teams.json",
    "fully_enhanced_132_teams.md",
    "fully_enhanced_213_teams.csv",
    "fully_enhanced_213_teams.json",
    "fully_enhanced_213_teams.md",
    "fully_enhanced_123_teams.csv",
    "fully_enhanced_123_teams.json",
    "fully_enhanced_123_teams.md",
    "fully_enhanced_312_teams.csv",
    "fully_enhanced_312_teams.json",
    "fully_enhanced_312_teams.md",
)
ALLOWED_VERIFICATION_STATUSES = {
    "verified_official",
    "verified_secondary",
    "needs_verification",
}


def read_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except FileNotFoundError as exc:
        raise ValueError(f"Missing JSON file: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in {path}: {exc}") from exc


def reciprocal_pairs(teamups: dict[str, list[str]]) -> set[tuple[str, str]]:
    return {
        tuple(sorted((hero, partner)))
        for hero, partners in teamups.items()
        for partner in partners
        if hero != partner and hero in teamups.get(partner, [])
    }


def allowed_reciprocal_pairs(metadata: dict) -> set[tuple[str, str]]:
    raw_pairs = metadata.get("allowed_reciprocal_teamups", [])
    if not isinstance(raw_pairs, list):
        raise ValueError("metadata.json allowed_reciprocal_teamups must be a list")
    pairs: set[tuple[str, str]] = set()
    for pair in raw_pairs:
        if not isinstance(pair, list) or len(pair) != 2 or not all(isinstance(item, str) for item in pair):
            raise ValueError("metadata.json contains an invalid reciprocal Team-Up pair")
        pairs.add(tuple(sorted(pair)))
    return pairs


def validate_sources(effects: dict[str, list[dict]]) -> list[str]:
    errors: list[str] = []
    for hero, entries in effects.items():
        for entry in entries:
            partner = entry.get("partner", "?")
            status = entry.get("verification_status")
            if status not in ALLOWED_VERIFICATION_STATUSES:
                errors.append(f"{hero} / {partner} has invalid verification status: {status!r}")
                continue
            if status == "needs_verification":
                continue
            for field in ("source_url", "base_effect", "enhanced_effect"):
                if not entry.get(field):
                    errors.append(f"{hero} / {partner} {status} entry is missing {field}")
    return errors


def canonical_team_payload(payload: dict) -> dict:
    teams = []
    for team in payload.get("teams", []):
        heroes = []
        for hero in team.get("heroes", []):
            normalized = dict(hero)
            normalized["eligible_roles"] = sorted(normalized.get("eligible_roles", []))
            normalized["active_partners"] = sorted(normalized.get("active_partners", []))
            heroes.append(normalized)
        teams.append({**team, "heroes": sorted(heroes, key=lambda item: item.get("name", ""))})
    return {
        key: value
        for key, value in payload.items()
        if key != "teams"
    } | {"teams": sorted(teams, key=lambda item: item.get("team_number", 0))}


def compare_json_output(committed: Path, regenerated: Path) -> bool:
    try:
        committed_payload = json.loads(committed.read_text(encoding="utf-8-sig"))
        regenerated_payload = json.loads(regenerated.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError:
        return committed.read_bytes() == regenerated.read_bytes()
    if "teams" in committed_payload or "teams" in regenerated_payload:
        return canonical_team_payload(committed_payload) == canonical_team_payload(regenerated_payload)
    return committed_payload == regenerated_payload


def validate_generated_outputs(data_dir: Path, output_dir: Path, patch_id: str) -> list[str]:
    errors: list[str] = []
    missing = [name for name in GENERATED_FILES if not (output_dir / name).exists()]
    if missing:
        return [f"{patch_id} is missing generated output(s): {', '.join(missing)}"]

    with tempfile.TemporaryDirectory(prefix=f"validate-{patch_id}-") as temp_dir:
        regenerated_dir = Path(temp_dir)
        command = [
            sys.executable,
            str(ROOT / "scripts" / "generate_teams.py"),
            "--data-dir",
            str(data_dir),
            "--output-dir",
            str(regenerated_dir),
            "--role-format",
            "both",
            "--format",
            "all",
        ]
        committed_summary = read_json(output_dir / "summary.json")
        expected_counts = committed_summary.get("expected_counts", {})
        if isinstance(expected_counts, dict):
            expected_unrestricted = expected_counts.get("unrestricted")
            expected_222 = expected_counts.get("222")
            if isinstance(expected_unrestricted, int):
                command.extend(["--expected-unrestricted", str(expected_unrestricted)])
            if isinstance(expected_222, int):
                command.extend(["--expected-222", str(expected_222)])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
        if result.returncode != 0:
            return [f"{patch_id} generation failed:\n{result.stderr.strip() or result.stdout.strip()}"]
        for name in GENERATED_FILES:
            committed = output_dir / name
            regenerated = regenerated_dir / name
            if not regenerated.exists():
                errors.append(f"{patch_id} regeneration did not produce {name}")
            elif name.endswith(".json") and not compare_json_output(committed, regenerated):
                errors.append(f"{patch_id} generated output is not reproducible: {name}")
    return errors


def validate_patch(patch: dict, require_reproducible: bool = True) -> list[str]:
    patch_id = patch.get("id")
    if not isinstance(patch_id, str) or not patch_id:
        return ["Patch manifest contains an entry without a valid id"]
    data_path = ROOT / str(patch.get("data_path", ""))
    output_path = ROOT / "output" / patch_id
    errors: list[str] = []
    for name in REQUIRED_DATA_FILES:
        if not (data_path / name).exists():
            errors.append(f"{patch_id} is missing data file: {name}")
    if errors:
        return errors

    metadata = read_json(data_path / "metadata.json")
    if metadata.get("patch_version") != patch_id:
        errors.append(f"{patch_id} metadata patch_version does not match manifest id")

    try:
        heroes_patch, heroes = load_heroes(data_path / "heroes.json")
        teamups_patch, teamups = load_teamups(data_path / "teamups.json")
        effects_patch, effects = load_teamup_effects(data_path / "teamup_effects.json")
    except DataLoadError as exc:
        return [f"{patch_id}: {exc}"]

    result = validate_dataset(heroes, teamups, heroes_patch, teamups_patch, effects, effects_patch)
    errors.extend(result.errors)
    errors.extend(validate_hero_details(data_path, heroes, teamups, heroes_patch))
    raw_effects = read_json(data_path / "teamup_effects.json").get("effects", {})
    errors.extend(validate_sources(raw_effects))

    declared_pairs = reciprocal_pairs({hero: sorted(partners) for hero, partners in teamups.items()})
    try:
        approved_pairs = allowed_reciprocal_pairs(metadata)
    except ValueError as exc:
        errors.append(str(exc))
        approved_pairs = set()
    unexpected_pairs = declared_pairs - approved_pairs
    errors.extend(
        f"{patch_id} has undeclared reciprocal Team-Up pair: {a} <-> {b}"
        for a, b in sorted(unexpected_pairs)
    )

    if require_reproducible:
        errors.extend(validate_generated_outputs(data_path, output_path, patch_id))
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate a Marvel Rivals patch snapshot and outputs.")
    parser.add_argument("--patch-id", help="Validate one patch; omit to validate every manifest patch")
    parser.add_argument("--manifest", type=Path, default=ROOT / "docs" / "data" / "patches.json")
    parser.add_argument("--skip-reproducibility", action="store_true")
    args = parser.parse_args()

    try:
        manifest = read_json(args.manifest)
        patches = manifest.get("patches", [])
        if not isinstance(patches, list):
            raise ValueError("patches.json must contain a patches list")
        selected = [patch for patch in patches if args.patch_id is None or patch.get("id") == args.patch_id]
        if not selected:
            raise ValueError(f"Patch not found: {args.patch_id}")
        default_id = manifest.get("default_patch")
        default_patch = next((patch for patch in patches if patch.get("id") == default_id), None)
        if not default_patch:
            raise ValueError(f"Default patch is not listed in the manifest: {default_id}")
        if default_patch.get("available") is False:
            raise ValueError(f"Default patch is unavailable: {default_id}")
        errors = []
        for patch in selected:
            errors.extend(validate_patch(patch, not args.skip_reproducibility))
    except ValueError as exc:
        print(f"Patch validation failed:\n- {exc}", file=sys.stderr)
        return 1

    if errors:
        print("Patch validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print(f"Patch validation passed: {', '.join(patch['id'] for patch in selected)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
