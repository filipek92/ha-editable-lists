"""Services editable_lists.set / add / update / remove / move / rotate / get."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntryState
from homeassistant.const import ATTR_ENTITY_ID
from homeassistant.core import HomeAssistant, ServiceCall, ServiceResponse, SupportsResponse, callback
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv, entity_registry as er

from . import ops
from .const import (
    ATTR_DATA,
    ATTR_INDEX,
    ATTR_ITEM,
    ATTR_ITEMS,
    ATTR_MATCH,
    ATTR_POSITION,
    ATTR_REVISION,
    ATTR_STEPS,
    ATTR_TO,
    DOMAIN,
)
from .data import ListData
from .schema import ItemsInvalid

_ENTITY = {vol.Required(ATTR_ENTITY_ID): cv.entity_id}

SET_SCHEMA = vol.Schema(
    {
        **_ENTITY,
        vol.Required(ATTR_ITEMS): vol.Any(list, str),
        vol.Optional(ATTR_REVISION): vol.Coerce(int),
    }
)
ADD_SCHEMA = vol.Schema(
    {
        **_ENTITY,
        vol.Required(ATTR_ITEM): cv.match_all,
        vol.Optional(ATTR_POSITION): vol.Coerce(int),
    }
)
UPDATE_SCHEMA = vol.Schema(
    {
        **_ENTITY,
        vol.Exclusive(ATTR_INDEX, "where"): vol.Coerce(int),
        vol.Exclusive(ATTR_MATCH, "where"): cv.match_all,
        vol.Exclusive(ATTR_DATA, "what"): dict,
        vol.Exclusive(ATTR_ITEM, "what"): cv.match_all,
    }
)
REMOVE_SCHEMA = vol.Schema(
    {
        **_ENTITY,
        vol.Exclusive(ATTR_INDEX, "where"): vol.Coerce(int),
        vol.Exclusive(ATTR_MATCH, "where"): cv.match_all,
    }
)
MOVE_SCHEMA = vol.Schema(
    {
        **_ENTITY,
        vol.Exclusive(ATTR_INDEX, "where"): vol.Coerce(int),
        vol.Exclusive(ATTR_MATCH, "where"): cv.match_all,
        vol.Required(ATTR_TO): vol.Coerce(int),
    }
)
ROTATE_SCHEMA = vol.Schema({**_ENTITY, vol.Optional(ATTR_STEPS, default=1): vol.Coerce(int)})
GET_SCHEMA = vol.Schema(_ENTITY)


def _error(key: str, **placeholders: Any) -> ServiceValidationError:
    return ServiceValidationError(
        translation_domain=DOMAIN,
        translation_key=key,
        translation_placeholders={k: str(v) for k, v in placeholders.items()},
    )


def _list_data(hass: HomeAssistant, entity_id: str) -> ListData:
    ent = er.async_get(hass).async_get(entity_id)
    entry = hass.config_entries.async_get_entry(ent.config_entry_id) if ent and ent.config_entry_id else None
    if entry is None or entry.domain != DOMAIN:
        raise _error("not_a_list", entity_id=entity_id)
    if entry.state is not ConfigEntryState.LOADED:
        raise _error("not_loaded", entity_id=entity_id)
    return entry.runtime_data


def _where(items: list[Any], call: ServiceCall, *, single: bool = False) -> list[int]:
    idx = ops.find(items, index=call.data.get(ATTR_INDEX), match=call.data.get(ATTR_MATCH))
    if single and len(idx) != 1:
        raise _error("not_found") if not idx else _error("ambiguous_match", count=len(idx))
    return idx


type _Op = Callable[[ListData, ServiceCall], Awaitable[dict[str, Any] | None]]


async def _op_set(d: ListData, call: ServiceCall) -> None:
    rev = call.data.get(ATTR_REVISION)
    if rev is not None and rev != d.revision:
        raise _error("revision_conflict", current=d.revision, expected=rev)
    await d.async_commit(call.data[ATTR_ITEMS])


async def _op_add(d: ListData, call: ServiceCall) -> None:
    await d.async_commit(ops.add(d.items, call.data[ATTR_ITEM], call.data.get(ATTR_POSITION)))


async def _op_update(d: ListData, call: ServiceCall) -> dict[str, Any]:
    if ATTR_DATA not in call.data and ATTR_ITEM not in call.data:
        raise ops.OpError("need_data_or_item")
    idx = _where(d.items, call)
    if not idx:
        raise _error("not_found")
    await d.async_commit(ops.update(d.items, idx, data=call.data.get(ATTR_DATA), item=call.data.get(ATTR_ITEM)))
    return {"changed": len(idx)}


async def _op_remove(d: ListData, call: ServiceCall) -> dict[str, Any]:
    idx = _where(d.items, call)
    if idx:
        await d.async_commit(ops.remove(d.items, idx))
    return {"removed": len(idx)}


async def _op_move(d: ListData, call: ServiceCall) -> None:
    (i,) = _where(d.items, call, single=True)
    await d.async_commit(ops.move(d.items, i, call.data[ATTR_TO]))


async def _op_rotate(d: ListData, call: ServiceCall) -> None:
    await d.async_commit(ops.rotate(d.items, call.data[ATTR_STEPS]))


async def _op_get(d: ListData, call: ServiceCall) -> None:
    return None


def _handler(hass: HomeAssistant, op: _Op) -> Callable[[ServiceCall], Awaitable[ServiceResponse]]:
    async def handle(call: ServiceCall) -> ServiceResponse:
        d = _list_data(hass, call.data[ATTR_ENTITY_ID])
        async with d.lock:
            try:
                extra = await op(d, call) or {}
            except ItemsInvalid as err:
                raise _error("invalid_items", errors=str(err)) from err
            except ops.OpError as err:
                raise _error(err.key, **err.placeholders) from err
            if not call.return_response:
                return None
            return {ATTR_ITEMS: d.items, ATTR_REVISION: d.revision, **extra}

    return handle


@callback
def async_register_services(hass: HomeAssistant) -> None:
    for name, schema, op, resp in (
        ("set", SET_SCHEMA, _op_set, SupportsResponse.OPTIONAL),
        ("add", ADD_SCHEMA, _op_add, SupportsResponse.OPTIONAL),
        ("update", UPDATE_SCHEMA, _op_update, SupportsResponse.OPTIONAL),
        ("remove", REMOVE_SCHEMA, _op_remove, SupportsResponse.OPTIONAL),
        ("move", MOVE_SCHEMA, _op_move, SupportsResponse.OPTIONAL),
        ("rotate", ROTATE_SCHEMA, _op_rotate, SupportsResponse.OPTIONAL),
        ("get", GET_SCHEMA, _op_get, SupportsResponse.ONLY),
    ):
        hass.services.async_register(DOMAIN, name, _handler(hass, op), schema=schema, supports_response=resp)
