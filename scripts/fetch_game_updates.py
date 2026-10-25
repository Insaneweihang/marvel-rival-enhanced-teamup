#!/usr/bin/env python3
"""Build docs/data/game_updates.json from the official Marvel Rivals channels.

The Game Updates tab on both sites is rendered from this file. Output is
deterministic (newest first, no fetch timestamp) so the cron monitor hash stays
stable between runs that have no real news.

Sources (all official, all key-free):
  * marvelrivals.com/news — official news index: patch notes, balance posts,
    dev diaries and announcements. Canonical source for article posts.
  * Steam news RSS (app 2767030) — patch notes as published on Steam.
  * YouTube RSS for the official @MarvelRivals channel — trailers, cosmetics
    and dev videos.

X/Twitter is not included: the syndication endpoint rate-limits this host and
public Nitter mirrors are dead or return 451, so it cannot be fetched reliably
without a paid API key.

Cross-source duplicates (the same post mirrored on the site + Steam) are merged,
preferring the official site URL over Steam, and Steam over YouTube.

Usage:
    python scripts/fetch_game_updates.py            # write docs/data/game_updates.json
    python scripts/fetch_game_updates.py --dry-run  # print, do not write
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "data" / "game_updates.json"
OFFICIAL_NEWS = "https://www.marvelrivals.com/news/"
STEAM_RSS = "https://store.steampowered.com/feeds/news/app/2767030/?cc=US&l=english"
YOUTUBE_CHANNEL = "UCWzmOSSiSPbVnVu3ZAyDx2w"
YOUTUBE_RSS = f"https://www.youtube.com/feeds/videos.xml?channel_id={YOUTUBE_CHANNEL}"
YOUTUBE_URL = "https://www.youtube.com/@MarvelRivals"
UA = "Mozilla/5.0 (compatible; marvel-rivals-updates/1.1; +https://insaneweihang.com)"
TIMEOUT = 25
MAX_ITEMS = 12
# YouTube's Atom feed flaps hard (see fetch_resilient): 3 rounds x 8 parallel
# probes puts the per-run failure probability around 0.85^24, under 3%.
YOUTUBE_ROUNDS = 3
YOUTUBE_BURST = 8
# YouTube publishes esports VODs and streams alongside real update videos, and
# it would otherwise crowd out articles. Skip match footage, and cap how many
# videos can occupy the feed.
YOUTUBE_EXCLUDE = ("playoffs", " vs ", " vs.", "grand final", "group stage", "livestream", "watch party", "highlights")
SOURCE_CAPS = {"official": MAX_ITEMS, "steam": 4, "youtube": 4}

# Source preference when the same post appears in several feeds (lower wins).
SOURCE_PRIORITY = {"official": 0, "steam": 1, "youtube": 2}
SOURCE_LABELS = {"official": "Official site", "steam": "Steam", "youtube": "YouTube"}

CATEGORY_RULES = (
    ("balance", ("balance post", "balance update", "balance adjustment")),
    ("patch", ("patch notes", "version 20")),
    ("dev", ("dev vision", "dev diary", "devdiaries", "art vision", "behind the scenes", "developer")),
)

OFFICIAL_CATEGORY_MAP = {
    "gameupdate": "patch",
    "balancepost": "balance",
    "devdiaries": "dev",
    "announcements": "news",
}

OFFICIAL_CARD_RE = re.compile(
    r'<a href="(?P<url>https://www\.marvelrivals\.com/'
    r'(?P<section>gameupdate|balancepost|devdiaries|announcements)/'
    r'(?P<day>\d{8})/[^"]+)"[^>]*class="list-item"[^>]*>(?P<body>.*?)</a>',
    re.S,
)


def fetch(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        return response.read().decode("utf-8", errors="replace")


def fetch_resilient(url: str, *, rounds: int = YOUTUBE_ROUNDS, burst: int = YOUTUBE_BURST) -> str:
    """Fetch a flapping endpoint by firing a small concurrent burst per round.

    YouTube's RSS edge started answering 404/500 on the large majority of
    requests on 2026-10-23 (measured 11/60 successes, no correlation with
    User-Agent, hostname — www/bare/m.youtube — or cache-busting query params).
    A single request therefore fails ~85% of the time, which is what silently
    dropped every youtube item from the committed feed.

    Probes inside a round run in parallel, so the whole call still costs about
    one request's latency per round. Non-flapping sources keep using fetch().
    """
    last: Exception | None = None
    for _ in range(rounds):
        with ThreadPoolExecutor(max_workers=burst) as pool:
            futures = [pool.submit(fetch, url) for _ in range(burst)]
            for future in as_completed(futures):
                try:
                    return future.result()
                except (urllib.error.URLError, OSError, ValueError) as exc:
                    last = exc
        time.sleep(0.5)
    assert last is not None
    raise last


def tag_text(block: str, tag: str) -> str:
    match = re.search(rf"<{tag}>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*</{tag}>", block, re.S)
    if not match:
        return ""
    return re.sub(r"\s+", " ", html.unescape(match.group(1))).strip()


def categorise(title: str, default: str = "news") -> str:
    lowered = title.lower()
    for category, needles in CATEGORY_RULES:
        if any(needle in lowered for needle in needles):
            return category
    return default


def dedupe_key(title: str) -> str:
    """Collapse a title to a comparison key so mirrors of one post merge."""
    cleaned = title.lower()
    # Feeds append their own branding; YouTube in particular ships the same
    # video twice with "| #MarvelRivals" and "| Marvel Rivals".
    cleaned = re.sub(r"[\|\-–]\s*(#?marvel\s*rivals)\s*$", "", cleaned)
    cleaned = re.sub(r"[^a-z0-9]+", " ", cleaned).strip()
    return re.sub(r"\s+", " ", cleaned)


def make_item(*, slug: str, when: str, title: str, category: str, url: str, source: str) -> dict[str, str]:
    return {
        "id": f"{source}:{slug}",
        "date": when,
        "title": title,
        "category": category,
        "url": url,
        "source": source,
        "source_label": SOURCE_LABELS[source],
    }


def official_items() -> list[dict[str, str]]:
    page = fetch(OFFICIAL_NEWS)
    items: list[dict[str, str]] = []
    for match in OFFICIAL_CARD_RE.finditer(page):
        url = match.group("url")
        section = match.group("section")
        day = match.group("day")
        title = tag_text(match.group("body"), "h2")
        if not title:
            continue
        category = OFFICIAL_CATEGORY_MAP.get(section, "news")
        if category == "patch" and "balance" in title.lower():
            category = "balance"
        items.append(
            make_item(
                slug=url.rstrip("/").rsplit("/", 1)[-1].removesuffix(".html"),
                when=f"{day[:4]}-{day[4:6]}-{day[6:8]}",
                title=title,
                category=category,
                url=url,
                source="official",
            )
        )
    return items


def steam_items() -> list[dict[str, str]]:
    xml = fetch(STEAM_RSS)
    items: list[dict[str, str]] = []
    for block in re.findall(r"<item>(.*?)</item>", xml, re.S):
        title, link, published = tag_text(block, "title"), tag_text(block, "link"), tag_text(block, "pubDate")
        if not title or not link:
            continue
        try:
            when = parsedate_to_datetime(published)
        except (TypeError, ValueError):
            continue
        items.append(
            make_item(
                slug=link.rstrip("/").rsplit("/", 1)[-1] or link,
                when=when.date().isoformat(),
                title=title,
                category=categorise(title),
                url=link,
                source="steam",
            )
        )
    return items


def youtube_items() -> list[dict[str, str]]:
    xml = fetch_resilient(YOUTUBE_RSS)
    items: list[dict[str, str]] = []
    for block in re.findall(r"<entry>(.*?)</entry>", xml, re.S):
        video_id = tag_text(block, "yt:videoId")
        title = tag_text(block, "title")
        published = tag_text(block, "published")
        if not video_id or not title or not published:
            continue
        lowered = title.lower()
        if any(needle in lowered for needle in YOUTUBE_EXCLUDE):
            continue
        items.append(
            make_item(
                slug=video_id,
                when=published[:10],
                title=title,
                category=categorise(title, default="video"),
                url=f"https://www.youtube.com/watch?v={video_id}",
                source="youtube",
            )
        )
    return items


def merge(groups: list[tuple[str, list[dict[str, str]]]]) -> list[dict[str, str]]:
    """Merge feeds, dropping mirrors of the same post and keeping the best source."""
    best: dict[str, dict[str, str]] = {}
    for _, items in groups:
        for item in items:
            key = dedupe_key(item["title"])
            current = best.get(key)
            if current is None or SOURCE_PRIORITY[item["source"]] < SOURCE_PRIORITY[current["source"]]:
                best[key] = item
    merged = list(best.values())
    merged.sort(key=lambda item: (item["date"], -SOURCE_PRIORITY[item["source"]], item["id"]), reverse=True)
    return merged


def select(sorted_items: list[dict[str, str]], limit: int = MAX_ITEMS) -> list[dict[str, str]]:
    """Take the newest items while respecting per-source caps."""
    chosen: list[dict[str, str]] = []
    used: dict[str, int] = {}
    for item in sorted_items:
        source = item["source"]
        if used.get(source, 0) >= SOURCE_CAPS.get(source, limit):
            continue
        chosen.append(item)
        used[source] = used.get(source, 0) + 1
        if len(chosen) >= limit:
            break
    return chosen


def previous_items(output: Path) -> dict[str, list[dict[str, str]]]:
    """Items from the feed file already on disk, grouped by source.

    Used only when a source fails outright: keeping its last published rows
    beats silently deleting them (the 2026-10-23 flap zeroed every youtube row
    and the degraded file was one commit away from shipping).
    """
    try:
        payload = json.loads(output.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    grouped: dict[str, list[dict[str, str]]] = {}
    for item in payload.get("items", []):
        source = item.get("source", "")
        if source:
            grouped.setdefault(source, []).append(item)
    return grouped


def build(output: Path = OUTPUT) -> dict[str, object]:
    adapters = (
        ("official", official_items),
        ("steam", steam_items),
        ("youtube", youtube_items),
    )
    groups: list[tuple[str, list[dict[str, str]]]] = []
    counts: dict[str, int] = {}
    errors: dict[str, str] = {}
    carried: dict[str, int] = {}
    previous = previous_items(output)
    for name, adapter in adapters:
        try:
            items = adapter()
        except (urllib.error.URLError, OSError, ValueError) as exc:
            counts[name] = 0
            errors[name] = f"{exc.__class__.__name__}: {exc}"
            kept = previous.get(name, [])
            if kept:
                carried[name] = len(kept)
                groups.append((name, kept))
            continue
        counts[name] = len(items)
        groups.append((name, items))

    merged = merge(groups)
    if not merged:
        raise ValueError("no items parsed from any source")
    items = select(merged)

    payload: dict[str, object] = {
        "updated_at": items[0]["date"],
        "source": "Marvel Rivals official news, Steam and YouTube",
        "source_url": OFFICIAL_NEWS,
        "sources_checked": {
            "official_news_cards": counts.get("official", 0),
            "steam_rss_items": counts.get("steam", 0),
            "youtube_items": counts.get("youtube", 0),
        },
        "disclaimer": "Unofficial fan project. Headlines link to the official posts.",
        "items": items,
    }
    if errors:
        payload["source_errors"] = errors
    if carried:
        payload["carried_forward"] = carried
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate docs/data/game_updates.json from official feeds.")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    try:
        payload = build(args.output)
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
    counts = payload["sources_checked"]
    print(
        f"Wrote {args.output.relative_to(ROOT)} ({len(payload['items'])} items, newest {payload['updated_at']}; "
        f"official {counts['official_news_cards']}, steam {counts['steam_rss_items']}, youtube {counts['youtube_items']})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
