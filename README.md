# Marvel Rivals Team-Up Generator

This project generates every six-hero Marvel Rivals team where every hero has at least one enhanced Team-Up partner present.

## Unofficial Project Notice

This is an unofficial fan-made tool and is not affiliated with, endorsed by, sponsored by, or approved by Marvel, NetEase, or Marvel Rivals. Marvel Rivals, Marvel, character names, and related marks belong to their respective owners.

See [COPYRIGHT_RISK.md](COPYRIGHT_RISK.md) for the project copyright and trademark risk notes.

## Fully Enhanced Rule

A hero has two directional Team-Up abilities in the Season 9 system, and only one can be equipped at a time. A hero is counted as enhanced when at least one matching partner for one of those two abilities is present on the same team. The mapping is directional: if `Hero A` lists `Hero B`, that enhances `Hero A`; it does not automatically enhance `Hero B`.

The generator checks every six-hero combination, not permutations, and outputs both unrestricted teams and exact `2 Vanguard / 2 Duelist / 2 Strategist` teams.

## Current Dataset

- Patch: `20260710-season-9`
- Patch date: `2026-07-10`
- Active heroes generated: `52`
- Fully enhanced unrestricted combinations: `247`
- Fully enhanced 2-2-2 combinations: `28`
- Old reference count match (`247` unrestricted / `28` 2-2-2): `true` / `true`
- Main official source: <https://www.marvelrivals.com/20260708/41525_1306959.html>
- Pairing source: <https://allthings.how/marvel-rivals-season-9-how-the-reworked-team-up-system-works/>
- Cross-checks: FandomWire role guides and Mobalytics Season 9 Team-Ups overview.

The Hood is listed as a Team-Up partner in Season 9 source tables before full independent live-roster details were consistently available. He is included as an inactive Vanguard so validation remains strict, but he is excluded from generated teams. Deadpool is listed with Duelist as his primary role and Strategist as an eligible 2-2-2 flex role.

## Setup

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

## Validate

```bash
python scripts/validate_data.py
```

Expected success format:

```text
Data validation passed.
Heroes: 53
Team-Up mappings: 53
Patch: 20260710-season-9
```

## Generate

```bash
python scripts/generate_teams.py --role-format both --format all --show-details
```

Refresh the static frontend data after regenerating outputs:

```bash
python scripts/sync_frontend_data.py
```

Optional count regression comparison:

```bash
python scripts/generate_teams.py --expected-unrestricted 247 --expected-222 28 --fail-on-count-mismatch
```

Outputs are written to `output/`:

- `all_fully_enhanced_teams.csv`
- `all_fully_enhanced_teams.json`
- [all_fully_enhanced_teams.md](output/all_fully_enhanced_teams.md)
- `fully_enhanced_222_teams.csv`
- `fully_enhanced_222_teams.json`
- [fully_enhanced_222_teams.md](output/fully_enhanced_222_teams.md)
- `summary.json`

## Frontend

The static browser lives in [docs/index.html](docs/index.html). It loads committed JSON from `docs/data/`, displays the current patch and generated counts, lets users include or exclude selected heroes from unrestricted or `2-2-2` teams, and includes a hero detail panel with Team-Up partners, usage counts, best teammates, and sample teams. A header tab opens a separate Team Builder view for manually checking 1-6 selected heroes.

Team Builder uses the generated output JSON as the source of truth. It shows whether a partial draft can become fully enhanced, which selected heroes are currently enhanced, which selected heroes are missing partners, suggested heroes to complete the draft, and matching full teams. Builder links can be shared with query parameters such as:

```text
http://localhost:8000/docs/?builder=Deadpool,Hela,Venom&builderMode=222
```

Local preview:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/docs/
```

For GitHub Pages, set the Pages source to the repository branch and `/docs` folder.

## Compare Patches

```bash
python scripts/compare_patch_results.py --old-data-dir path/to/old/data --new-data-dir data
```

Use `--format json` for machine-readable comparison output.

## Tests

```bash
pytest
```

## Updating For A Future Patch

1. Review official patch notes and official hero or Team-Up pages first.
2. Use `python scripts/fetch_teamup_data.py` only to cache source snapshots for manual review.
3. Update `data/heroes.json`, `data/teamups.json`, and `data/metadata.json` together.
4. Run validation and tests.
5. Generate outputs and compare counts against the previous patch.

## Reference Counts

Community Season 9 calculations previously reported `247` unrestricted teams and `28` role-balanced teams. This project treats those as regression targets only. If the committed patch dataset differs, `output/summary.json` records the mismatch rather than changing source data to force old counts.
