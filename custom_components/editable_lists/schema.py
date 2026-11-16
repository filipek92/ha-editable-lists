"""List schema and item validation.

No Home Assistant imports, so it can be tested on its own.

A schema has one of three forms:
  * columns: [ {key, label, type, ...}, ... ]  -> items are objects
  * value:   {type, label, ...}                -> items are plain values
  * nothing                                    -> free-form list, no validation
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any

TYPES = ("text", "number", "bool", "enum")
TRUE_STRINGS = {"true", "1", "on", "yes"}
FALSE_STRINGS = {"false", "0", "off", "no", ""}


class SchemaError(ValueError):
    """Invalid schema definition."""


class ItemsInvalid(ValueError):
    """Items do not match the schema."""

    def __init__(self, errors: list[str]) -> None:
        self.errors = errors
        shown = "; ".join(errors[:5])
        more = f" (and {len(errors) - 5} more)" if len(errors) > 5 else ""
        super().__init__(shown + more)


@dataclass
class Column:
    key: str
    label: str
    type: str = "text"
    required: bool = False
    unique: bool = False
    default: Any = None
    pattern: str | None = None
    pattern_hint: str | None = None
    min: float | None = None
    max: float | None = None
    options: list[dict[str, str]] = field(default_factory=list)
    _regex: re.Pattern[str] | None = field(default=None, repr=False)

    def blank(self) -> Any:
        if self.default is not None:
            return self.default
        if self.type == "bool":
            return False
        if self.type == "number":
            return None
        if self.type == "enum" and self.required and self.options:
            return self.options[0]["value"]
        return ""


@dataclass
class Schema:
    columns: list[Column] | None = None
    value: Column | None = None

    @property
    def scalar(self) -> bool:
        return self.columns is None

    @property
    def free(self) -> bool:
        return self.columns is None and self.value is None


def _norm_options(opts: Any) -> list[dict[str, str]]:
    if opts is None:
        return []
    if not isinstance(opts, list):
        raise SchemaError("options must be a list")
    out = []
    for o in opts:
        if isinstance(o, dict):
            if "value" not in o:
                raise SchemaError("each enum option needs a 'value'")
            out.append({"value": str(o["value"]), "label": str(o.get("label", o["value"]))})
        elif isinstance(o, (str, int, float, bool)):
            out.append({"value": str(o), "label": str(o)})
        else:
            raise SchemaError(f"invalid enum option: {o!r}")
    return out


def _num(v: Any, name: str) -> float | None:
    if v is None:
        return None
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        raise SchemaError(f"{name} must be a number")
    return v


def parse_column(raw: Any, *, key: str | None = None) -> Column:
    if not isinstance(raw, dict):
        raise SchemaError("a column definition must be an object")
    k = key if key is not None else raw.get("key")
    if not isinstance(k, str) or not k.strip():
        raise SchemaError("every column needs a non-empty 'key'")
    typ = raw.get("type", "text")
    if typ not in TYPES:
        raise SchemaError(f"column '{k}': unknown type '{typ}' (allowed: {', '.join(TYPES)})")
    col = Column(
        key=k.strip(),
        label=str(raw.get("label") or k),
        type=typ,
        required=bool(raw.get("required", False)),
        unique=bool(raw.get("unique", False)),
        default=raw.get("default"),
        pattern=raw.get("pattern") or None,
        pattern_hint=raw.get("pattern_hint") or None,
        min=_num(raw.get("min"), "min"),
        max=_num(raw.get("max"), "max"),
        options=_norm_options(raw.get("options")),
    )
    if col.pattern:
        try:
            col._regex = re.compile(col.pattern)
        except re.error as err:
            raise SchemaError(f"column '{col.key}': invalid regex: {err}") from err
    if col.type == "enum" and not col.options:
        raise SchemaError(f"column '{col.key}': enum needs 'options'")
    return col


def parse_schema(options: dict[str, Any] | None) -> Schema:
    """Build the schema from the config entry options."""
    options = options or {}
    columns = options.get("columns")
    value = options.get("value")
    if columns and value:
        raise SchemaError("use either 'columns' or 'value', not both")
    if columns:
        if not isinstance(columns, list):
            raise SchemaError("columns must be a list")
        cols = [parse_column(c) for c in columns]
        keys = [c.key for c in cols]
        dup = {k for k in keys if keys.count(k) > 1}
        if dup:
            raise SchemaError(f"duplicate column keys: {', '.join(sorted(dup))}")
        return Schema(columns=cols)
    if value:
        return Schema(value=parse_column(value, key="value"))
    return Schema()


def _coerce(col: Column, v: Any, where: str, errors: list[str]) -> Any:
    if v is None:
        return col.blank() if col.type == "bool" else (None if col.type == "number" else "")
    if col.type == "bool":
        if isinstance(v, bool):
            return v
        if isinstance(v, (int, float)):
            return bool(v)
        s = str(v).strip().lower()
        if s in TRUE_STRINGS:
            return True
        if s in FALSE_STRINGS:
            return False
        errors.append(f"{where}: '{v}' is not a boolean")
        return v
    if col.type == "number":
        if isinstance(v, bool):
            errors.append(f"{where}: expected a number")
            return v
        if isinstance(v, (int, float)):
            return v
        s = str(v).strip().replace(",", ".")
        if s == "":
            return None
        try:
            f = float(s)
        except ValueError:
            errors.append(f"{where}: '{v}' is not a number")
            return v
        return int(f) if f.is_integer() and "." not in s and "e" not in s.lower() else f
    if col.type == "enum":
        return str(v)
    return str(v).strip()


def _empty(v: Any) -> bool:
    return v is None or v == ""


def _check(col: Column, v: Any, where: str, errors: list[str]) -> None:
    if col.type == "bool":
        return
    if _empty(v):
        if col.required:
            errors.append(f"{where}: required")
        return
    if col.type == "text" and col._regex and not col._regex.search(str(v)):
        errors.append(f"{where}: {col.pattern_hint or 'does not match ' + col.pattern}")
    elif col.type == "number" and isinstance(v, (int, float)):
        if col.min is not None and v < col.min:
            errors.append(f"{where}: minimum is {col.min:g}")
        elif col.max is not None and v > col.max:
            errors.append(f"{where}: maximum is {col.max:g}")
    elif col.type == "enum" and not any(o["value"] == v for o in col.options):
        errors.append(f"{where}: '{v}' is not one of the options")


def validate_items(items: Any, schema: Schema) -> list[Any]:
    """Convert items to the schema types and check them. Returns a new list."""
    if isinstance(items, str):
        try:
            items = json.loads(items)
        except ValueError as err:
            raise ItemsInvalid([f"items are not valid JSON: {err}"]) from err
    if not isinstance(items, list):
        raise ItemsInvalid(["items must be a list"])

    errors: list[str] = []

    if schema.free:
        try:
            json.dumps(items)
        except (TypeError, ValueError) as err:
            raise ItemsInvalid([f"items cannot be stored as JSON: {err}"]) from err
        return list(items)

    cols = schema.columns if schema.columns is not None else [schema.value]
    out: list[Any] = []
    for i, raw in enumerate(items):
        if schema.scalar:
            if isinstance(raw, (dict, list)):
                errors.append(f"Item {i + 1}: expected a plain value")
                out.append(raw)
                continue
            row = {"value": raw}
        else:
            if not isinstance(raw, dict):
                errors.append(f"Item {i + 1}: expected an object")
                out.append(raw)
                continue
            row = dict(raw)
        for col in cols:
            where = f"Item {i + 1}" + ("" if schema.scalar else f", {col.label}")
            v = row[col.key] if col.key in row else col.blank()
            v = _coerce(col, v, where, errors)
            _check(col, v, where, errors)
            row[col.key] = v
        out.append(row["value"] if schema.scalar else row)

    for col in cols:
        if not col.unique:
            continue
        seen: dict[str, int] = {}
        for i, item in enumerate(out):
            v = item if schema.scalar else (item.get(col.key) if isinstance(item, dict) else None)
            if _empty(v):
                continue
            k = str(v).lower()
            if k in seen:
                errors.append(f"{col.label}: '{v}' is duplicated (items {seen[k] + 1} and {i + 1})")
            else:
                seen[k] = i

    if errors:
        raise ItemsInvalid(errors)
    try:
        json.dumps(out)
    except (TypeError, ValueError) as err:
        raise ItemsInvalid([f"items cannot be stored as JSON: {err}"]) from err
    return out


def schema_attributes(options: dict[str, Any] | None) -> dict[str, Any]:
    """The schema as the card sees it in the entity attributes."""
    options = options or {}
    out: dict[str, Any] = {}
    if options.get("columns"):
        out["columns"] = options["columns"]
    elif options.get("value"):
        out["value"] = options["value"]
    return out
