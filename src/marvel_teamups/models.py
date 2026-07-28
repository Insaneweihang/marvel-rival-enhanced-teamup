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
    active: bool = True
    roles: frozenset[Role] | None = None

    @property
    def eligible_roles(self) -> frozenset[Role]:
        return self.roles or frozenset({self.role})


@dataclass(frozen=True)
class LoadedData:
    patch_version: str
    heroes_by_name: dict[str, Hero]
    teamup_partners: dict[str, frozenset[str]]


@dataclass(frozen=True)
class TeamupEffect:
    partner: str
    ability_name: str | None
    base_effect: str | None
    enhanced_effect: str | None
    source_url: str | None
    verification_status: str
