# Marvel Rivals Team-Up Generator

This project generates every six-hero Marvel Rivals team where every hero has at least one enhanced Team-Up partner present.

## Unofficial Project Notice

This is an unofficial fan-made tool and is not affiliated with, endorsed by, sponsored by, or approved by Marvel, NetEase, or Marvel Rivals. Marvel Rivals, Marvel, character names, and related marks belong to their respective owners.

See [COPYRIGHT_RISK.md](COPYRIGHT_RISK.md) for the project copyright and trademark risk notes.

## Fully Enhanced Rule

A hero has two directional Team-Up abilities in the Season 9 system, and only one can be equipped at a time. A hero is counted as enhanced when at least one matching partner for one of those two abilities is present on the same team. The mapping is directional: if `Hero A` lists `Hero B`, that enhances `Hero A`; it does not automatically enhance `Hero B`.

The generator checks every six-hero combination, not permutations, and outputs unrestricted teams plus supported Vanguard-Duelist-Strategist role composition filters.

## Current Dataset

- Patch: `20260710-season-9`
- Patch date: `2026-07-10`
- Active heroes generated: `52`
- Fully enhanced unrestricted combinations: `247`
- Fully enhanced 2-2-2 combinations: `28`
- Fully enhanced 1-3-2 combinations: `29`
- Fully enhanced 2-1-3 combinations: `7`
- Fully enhanced 1-2-3 combinations: `9`
- Fully enhanced 3-1-2 combinations: `10`
- Old reference count match (`247` unrestricted / `28` 2-2-2): `true` / `true`
- Main official source: <https://www.marvelrivals.com/20260708/41525_1306959.html>
- Pairing source: <https://allthings.how/marvel-rivals-season-9-how-the-reworked-team-up-system-works/>
- Cross-checks: FandomWire role guides and Mobalytics Season 9 Team-Ups overview.

The frontend supports multiple patch snapshots. Season 9 remains the default until
`docs/data/patches.json` is changed. Season 9.5 is stored separately under
`data/patches/20260807-season-9-5/` and `docs/data/patches/20260807-season-9-5/`.
The Season 9.5 snapshot activates The Hood as a Vanguard and uses the two
directional Team-Up links already represented in the source data. Its generated
counts are provisional until the live Season 9.5 Team-Up details are rechecked.

Provisional Season 9.5 counts: `587` unrestricted, `113` 2-2-2, `108` 1-3-2,
`45` 2-1-3, `91` 1-2-3, and `20` 3-1-2.

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
python scripts/sync_frontend_data.py --patch-id 20260710-season-9
python scripts/sync_frontend_data.py --patch-id 20260807-season-9-5 \
  --data-dir data/patches/20260807-season-9-5 \
  --output-dir output/20260807-season-9-5
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
- `fully_enhanced_132_teams.csv`
- `fully_enhanced_132_teams.json`
- [fully_enhanced_132_teams.md](output/fully_enhanced_132_teams.md)
- `fully_enhanced_213_teams.csv`
- `fully_enhanced_213_teams.json`
- [fully_enhanced_213_teams.md](output/fully_enhanced_213_teams.md)
- `fully_enhanced_123_teams.csv`
- `fully_enhanced_123_teams.json`
- [fully_enhanced_123_teams.md](output/fully_enhanced_123_teams.md)
- `fully_enhanced_312_teams.csv`
- `fully_enhanced_312_teams.json`
- [fully_enhanced_312_teams.md](output/fully_enhanced_312_teams.md)
- `summary.json`

## Frontend

The static browser lives in [docs/index.html](docs/index.html). It loads committed JSON from `docs/data/`, displays the current patch and generated counts, lets users include or exclude selected heroes from unrestricted or role-filtered teams (`2-2-2`, `1-3-2`, `2-1-3`, `1-2-3`, `3-1-2`), and includes a hero detail panel with Team-Up partners, usage counts, best teammates, and sample teams. A header tab opens a separate Team Builder view for manually checking 1-6 selected heroes.

Team-Up effect summaries live in `data/teamup_effects.json` and are copied to `docs/data/teamup_effects.json` for the frontend. This file records the ability name, base effect, enhanced effect, source URL, and verification status for each directional hero-partner pair. `verified_official` means the entry was checked against the official Marvel Rivals hero pages. It does not affect generated team counts; unverified entries are kept as `null` and marked `needs_verification`.

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
python scripts/compare_patch_results.py \
  --old-data-dir data/patches/20260710-season-9 \
  --new-data-dir data/patches/20260807-season-9-5
```

Use `--format json` for machine-readable comparison output.

## Tests

```bash
pytest
```

## Updating For A Future Patch

1. Review official patch notes and official hero or Team-Up pages first.
2. Use `python scripts/fetch_teamup_data.py` only to cache source snapshots for manual review.
3. Create a new folder under `data/patches/<patch-id>/` and update its
   `heroes.json`, `teamups.json`, `teamup_effects.json`, `hero_details.json`,
   and `metadata.json` together.
4. Run validation and tests.
5. Generate outputs into `output/<patch-id>/` and compare counts against the
   previous patch.
6. Sync the snapshot into `docs/data/patches/<patch-id>/` and add it to
   `docs/data/patches.json`.

## Reference Counts

Community Season 9 calculations previously reported `247` unrestricted teams and `28` role-balanced teams. This project treats those as regression targets only. If the committed patch dataset differs, `output/summary.json` records the mismatch rather than changing source data to force old counts.
