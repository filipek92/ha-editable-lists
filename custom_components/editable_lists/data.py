"""Data of one list: load, save, listeners."""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers.storage import Store

from .const import DOMAIN, STORAGE_VERSION
from .schema import Schema, parse_schema, schema_attributes, validate_items

type EditableListsConfigEntry = ConfigEntry[ListData]


def store_key(entry_id: str) -> str:
    return f"{DOMAIN}.{entry_id}"


class ListData:
    """Content of one list (one config entry)."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        self.store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, store_key(entry.entry_id))
        self.items: list[Any] = []
        self.revision = 0
        self.schema: Schema = parse_schema(entry.options)
        self.schema_attrs = schema_attributes(entry.options)
        self.lock = asyncio.Lock()
        self._listeners: list[Callable[[], None]] = []

    async def async_load(self) -> None:
        data = await self.store.async_load() or {}
        items = data.get("items")
        self.items = items if isinstance(items, list) else []
        self.revision = int(data.get("revision", 0))

    async def async_commit(self, items: list[Any]) -> None:
        """Validate, save and announce new content. Call while holding self.lock."""
        items = validate_items(items, self.schema)
        self.items = items
        self.revision += 1
        await self.store.async_save({"items": self.items, "revision": self.revision})
        for cb in list(self._listeners):
            cb()

    @callback
    def async_add_listener(self, cb: Callable[[], None]) -> CALLBACK_TYPE:
        self._listeners.append(cb)

        @callback
        def remove() -> None:
            self._listeners.remove(cb)

        return remove
