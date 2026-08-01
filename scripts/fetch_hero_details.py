from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
OFFICIAL_HERO_INDEX = "https://www.marvelrivals.com/heroes/index.html?heroId=0"
USER_AGENT = "marvel-rivals-teamups/0.1 official-hero-details-audit"


@dataclass
class Node:
    tag: str
    attrs: dict[str, str] = field(default_factory=dict)
    children: list["Node | str"] = field(default_factory=list)


class TreeParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Node("document")
        self.stack = [self.root]

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        node = Node(tag.lower(), {key.lower(): value or "" for key, value in attrs})
        self.stack[-1].children.append(node)
        if tag.lower() not in {"br", "img", "input", "link", "meta"}:
            self.stack.append(node)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                return

    def handle_data(self, data: str) -> None:
        if data:
            self.stack[-1].children.append(data)


def parse_html(markup: str) -> Node:
    parser = TreeParser()
    parser.feed(markup)
    return parser.root


def classes(node: Node) -> set[str]:
    return set(node.attrs.get("class", "").split())


def text_content(node: Node | str) -> str:
    if isinstance(node, str):
        return node
    parts: list[str] = []
    for child in node.children:
        if isinstance(child, Node) and child.tag == "br":
            parts.append("\n")
        parts.append(text_content(child))
    text = unescape("".join(parts)).replace("\xa0", " ")
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    return text.strip()


def find_all(node: Node, tag: str | None = None, class_name: str | None = None) -> list[Node]:
    matches: list[Node] = []
    for child in node.children:
        if not isinstance(child, Node):
            continue
        if (tag is None or child.tag == tag) and (class_name is None or class_name in classes(child)):
            matches.append(child)
        matches.extend(find_all(child, tag, class_name))
    return matches


def direct_children(node: Node, tag: str) -> list[Node]:
    return [child for child in node.children if isinstance(child, Node) and child.tag == tag]


def first_direct_table(node: Node) -> Node | None:
    for child in node.children:
        if isinstance(child, Node) and child.tag == "table":
            return child
    return None


def table_rows(table: Node) -> list[Node]:
    bodies = direct_children(table, "tbody")
    containers = bodies or [table]
    rows: list[Node] = []
    for container in containers:
        rows.extend(direct_children(container, "tr"))
    return rows


def row_cells(row: Node) -> list[Node]:
    return direct_children(row, "td")


def table_pairs(table: Node | None) -> dict[str, str]:
    if table is None:
        return {}
    pairs: dict[str, str] = {}
    for row in table_rows(table):
        cells = row_cells(row)
        if len(cells) < 2:
            continue
        key = text_content(cells[0])
        value = text_content(cells[1])
        if key and value:
            pairs[key] = value
    return pairs


def clean_name(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("&", " & ")).strip()


def normalized_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.casefold())


def fetch(url: str, cache_path: Path | None = None) -> str:
    if cache_path and cache_path.exists():
        return cache_path.read_text(encoding="utf-8")
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=20) as response:
        body = response.read().decode("utf-8", errors="replace")
    if cache_path:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(body, encoding="utf-8")
    return body


def official_roster(index_html: str) -> list[dict[str, str]]:
    root = parse_html(index_html)
    roster: list[dict[str, str]] = []
    for link in find_all(root, "a"):
        data_id = link.attrs.get("data-id", "")
        data_url = link.attrs.get("data-url", "")
        title = link.attrs.get("title", "")
        data_name = link.attrs.get("data-name", "")
        if data_id and data_url and title:
            roster.append(
                {
                    "id": data_id,
                    "url": data_url,
                    "name": clean_name(title),
                    "official_name": clean_name(data_name or title),
                }
            )
    deduped: dict[str, dict[str, str]] = {}
    for hero in roster:
        deduped[hero["id"]] = hero
    return sorted(deduped.values(), key=lambda item: item["name"].casefold())


def extract_effects(description: str) -> tuple[str, str]:
    base_match = re.search(
        r"Base Effect:\s*(.*?)(?:\n|Enhanced Effect:|$)", description, flags=re.IGNORECASE | re.DOTALL
    )
    enhanced_match = re.search(r"Enhanced Effect:\s*(.*)$", description, flags=re.IGNORECASE | re.DOTALL)
    base = re.sub(r"\s+", " ", base_match.group(1)).strip() if base_match else ""
    enhanced = re.sub(r"\s+", " ", enhanced_match.group(1)).strip() if enhanced_match else ""
    return base, enhanced


def row_record(row: Node) -> dict[str, object] | None:
    cells = row_cells(row)
    if len(cells) < 4:
        return None
    type_text = text_content(cells[0])
    if not type_text.isdigit():
        return None
    row_type = int(type_text)
    stats_cell_index = 3 if row_type == 0 else 4
    stats_table = first_direct_table(cells[stats_cell_index]) if len(cells) > stats_cell_index else None
    return {
        "type": row_type,
        "name": clean_name(text_content(cells[1])),
        "description": text_content(cells[3]),
        "stats": table_pairs(stats_table),
        "partner_index": int(text_content(cells[-1])) if text_content(cells[-1]).isdigit() else None,
    }


