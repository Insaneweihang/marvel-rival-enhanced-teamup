# Codex Task: Marvel Rivals Fully Enhanced Team-Up Generator

## Objective

Build a complete, reproducible set of scripts that generates every six-hero Marvel Rivals team in which all six heroes can activate an enhanced Team-Up ability under the latest live patch.

The project must:

1. Obtain or encode the latest Team-Up partner relationships.
2. Model Team-Up relationships correctly as directional relationships.
3. Generate every possible six-hero team.
4. Identify teams where every hero has at least one valid enhancement partner present.
5. Generate both:
   - unrestricted six-hero teams;
   - role-balanced `2 Vanguard / 2 Duelist / 2 Strategist` teams.
6. Export human-readable and machine-readable results.
7. Include tests and data-validation checks.
8. Record the exact patch and source information used.

Do not hardcode the final result list. The results must be derived from the hero and Team-Up datasets.

---

## Important Rule Interpretation

For each hero:

- The hero has two possible Team-Up enhancement partners.
- A hero is considered enhanced when at least one corresponding partner is present in the same six-hero team.
- The relationship must be treated as directional.

Example:

```python
TEAMUP_PARTNERS = {
    "Hero A": {"Hero B", "Hero C"},
}
```

This means Hero A can be enhanced by Hero B or Hero C.

It does not automatically mean Hero B is enhanced by Hero A.

A six-hero team is fully enhanced when:

```python
for every hero in team:
    at least one TEAMUP_PARTNERS[hero] is also in team
```

Do not require both partners to be present.

---

## Current Expected Reference Counts

Previous community calculations for the relevant Season 9 Team-Up system reported:

- `247` fully enhanced unrestricted six-hero teams;
- `28` fully enhanced `2-2-2` teams.

Treat these as regression targets, not unquestionable truth.

The scripts must derive the counts independently from the latest verified dataset. If the latest patch changed Team-Up relationships, the output may differ. Clearly report the difference rather than altering data merely to force the old counts.

---

## Source Requirements

Use authoritative sources wherever possible.

Preferred source order:

1. Official Marvel Rivals patch notes.
2. Official Marvel Rivals Team-Up or hero pages.
3. Reliable current game-data or guide sites.
4. Community datasets only as a secondary cross-check.

Record the following in a metadata file:

```json
{
  "game": "Marvel Rivals",
  "patch_version": "...",
  "patch_date": "YYYY-MM-DD",
  "data_retrieved_at": "ISO-8601 timestamp",
  "sources": [
    {
      "name": "...",
      "url": "...",
      "purpose": "..."
    }
  ]
}
```

Do not silently combine data from different patches.

If automatic scraping is unreliable, provide a manually maintained data file with citations and clear update instructions.

---

## Repository Structure

Create the following structure:

```text
marvel-rivals-teamups/
├── README.md
├── pyproject.toml
├── requirements.txt
├── data/
│   ├── heroes.json
│   ├── teamups.json
│   └── metadata.json
├── scripts/
│   ├── fetch_teamup_data.py
│   ├── validate_data.py
│   ├── generate_teams.py
│   └── compare_patch_results.py
├── src/
│   └── marvel_teamups/
│       ├── __init__.py
│       ├── models.py
│       ├── loader.py
│       ├── validator.py
│       ├── generator.py
│       └── exporters.py
├── tests/
│   ├── test_loader.py
│   ├── test_validator.py
│   ├── test_generator.py
│   └── fixtures/
│       ├── heroes_fixture.json
│       └── teamups_fixture.json
└── output/
    └── .gitkeep
```

Use Python 3.11 or newer.

---

## Data Formats

### `data/heroes.json`

Store every hero and role.

```json
{
  "patch_version": "PATCH_VERSION",
  "heroes": [
    {
      "name": "Example Hero",
      "role": "Vanguard"
    }
  ]
}
```

Allowed roles:

```text
Vanguard
Duelist
Strategist
```

Hero names must use one canonical spelling throughout the project.

### `data/teamups.json`

