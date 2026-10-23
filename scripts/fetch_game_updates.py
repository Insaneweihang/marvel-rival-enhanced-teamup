#!/usr/bin/env python3
"""Build docs/data/game_updates.json from the official Marvel Rivals news feeds.

The Updates tab on the site is generated from this file. Output is deterministic
(sorted newest first, no fetch timestamp) so cron monitor hashes stay stable.

Sources:
  * Steam news RSS for Marvel Rivals (app 2767030) — carries titles + dates.
  * marvelrivals.com/news — used only as a cross-check/count in ``sources_checked``.

Usage:
    python scripts/fetch_game_updates.py            # write docs/data/game_updates.json
    python scripts/fetch_game_updates.py --dry-run  # print, do not write
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from datetime import date
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "data" / "game_updates.json"
STEAM_RSS = "https://store.steampowered.com/feeds/news/app/2767030/?cc=US&l=english"
OFFICIAL_NEWS = "https://www.marvelrivals.com/news/"
UA = "Mozilla/5.0 (compatible; marvel-rivals-updates/1.0; +https://insaneweihang.com)"
TIMEOUT = 25
MAX_ITEMS = 8

CATEGORY_RULES = (
    ("balance", ("balance post", "balance update")),
    ("patch", ("patch notes", "version 20")),
    ("dev", ("dev vision", "dev diary", "devdiaries", "art vision", "behind the scenes")),
)


def fetch(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        return response.read().decode("utf-8", errors="replace")


def cdata(block: str, tag: str) -> str:
    match = re.search(rf"<{tag}>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*</{tag}>", block, re.S)
    return re.sub(r"\s+", " ", match.group(1)).strip() if match else ""


def categorise(title: str) -> str:
    lowered = title.lower()
    for category, needles in CATEGORY_RULES:
        if any(needle in lowered for needle in needles):
            return category
    return "news"


def steam_items() -> list[dict[str, str]]:
    xml = fetch(STEAM_RSS)
    items: list[dict[str, str]] = []
    for block in re.findall(r"<item>(.*?)</item>", xml, re.S):
        title, link, published = cdata(block, "title"), cdata(block, "link"), cdata(block, "pubDate")
        if not title or not link:
            continue
        try:
            when = parsedate_to_datetime(published)
        except (TypeError, ValueError):
            continue
        slug = link.rstrip("/").rsplit("/", 1)[-1] or link
        items.append(
            {
                "id": slug,
                "date": when.date().isoformat(),
                "title": title,
                "category": categorise(title),
                "url": link,
            }
        )
    items.sort(key=lambda item: (item["date"], item["id"]), reverse=True)
    return items


def official_count() -> int:
    html = fetch(OFFICIAL_NEWS)
    return len(set(re.findall(r"/(?:gameupdate|balancepost|devdiaries|announcements)/20\d{6}/\d+_\d+\.html", html)))


def build() -> dict[str, object]:
    items = steam_items()[:MAX_ITEMS]
    try:
        checked = official_count()
    except (urllib.error.URLError, OSError):
        checked = 0
    return {
        "updated_at": items[0]["date"] if items else date.today().isoformat(),
        "source": "Steam news feed for Marvel Rivals (app 2767030)",
        "source_url": "https://store.steampowered.com/news/app/2767030/",
        "sources_checked": {
            "steam_rss_items": len(items),
            "official_news_links": checked,
        },
        "disclaimer": "Unofficial fan project. Headlines link to the official posts.",
        "items": items,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate docs/data/game_updates.json from official feeds.")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    try:
        payload = build()
    except (urllib.error.URLError, OSError, ValueError) as exc:
        print(f"Failed to build game updates: {exc.__class__.__name__}: {exc}", file=sys.stderr)
        return 1

    if not payload["items"]:
        print("No news items parsed; refusing to overwrite the committed feed.", file=sys.stderr)
        return 1

    text = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
    if args.dry_run:
        sys.stdout.write(text)
        return 0

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(text, encoding="utf-8")
    print(f"Wrote {args.output.relative_to(ROOT)} ({len(payload['items'])} items, newest {payload['updated_at']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
