# Marvel Rivals Team-Up Generator

This project generates every six-hero Marvel Rivals team where every hero has at least one enhanced Team-Up partner present.

## Unofficial Project Notice

This is an unofficial fan-made tool and is not affiliated with, endorsed by, sponsored by, or approved by Marvel, NetEase, or Marvel Rivals. Marvel Rivals, Marvel, character names, and related marks belong to their respective owners.

See [COPYRIGHT_RISK.md](COPYRIGHT_RISK.md) for the project copyright and trademark risk notes.

## Fully Enhanced Rule

A hero has two directional Team-Up abilities in the Season 9 system, and only one can be equipped at a time. A hero is counted as enhanced when at least one matching partner for one of those two abilities is present on the same team. The mapping is directional: if `Hero A` lists `Hero B`, that enhances `Hero A`; it does not automatically enhance `Hero B`.

The generator checks every six-hero combination, not permutations, and outputs unrestricted teams plus supported Vanguard-Duelist-Strategist role composition filters.

## Active Dataset

- Patch: `20260911-season-10`
- Patch date: `2026-09-11`
- Active heroes generated: `54`
- Fully enhanced unrestricted combinations: `416`
- Fully enhanced 2-2-2 combinations: `57`
- Fully enhanced 1-3-2 combinations: `75`
- Fully enhanced 2-1-3 combinations: `12`
- Fully enhanced 1-2-3 combinations: `38`
- Fully enhanced 3-1-2 combinations: `12`
- Main official source: <https://www.marvelrivals.com/m/gameupdate/20260909/41548_1313441.html>
- Team-Up source: <https://www.marvelrivals.com/heroes/teamup.html>
- Balance source: <https://www.marvelrivals.com/m/balancepost/20260908/41667_1313334.html>
- Cross-check: <https://rivalsdex.com/team-ups>.

The frontend supports multiple patch snapshots. Season 10 is now the default;
Season 9 and Season 9.5 remain available as archives. Season 10.5 is staged as
a disabled “Coming soon” snapshot until its release validation is complete.
Season 10 adds Gorr the God Butcher as a Duelist with directional links to Hela
and Venom.

Season 10 counts: `416` unrestricted, `57` 2-2-2, `75` 1-3-2,
`12` 2-1-3, `38` 1-2-3, and `12` 3-1-2.

The Hood source: <https://marvelrivals.gg/the-hood/>.

Season 9 (`20260710-season-9`) remains available as an archive with `247` unrestricted and `28` 2-2-2 teams. Deadpool is listed with Duelist as his primary role and Strategist as an eligible 2-2-2 flex role.

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
python scripts/validate_patch.py
```

`validate_patch.py` is the release gate for patch snapshots. It validates the
manifest, patch-version consistency, exactly two outgoing relationships per
hero, directional effect mappings, source-status fields, approved reciprocal
relationships, and reproducibility of all committed generated outputs.

Expected success format:

```text
Patch validation passed: 20260710-season-9, 20260807-season-9-5, 20260911-season-10, 20261009-season-10-5
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

For GitHub Pages, set the Pages source to `GitHub Actions`. The deployment
workflow publishes the existing HTML site at the root and the React preview
under `/react/`. The React build also exposes a creator hub, the Marvel Rivals
tool, and a directory for future tools:

```text
https://insaneweihang.com/
https://insaneweihang.com/react/
https://insaneweihang.com/react/marvel-rivals/
https://insaneweihang.com/react/tools/
```

The workflow preserves `docs/CNAME` at the root of the published artifact, so
the custom domain continues to point to the existing production site.

## React Migration

An incremental React/TypeScript frontend now lives in `frontend/`. It includes
the Team Browser, Team Planner with directional enhancement checks, saved
teams, Duo Planner pools, map reference filters, updates, feedback, analytics,
and shareable planner state. The existing `docs/` site remains the production
fallback while the React version is verified for feature parity.

Run the new frontend locally:

```bash
cd frontend
npm install
npm run dev
```

`npm run build` copies the validated static patch snapshots from `docs/data/`
into the frontend build output. The React app uses these committed snapshots
directly; no Node server or local database is required.

To preview the combined deployment locally after building React, assemble the
same directory layout and serve it from the repository root:

```bash
mkdir -p published/react
cp -R docs/. published/
cp -R frontend/dist/. published/react/
mkdir -p published/react/marvel-rivals published/react/tools
cp published/react/index.html published/react/marvel-rivals/index.html
cp published/react/index.html published/react/tools/index.html
python -m http.server 8000 --directory published
```

Then open `http://localhost:8000/` for the HTML version or
`http://localhost:8000/react/` for the creator hub. The planner and future
tools entry points are available at `/react/marvel-rivals/` and `/react/tools/`.

The React hub can optionally load the latest three YouTube videos through the
Worker in `cloudflare/creator-feed-worker/`. Configure its channel ID and
deploy it at `https://insaneweihang-creator-feed.insaneweihang.workers.dev/creator-feed`.
The frontend uses that Worker URL by default. A branded
`https://api.insaneweihang.com/creator-feed` route can be added later without
changing the React app.

The Python generator and patch validators remain the backend/data source. A
FastAPI service can be added later if server-side queries or cloud-saved user
data become necessary. Feedback remains on the existing Cloudflare Worker/D1
service during this migration.

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
4. Run `python scripts/validate_patch.py --patch-id <patch-id>` and the tests.
5. Generate outputs into `output/<patch-id>/` and compare counts against the
   previous patch.
6. Sync the snapshot into `docs/data/patches/<patch-id>/` and add it to
   `docs/data/patches.json`.
7. Set `available` to `true` only after the patch validation passes. Change
   `default_patch` only after the new snapshot is ready for release.

## Reference Counts

Community Season 9 calculations previously reported `247` unrestricted teams and `28` role-balanced teams. This project treats those as regression targets only. If the committed patch dataset differs, `output/summary.json` records the mismatch rather than changing source data to force old counts.