def parse_hero_article(html: str, hero_name: str, source_url: str, partners: list[str]) -> dict[str, object]:
    root = parse_html(html)
    content = find_all(root, class_name="art-inner-content")
    scope = content[0] if content else root
    table = next((table for table in find_all(scope, "table") if "table-imgs" in classes(table)), None)
    if table is None:
        raise ValueError(f"{hero_name}: official article has no table-imgs table")

    rows = [record for row in table_rows(table) if (record := row_record(row))]
    base_row = next((row for row in rows if row["type"] == 0), None)
    if base_row is None:
        raise ValueError(f"{hero_name}: official article has no base stats row")

    abilities: list[dict[str, object]] = []
    raw_teamups: dict[tuple[int, str], dict[str, object]] = {}
    teamup_tiers: dict[int, int] = {}

    for row in rows:
        row_type = int(row["type"])
        if row_type in {1, 2, 3}:
            ability = {
                "section": "Normal Attack" if row_type == 1 else "Abilities",
                "name": row["name"],
                "key": row["stats"].get("Key", ""),
                "description": row["description"],
                "stats": row["stats"],
            }
            if row_type == 3:
                ability["section"] = "Team-Up Abilities"
            abilities.append(ability)
        elif row_type == 4 and isinstance(row["partner_index"], int):
            partner_index = int(row["partner_index"])
            tier = teamup_tiers.get(partner_index, 0)
            teamup_tiers[partner_index] = tier + 1
            partner = partners[partner_index] if 0 <= partner_index < len(partners) else ""
            key = (partner_index, str(row["name"]))
            entry = raw_teamups.setdefault(
                key,
                {
                    "name": row["name"],
                    "partner": partner,
                    "key": row["stats"].get("Key", ""),
                    "description": "",
                    "base_effect": "",
                    "enhanced_effect": "",
                    "stats": {},
                    "base_stats": {},
                    "enhanced_stats": {},
                },
            )
            base_effect, enhanced_effect = extract_effects(str(row["description"]))
            entry["description"] = str(row["description"]).replace("\n", " ")
            entry["base_effect"] = entry["base_effect"] or base_effect
            entry["enhanced_effect"] = entry["enhanced_effect"] or enhanced_effect
            if tier == 0:
                entry["base_stats"] = row["stats"]
            else:
                entry["enhanced_stats"] = row["stats"]
            if not entry["stats"]:
                entry["stats"] = row["stats"]

    hero = {
        "source_url": source_url,
        "display_name": hero_name,
        "real_name": clean_name(text_content(find_all(scope, class_name="p2")[0])) if find_all(scope, class_name="p2") else hero_name,
        "role": clean_name(text_content(find_all(scope, class_name="p3")[0])) if find_all(scope, class_name="p3") else "",
        "base_stats": base_row["stats"],
        "abilities": abilities,
        "team_up_abilities": list(raw_teamups.values()),
    }
    return hero


def load_json(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch official Marvel Rivals hero ability details.")
    parser.add_argument("--data-dir", type=Path, default=ROOT / "data")
    parser.add_argument("--cache-dir", type=Path, default=ROOT / ".cache" / "sources" / "heroes")
    parser.add_argument("--output", type=Path, default=ROOT / "data" / "hero_details.proposed.json")
    parser.add_argument("--refresh", action="store_true", help="Ignore cached official HTML snapshots.")
    args = parser.parse_args()

    heroes_data = load_json(args.data_dir / "heroes.json")
    teamups_data = load_json(args.data_dir / "teamups.json")
    heroes = heroes_data["heroes"]
    teamups = teamups_data["teamups"]
    active_names = {hero["name"] for hero in heroes if hero.get("active", True)}
    canonical = {normalized_name(hero["name"]): hero["name"] for hero in heroes}

    try:
        index_cache = None if args.refresh else args.cache_dir / "official_hero_index.html"
        index_html = fetch(OFFICIAL_HERO_INDEX, index_cache)
        roster = official_roster(index_html)
    except URLError as exc:
        print(f"Failed to fetch official hero index: {exc}", file=sys.stderr)
        return 1

    output: dict[str, object] = {
        "patch_version": heroes_data["patch_version"],
        "source": "official_marvel_rivals_hero_pages",
        "source_url": OFFICIAL_HERO_INDEX,
        "heroes": {},
    }
    failures: list[str] = []
    seen: set[str] = set()

    for official in roster:
        canonical_name = canonical.get(normalized_name(official["name"])) or canonical.get(
            normalized_name(official["official_name"])
        )
        if canonical_name is None:
            continue
        seen.add(canonical_name)
        partners = list(teamups.get(canonical_name, []))
        cache_name = f"{normalized_name(canonical_name)}.html"
        cache_path = None if args.refresh else args.cache_dir / cache_name
        try:
            html = fetch(official["url"], cache_path)
            output["heroes"][canonical_name] = parse_hero_article(
                html,
                canonical_name,
                official["url"],
                partners,
            )
            print(f"Parsed {canonical_name}")
        except (URLError, ValueError) as exc:
            failures.append(f"{canonical_name}: {exc}")

    missing = sorted(active_names - seen)
    for name in missing:
        failures.append(f"{name}: missing from official hero index")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {args.output}")
    if failures:
        print("Hero detail extraction completed with issues:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