Store each hero's two directional enhancement partners.

```json
{
  "patch_version": "PATCH_VERSION",
  "teamups": {
    "Example Hero": [
      "Partner One",
      "Partner Two"
    ]
  }
}
```

Each hero should normally have exactly two partners under this system.

Do not use an undirected edge list unless it is converted into the directional mapping before generation.

---

## Core Data Models

Use typed models, preferably dataclasses.

Suggested model:

```python
from dataclasses import dataclass
from enum import StrEnum


class Role(StrEnum):
    VANGUARD = "Vanguard"
    DUELIST = "Duelist"
    STRATEGIST = "Strategist"


@dataclass(frozen=True)
class Hero:
    name: str
    role: Role
```

The application should maintain:

```python
heroes_by_name: dict[str, Hero]
teamup_partners: dict[str, frozenset[str]]
```

---

## Validation Requirements

Implement `scripts/validate_data.py`.

The validator must detect and clearly report:

1. Duplicate hero names.
2. Unknown role values.
3. Heroes missing from the Team-Up map.
4. Team-Up map entries for unknown heroes.
5. Partners that are not valid heroes.
6. Self-references.
7. Duplicate partners.
8. Heroes with something other than exactly two partners.
9. Patch-version mismatch between data files.
10. Empty or whitespace-only names.
11. Inconsistent punctuation or spelling where detectable.
12. Case-insensitive duplicate names.
13. Duplicate normalized names such as:
    - `Star Lord`
    - `Star-Lord`
14. Heroes with no possible enhancement path.
15. Any parsing or schema error.

The script must exit with a non-zero status when validation fails.

Example:

```bash
python scripts/validate_data.py
```

Expected success output:

```text
Data validation passed.
Heroes: 50
Team-Up mappings: 50
Patch: 2026XXXX
```

---

## Team Generation Algorithm

Implement the main logic in:

```text
src/marvel_teamups/generator.py
```

Required functions:

```python
def active_partners(
    hero: str,
    team: frozenset[str],
    teamup_partners: dict[str, frozenset[str]],
) -> frozenset[str]:
    ...
```

```python
def is_fully_enhanced(
    team: tuple[str, ...],
    teamup_partners: dict[str, frozenset[str]],
) -> bool:
    ...
```

```python
def generate_fully_enhanced_teams(
    hero_names: list[str],
    teamup_partners: dict[str, frozenset[str]],
    team_size: int = 6,
) -> list[tuple[str, ...]]:
    ...
```

```python
def has_role_distribution(
    team: tuple[str, ...],
    heroes_by_name: dict[str, Hero],
    required: dict[Role, int],
) -> bool:
    ...
```

The fully enhanced check should be logically equivalent to:

```python
def is_fully_enhanced(team, teamup_partners):
    team_set = frozenset(team)

    return all(
        bool(teamup_partners[hero] & (team_set - {hero}))
        for hero in team
    )
```

Generate combinations with:

```python
itertools.combinations(sorted(hero_names), 6)
```

Do not generate permutations.

Ensure output ordering is deterministic.

---

## Command-Line Interface

Implement:

```bash
python scripts/generate_teams.py
```

Supported options:

```text
--data-dir PATH
--output-dir PATH
--team-size INTEGER
--role-format unrestricted|222|both
--hero HERO_NAME
--exclude-hero HERO_NAME
--format csv|json|md|all
--show-details
--expected-unrestricted INTEGER
--expected-222 INTEGER
--fail-on-count-mismatch
```

Examples:

```bash
python scripts/generate_teams.py \
  --role-format both \
  --format all \
  --show-details
```

```bash
python scripts/generate_teams.py \
  --hero "Psylocke" \
  --role-format unrestricted \
  --format csv
```

```bash
python scripts/generate_teams.py \
  --expected-unrestricted 247 \
  --expected-222 28 \
  --fail-on-count-mismatch
```

The CLI must display:

