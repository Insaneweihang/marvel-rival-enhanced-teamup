from __future__ import annotations

from dataclasses import dataclass

from .models import Role


@dataclass(frozen=True)
class RoleFormat:
    key: str
    label: str
    description: str
    distribution: dict[Role, int]


ROLE_FORMATS: dict[str, RoleFormat] = {
    "222": RoleFormat(
        key="222",
        label="2-2-2",
        description="2 Vanguard / 2 Duelist / 2 Strategist",
        distribution={Role.VANGUARD: 2, Role.DUELIST: 2, Role.STRATEGIST: 2},
    ),
    "132": RoleFormat(
        key="132",
        label="1-3-2",
        description="1 Vanguard / 3 Duelist / 2 Strategist",
        distribution={Role.VANGUARD: 1, Role.DUELIST: 3, Role.STRATEGIST: 2},
    ),
    "213": RoleFormat(
        key="213",
        label="2-1-3",
        description="2 Vanguard / 1 Duelist / 3 Strategist",
        distribution={Role.VANGUARD: 2, Role.DUELIST: 1, Role.STRATEGIST: 3},
    ),
    "123": RoleFormat(
        key="123",
        label="1-2-3",
        description="1 Vanguard / 2 Duelist / 3 Strategist",
        distribution={Role.VANGUARD: 1, Role.DUELIST: 2, Role.STRATEGIST: 3},
    ),
    "312": RoleFormat(
        key="312",
        label="3-1-2",
        description="3 Vanguard / 1 Duelist / 2 Strategist",
        distribution={Role.VANGUARD: 3, Role.DUELIST: 1, Role.STRATEGIST: 2},
    ),
}


ROLE_FORMAT_ORDER = ["222", "132", "213", "123", "312"]
