"""Add a list and edit its schema."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.const import CONF_NAME
from homeassistant.core import callback
from homeassistant.helpers.selector import ObjectSelector, TextSelector

from .const import CONF_COLUMNS, CONF_VALUE, DOMAIN
from .data import EditableListsConfigEntry
from .schema import SchemaError, parse_schema


def _schema_options(user_input: dict[str, Any]) -> dict[str, Any]:
    """Take columns/value from the form, skip empty values."""
    out: dict[str, Any] = {}
    for key in (CONF_COLUMNS, CONF_VALUE):
        val = user_input.get(key)
        if val not in (None, "", [], {}):
            out[key] = val
    return out


def _validate(options: dict[str, Any]) -> tuple[dict[str, str], dict[str, str]]:
    try:
        parse_schema(options)
    except SchemaError as err:
        return {"base": "invalid_schema"}, {"error": str(err)}
    return {}, {}


def _schema_fields(defaults: dict[str, Any]) -> dict[Any, Any]:
    return {
        vol.Optional(CONF_COLUMNS, description={"suggested_value": defaults.get(CONF_COLUMNS)}): ObjectSelector(),
        vol.Optional(CONF_VALUE, description={"suggested_value": defaults.get(CONF_VALUE)}): ObjectSelector(),
    }


class EditableListsConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        placeholders = {"error": ""}
        if user_input is not None:
            options = _schema_options(user_input)
            errors, ph = _validate(options)
            placeholders.update(ph)
            if not errors:
                return self.async_create_entry(title=user_input[CONF_NAME].strip(), data={}, options=options)

        defaults = user_input or {}
        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_NAME, default=defaults.get(CONF_NAME, "")): TextSelector(),
                    **_schema_fields(defaults),
                }
            ),
            errors=errors,
            description_placeholders=placeholders,
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: EditableListsConfigEntry) -> OptionsFlow:
        return EditableListsOptionsFlow()


class EditableListsOptionsFlow(OptionsFlow):
    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        placeholders = {"error": ""}
        if user_input is not None:
            options = _schema_options(user_input)
            errors, ph = _validate(options)
            placeholders.update(ph)
            if not errors:
                return self.async_create_entry(data=options)

        defaults = user_input if user_input is not None else dict(self.config_entry.options)
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(_schema_fields(defaults)),
            errors=errors,
            description_placeholders=placeholders,
        )