```text
Patch version: ...
Heroes loaded: ...
Total six-hero combinations checked: ...
Fully enhanced unrestricted teams: ...
Fully enhanced 2-2-2 teams: ...
Output directory: ...
```

---

## Required Outputs

Generate the following files:

```text
output/all_fully_enhanced_teams.csv
output/all_fully_enhanced_teams.json
output/all_fully_enhanced_teams.md
output/fully_enhanced_222_teams.csv
output/fully_enhanced_222_teams.json
output/fully_enhanced_222_teams.md
output/summary.json
```

### CSV Format

Unrestricted CSV:

```text
team_number,hero_1,hero_2,hero_3,hero_4,hero_5,hero_6,enhancement_details
```

The enhancement details should show the active partner or partners for every hero.

Example:

```text
Hero A <- Hero B; Hero B <- Hero C; ...
```

The 2-2-2 CSV should additionally include clear role columns:

```text
team_number,vanguard_1,vanguard_2,duelist_1,duelist_2,strategist_1,strategist_2,enhancement_details
```

### JSON Format

Use structured JSON:

```json
{
  "patch_version": "...",
  "team_count": 247,
  "teams": [
    {
      "team_number": 1,
      "heroes": [
        {
          "name": "Hero A",
          "role": "Vanguard",
          "active_partners": [
            "Hero B"
          ]
        }
      ]
    }
  ]
}
```

### Markdown Format

Produce a readable table.

For unrestricted output:

```markdown
| # | Heroes | Enhancement paths |
|---:|---|---|
```

For 2-2-2 output:

```markdown
| # | Vanguards | Duelists | Strategists | Enhancement paths |
|---:|---|---|---|---|
```

### Summary Format

`output/summary.json` should include:

```json
{
  "patch_version": "...",
  "hero_count": 0,
  "team_size": 6,
  "total_combinations_checked": 0,
  "fully_enhanced_unrestricted_count": 0,
  "fully_enhanced_222_count": 0,
  "expected_counts": {
    "unrestricted": 247,
    "222": 28
  },
  "count_match": {
    "unrestricted": true,
    "222": true
  }
}
```

---

## Enhancement Details

For every generated team, include why each hero qualifies.

Example internal representation:

```python
{
    "Hero A": ["Hero B"],
    "Hero B": ["Hero C", "Hero D"],
    "Hero C": ["Hero A"],
}
```

A team must never be output merely because the overall team contains some Team-Up pairs. Every one of the six heroes must independently qualify.

---

## Role-Balanced Logic

A `2-2-2` team must contain exactly:

```python
{
    Role.VANGUARD: 2,
    Role.DUELIST: 2,
    Role.STRATEGIST: 2,
}
```

Do not assume the heroes appear in role order when generated.

Sort heroes into role-specific output columns when exporting the 2-2-2 files.

---

## Tests

Use `pytest`.

Required test coverage:

### Data loader tests

- Valid files load correctly.
- Missing file fails clearly.
- Invalid JSON fails clearly.
- Patch mismatch is detected.
- Unknown role is rejected.

### Validator tests

- Unknown partner is rejected.
- Self-partner is rejected.
- Duplicate normalized hero is rejected.
- Missing mapping is rejected.
- More or fewer than two partners is rejected.

### Generator tests

Create a small deterministic fixture graph.

Test that:

1. A valid fully enhanced team passes.
2. A team with one unenhanced hero fails.
3. A directional relationship is not treated as bidirectional.
4. Either partner is sufficient.
5. Both partners are not required.
6. Duplicate permutations are not produced.
7. Results are deterministically sorted.
8. The 2-2-2 filter works.
9. Hero inclusion filtering works.
10. Hero exclusion filtering works.

Example directional test:

```python
teamups = {
    "A": frozenset({"B", "C"}),
    "B": frozenset({"D", "E"}),
}
```

The presence of A must not automatically enhance B.

### Regression tests

When the dataset is for the patch associated with the old reference calculation:

```python
assert unrestricted_count == 247
assert role_222_count == 28
```

For newer patches, use metadata-based expected counts or mark count changes explicitly.

