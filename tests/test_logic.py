"""Logic tests without Home Assistant: python -m pytest tests"""

import importlib.util
import sys
from pathlib import Path

import pytest

BASE = Path(__file__).parent.parent / "custom_components" / "editable_lists"


def _load(name):
    spec = importlib.util.spec_from_file_location(f"editable_lists_{name}", BASE / f"{name}.py")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


schema = _load("schema")
ops = _load("ops")

MESH = {
    "columns": [
        {"key": "prefix", "label": "Prefix", "required": True, "unique": True, "pattern": "^[0-9a-f]{6,}$"},
        {"key": "name", "label": "Name"},
        {"key": "role", "type": "enum", "required": True, "options": [{"value": "admin", "label": "Admin"}, "user"]},
        {"key": "active", "type": "bool", "default": True},
        {"key": "score", "type": "number", "min": 0, "max": 10},
    ]
}


def test_parse_and_fill_defaults():
    s = schema.parse_schema(MESH)
    out = schema.validate_items([{"prefix": "c7de24", "role": "admin", "extra": 1}], s)
    assert out == [{"prefix": "c7de24", "role": "admin", "extra": 1, "name": "", "active": True, "score": None}]


def test_coercion():
    s = schema.parse_schema(MESH)
    out = schema.validate_items([{"prefix": " 5ca0ee ", "role": "user", "active": "off", "score": "3"}], s)
    assert out[0]["prefix"] == "5ca0ee" and out[0]["active"] is False and out[0]["score"] == 3


def test_errors():
    s = schema.parse_schema(MESH)
    with pytest.raises(schema.ItemsInvalid) as e:
        schema.validate_items(
            [
                {"prefix": "C7DE24", "role": "admin"},
                {"prefix": "", "role": "x", "score": 11},
                {"prefix": "abcdef", "role": "user"},
                {"prefix": "ABCDEF", "role": "user"},
                "neni objekt",
            ],
            s,
        )
    msgs = " | ".join(e.value.errors)
    assert "Item 1, Prefix" in msgs  # upper case fails the regex
    assert "Item 2, Prefix: required" in msgs
    assert "not one of the options" in msgs
    assert "maximum" in msgs
    assert "expected an object" in msgs


def test_unique_case_insensitive():
    s = schema.parse_schema({"value": {"type": "text", "unique": True}})
    with pytest.raises(schema.ItemsInvalid):
        schema.validate_items(["Filip", "filip"], s)
    assert schema.validate_items(["Filip", "Patrik"], s) == ["Filip", "Patrik"]


def test_scalar_and_free():
    s = schema.parse_schema({"value": {"type": "number"}})
    assert schema.validate_items(["1", 2.5, "3,5"], s) == [1, 2.5, 3.5]
    free = schema.parse_schema({})
    assert free.free
    assert schema.validate_items('[1, {"a": 2}]', free) == [1, {"a": 2}]
    with pytest.raises(schema.ItemsInvalid):
        schema.validate_items({"a": 1}, free)


def test_bad_schema():
    for bad in (
        {"columns": [{"label": "no key"}]},
        {"columns": [{"key": "a", "type": "date"}]},
        {"columns": [{"key": "a", "type": "enum"}]},
        {"columns": [{"key": "a"}, {"key": "a"}]},
        {"columns": [{"key": "a", "pattern": "("}]},
        {"columns": [{"key": "a"}], "value": {"type": "text"}},
    ):
        with pytest.raises(schema.SchemaError):
            schema.parse_schema(bad)


def test_ops():
    l = ["a", "b", "c", "d"]
    assert ops.rotate(l) == ["b", "c", "d", "a"]
    assert ops.rotate(l, -1) == ["d", "a", "b", "c"]
    assert ops.rotate([], 3) == []
    assert ops.move(l, 0, -1) == ["b", "c", "d", "a"]
    assert ops.move(l, 3, 0) == ["d", "a", "b", "c"]
    assert ops.add(l, "x", 0) == ["x", "a", "b", "c", "d"]
    assert ops.add(l, "x", -1) == ["a", "b", "c", "d", "x"]
    assert ops.add(l, "x") == ["a", "b", "c", "d", "x"]
    assert ops.find(l, match="B") == [1]
    assert ops.find(l, index=-1) == [3]
    with pytest.raises(ops.OpError):
        ops.find(l, index=4)
    objs = [{"p": "a", "on": True}, {"p": "b", "on": True}]
    idx = ops.find(objs, match={"p": "B"})
    assert ops.update(objs, idx, data={"on": False}) == [{"p": "a", "on": True}, {"p": "b", "on": False}]
    assert ops.remove(objs, ops.find(objs, match={"on": True})) == []
    assert l == ["a", "b", "c", "d"]  # the original list is not changed
