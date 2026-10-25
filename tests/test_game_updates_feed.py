"""The Game Updates feed must survive YouTube's flapping Atom endpoint.

Regression: on 2026-10-23 the RSS edge started answering 404/500 on ~85% of
requests. A single-shot fetch silently zeroed every youtube row, and the
degraded docs/data/game_updates.json was one commit away from shipping.
"""

from __future__ import annotations

import importlib.util
import json
import sys
import urllib.error
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

SPEC = importlib.util.spec_from_file_location("fetch_game_updates", ROOT / "scripts" / "fetch_game_updates.py")
assert SPEC and SPEC.loader
feed = importlib.util.module_from_spec(SPEC)
sys.modules["fetch_game_updates"] = feed
SPEC.loader.exec_module(feed)

FEED_XML = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015">
  <entry>
    <yt:videoId>abc123</yt:videoId>
    <title>New Jeff Costume Reveal | Marvel Rivals</title>
    <published>2026-10-21T15:00:24+00:00</published>
  </entry>
</feed>
"""


def _http_404() -> urllib.error.HTTPError:
    return urllib.error.HTTPError(feed.YOUTUBE_RSS, 404, "Not Found", {}, None)


def _existing(tmp_path: Path) -> Path:
    """A feed file already on disk holding one youtube row."""
    target = tmp_path / "game_updates.json"
    target.write_text(
        json.dumps(
            {
                "updated_at": "2026-10-21",
                "items": [
                    {
                        "id": "youtube:keepme",
                        "date": "2026-10-21",
                        "title": "Kept video",
                        "category": "video",
                        "url": "https://www.youtube.com/watch?v=keepme",
                        "source": "youtube",
                        "source_label": "YouTube",
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    return target


def test_fetch_resilient_retries_until_one_probe_succeeds(monkeypatch):
    calls = {"n": 0}

    def flaky(url: str) -> str:
        calls["n"] += 1
        if calls["n"] < 4:
            raise _http_404()
        return FEED_XML

    monkeypatch.setattr(feed, "fetch", flaky)
    monkeypatch.setattr(feed.time, "sleep", lambda _seconds: None)

    assert feed.fetch_resilient(feed.YOUTUBE_RSS, rounds=3, burst=2) == FEED_XML
    assert calls["n"] == 4


def test_fetch_resilient_raises_the_upstream_error(monkeypatch):
    monkeypatch.setattr(feed, "fetch", lambda url: (_ for _ in ()).throw(_http_404()))
    monkeypatch.setattr(feed.time, "sleep", lambda _seconds: None)

    with pytest.raises(urllib.error.HTTPError) as excinfo:
        feed.fetch_resilient(feed.YOUTUBE_RSS, rounds=2, burst=2)
    assert excinfo.value.code == 404


def test_build_carries_youtube_rows_forward_when_the_feed_is_down(tmp_path, monkeypatch):
    target = _existing(tmp_path)
    monkeypatch.setattr(feed, "fetch_resilient", lambda url, **kwargs: (_ for _ in ()).throw(_http_404()))
    monkeypatch.setattr(feed, "fetch", lambda url: "")

    payload = feed.build(target)

    assert payload["sources_checked"]["youtube_items"] == 0
    assert payload["source_errors"]["youtube"].startswith("HTTPError")
    assert payload["carried_forward"] == {"youtube": 1}
    assert [item["id"] for item in payload["items"]] == ["youtube:keepme"]


def test_build_does_not_carry_stale_rows_when_the_feed_recovers(tmp_path, monkeypatch):
    target = _existing(tmp_path)
    monkeypatch.setattr(feed, "fetch_resilient", lambda url, **kwargs: FEED_XML)
    monkeypatch.setattr(feed, "fetch", lambda url: "")

    payload = feed.build(target)

    assert payload["sources_checked"]["youtube_items"] == 1
    assert "source_errors" not in payload
    assert "carried_forward" not in payload
    assert [item["id"] for item in payload["items"]] == ["youtube:abc123"]