Do not force regression assertions for a patch with changed Team-Up relationships.

---

## Patch Comparison Script

Implement:

```bash
python scripts/compare_patch_results.py \
  --old-data-dir path/to/old/data \
  --new-data-dir data
```

The script should report:

1. Added heroes.
2. Removed heroes.
3. Role changes.
4. Added Team-Up relationships.
5. Removed Team-Up relationships.
6. Changed partner pairs.
7. Count difference for unrestricted teams.
8. Count difference for 2-2-2 teams.
9. Teams added.
10. Teams removed.

Support output as Markdown and JSON.

---

## Optional Fetch Script

Implement `scripts/fetch_teamup_data.py`.

Requirements:

- Fetch current source pages when feasible.
- Use a descriptive user agent.
- Use timeouts.
- Retry transient failures.
- Avoid aggressive scraping.
- Cache downloaded pages.
- Preserve raw source snapshots in a local ignored directory.
- Never silently overwrite validated data.
- Write proposed data to:
  - `data/heroes.proposed.json`
  - `data/teamups.proposed.json`
- Require validation before replacing production data.

If source pages are heavily JavaScript-rendered or structurally unstable, document that manual extraction is required and provide a clear template.

Do not fabricate missing relationships.

---

## README Requirements

The README must explain:

1. What “fully enhanced” means.
2. Why Team-Up mappings are directional.
3. Which patch the current dataset represents.
4. Data sources.
5. Setup steps.
6. Validation command.
7. Generation command.
8. Output formats.
9. How to update for a future patch.
10. How to compare patches.
11. Known limitations.
12. Whether the current result matches `247` and `28`.

Suggested setup:

```bash
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Install:

```bash
pip install -r requirements.txt
```

Validate:

```bash
python scripts/validate_data.py
```

Generate:

```bash
python scripts/generate_teams.py \
  --role-format both \
  --format all \
  --show-details
```

Test:

```bash
pytest
```

---

## Coding Quality Requirements

- Use type hints throughout.
- Use dataclasses or similarly clear typed models.
- Use `pathlib`.
- Add helpful docstrings.
- Do not use global mutable state for generated results.
- Keep loading, validation, generation, and exporting separate.
- Provide actionable error messages.
- Use deterministic sorting.
- Avoid unnecessary dependencies.
- Format with `ruff format` or Black-compatible formatting.
- Add a Ruff configuration.
- Target clear, maintainable code rather than clever code.
- Avoid network access during normal generation and tests.
- Make all output reproducible from committed data files.

---

## Acceptance Criteria

The task is complete when:

- [ ] The repository contains the requested structure.
- [ ] The latest patch and source URLs are recorded.
- [ ] Every current hero is present in `heroes.json`.
- [ ] Every hero has a validated Team-Up mapping.
- [ ] Directional relationships are handled correctly.
- [ ] Every six-hero combination is evaluated.
- [ ] Fully enhanced unrestricted teams are exported.
- [ ] Fully enhanced 2-2-2 teams are exported.
- [ ] Every output team includes enhancement reasoning.
- [ ] CSV, JSON, and Markdown outputs are generated.
- [ ] Data validation exits non-zero on invalid data.
- [ ] Tests pass.
- [ ] Results are deterministic.
- [ ] The README documents the update workflow.
- [ ] Old reference counts are compared but not forced onto a changed patch.
- [ ] No final team list is hardcoded.

---

## Final Codex Deliverables

At completion, Codex should provide:

1. A concise summary of what was implemented.
2. The patch version and source URLs used.
3. The number of heroes loaded.
4. The unrestricted result count.
5. The 2-2-2 result count.
6. Whether those counts match `247` and `28`.
7. Any uncertain or manually verified data.
8. The exact commands to validate, test, and generate outputs.
9. A list of all created files.
10. Any limitations or follow-up verification needed.

Start by inspecting the latest official patch notes and Team-Up data. Then create and validate the datasets before implementing the generator. Do not begin by copying the previously published 247 or 28 team lists.
