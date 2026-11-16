"""Editable Lists – JSON lists for automations and dashboards."""

from __future__ import annotations

from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.storage import Store
from homeassistant.helpers.typing import ConfigType

from .const import CARD_FILE, DOMAIN, FRONTEND_URL, STORAGE_VERSION
from .data import EditableListsConfigEntry, ListData, store_key
from .services import async_register_services

PLATFORMS = [Platform.SENSOR]

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Services and the card are shared by all lists."""
    async_register_services(hass)
    await _async_register_frontend(hass)
    return True


async def _async_register_frontend(hass: HomeAssistant) -> None:
    if hass.http is None:
        return
    folder = Path(__file__).parent / "frontend"
    await hass.http.async_register_static_paths(
        [StaticPathConfig(FRONTEND_URL, str(folder), cache_headers=False)]
    )
    # File modification time in the URL, so browsers load the new card after an update.
    mtime = await hass.async_add_executor_job(lambda: int((folder / CARD_FILE).stat().st_mtime))
    add_extra_js_url(hass, f"{FRONTEND_URL}/{CARD_FILE}?v={mtime}")


async def async_setup_entry(hass: HomeAssistant, entry: EditableListsConfigEntry) -> bool:
    data = ListData(hass, entry)
    await data.async_load()
    entry.runtime_data = data
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_update_listener))
    return True


async def _async_update_listener(hass: HomeAssistant, entry: EditableListsConfigEntry) -> None:
    """Schema changed in the options -> reload."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: EditableListsConfigEntry) -> bool:
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def async_remove_entry(hass: HomeAssistant, entry: EditableListsConfigEntry) -> None:
    """Deleting a list also deletes its data."""
    await Store(hass, STORAGE_VERSION, store_key(entry.entry_id)).async_remove()
