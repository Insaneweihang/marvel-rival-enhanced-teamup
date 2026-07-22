from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class Role(str, Enum):
    VANGUARD = "Vanguard"
    DUELIST = "Duelist"
    STRATEGIST = "Strategist"


@dataclass(frozen=True)
class Hero:
    name: str
    role: Role


@dataclass(frozen=True)
class LoadedData:
    patch_version: str
    heroes_by_name: dict[str, Hero]
    teamup_partners: dict[str, frozenset[str]]
