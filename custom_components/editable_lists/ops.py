"""List operations. No Home Assistant imports."""

from __future__ import annotations

from typing import Any


class OpError(ValueError):
    """The operation cannot be done.

    `key` and `placeholders` map to a translated message in translations/*.json.
    """

    def __init__(self, key: str, **placeholders: Any) -> None:
        self.key = key
        self.placeholders = {k: str(v) for k, v in placeholders.items()}
        super().__init__(f"{key}: {self.placeholders}")


def resolve_index(items: list[Any], index: int, *, allow_end: bool = False) -> int:
    """Index from 0, negative counts from the end (-1 = last)."""
    n = len(items)
    limit = n + 1 if allow_end else n
    i = index + n if index < 0 else index
    if index < 0 and allow_end:
        i = index + n + 1
    if not 0 <= i < limit:
        raise OpError("index_out_of_range", index=index, count=n)
    return i


def matches(item: Any, match: Any) -> bool:
    """An object matches when all keys in `match` have equal values.
    A plain value matches on equality (text is compared case-insensitively)."""
    if isinstance(match, dict):
        if not isinstance(item, dict):
            return False
        return all(_eq(item.get(k), v) for k, v in match.items())
    return _eq(item, match)


def _eq(a: Any, b: Any) -> bool:
    if isinstance(a, str) and isinstance(b, str):
        return a.casefold() == b.casefold()
    return a == b


def find(items: list[Any], *, index: int | None = None, match: Any = None) -> list[int]:
    """Indexes of items selected by index or match."""
    if index is not None:
        return [resolve_index(items, index)]
    if match is None:
        raise OpError("need_index_or_match")
    return [i for i, it in enumerate(items) if matches(it, match)]


def add(items: list[Any], item: Any, position: int | None = None) -> list[Any]:
    out = list(items)
    if position is None:
        out.append(item)
    else:
        out.insert(resolve_index(out, position, allow_end=True), item)
    return out


def update(items: list[Any], idx: list[int], *, data: dict[str, Any] | None = None, item: Any = None) -> list[Any]:
    if (data is None) == (item is None):
        raise OpError("need_data_or_item")
    out = list(items)
    for i in idx:
        if data is not None:
            if not isinstance(out[i], dict):
                raise OpError("not_an_object", index=i)
            out[i] = {**out[i], **data}
        else:
            out[i] = item
    return out


def remove(items: list[Any], idx: list[int]) -> list[Any]:
    drop = set(idx)
    return [it for i, it in enumerate(items) if i not in drop]


def move(items: list[Any], frm: int, to: int) -> list[Any]:
    out = list(items)
    f = resolve_index(out, frm)
    t = resolve_index(out, to)
    out.insert(t, out.pop(f))
    return out


def rotate(items: list[Any], steps: int = 1) -> list[Any]:
    """Positive steps move the start to the end (first becomes last)."""
    if not items:
        return []
    s = steps % len(items)
    return items[s:] + items[:s]
