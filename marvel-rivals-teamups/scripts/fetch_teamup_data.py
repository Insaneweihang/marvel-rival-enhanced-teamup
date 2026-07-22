from __future__ import annotations

import argparse
import sys
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]

SOURCES = [
    "https://www.marvelrivals.com/20260708/41525_1306959.html",
    "https://allthings.how/marvel-rivals-season-9-how-the-reworked-team-up-system-works/",
]


def fetch(url: str, cache_dir: Path) -> None:
    request = Request(url, headers={"User-Agent": "marvel-rivals-teamups/0.1 data-audit"})
    with urlopen(request, timeout=15) as response:
        body = response.read()
    safe_name = url.replace("https://", "").replace("/", "_").replace("?", "_")
    (cache_dir / f"{safe_name}.html").write_bytes(body)


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch source snapshots for manual Team-Up updates.")
    parser.add_argument("--cache-dir", type=Path, default=ROOT / ".cache" / "sources")
    args = parser.parse_args()
    args.cache_dir.mkdir(parents=True, exist_ok=True)

    failures: list[str] = []
    for url in SOURCES:
        try:
            fetch(url, args.cache_dir)
            print(f"Fetched {url}")
        except URLError as exc:
            failures.append(f"{url}: {exc}")

    template = (
        "Automatic extraction is intentionally not used for production data because current source pages "
        "mix static prose with client-rendered tables. Review cached snapshots, update "
        "data/heroes.proposed.json and data/teamups.proposed.json manually, then run validation."
    )
    print(template)
    if failures:
        print("Fetch failures:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

