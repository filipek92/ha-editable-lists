"""List sensor: state = number of items, attribute `items` = content."""

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .const import ATTR_ITEMS, ATTR_REVISION
from .data import EditableListsConfigEntry


async def async_setup_entry(
    hass: HomeAssistant,
    entry: EditableListsConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    async_add_entities([EditableListSensor(entry)])


class EditableListSensor(SensorEntity):
    _attr_should_poll = False
    _attr_icon = "mdi:format-list-bulleted"
    # Content can change often and be large: only the item count goes to history.
    _unrecorded_attributes = frozenset({ATTR_ITEMS, ATTR_REVISION, "columns", "value"})

    def __init__(self, entry: EditableListsConfigEntry) -> None:
        self._data = entry.runtime_data
        self._attr_unique_id = entry.entry_id
        self._attr_name = entry.title

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self._data.async_add_listener(self.async_write_ha_state))

    @property
    def native_value(self) -> int:
        return len(self._data.items)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {
            ATTR_ITEMS: self._data.items,
            ATTR_REVISION: self._data.revision,
            **self._data.schema_attrs,
        }
