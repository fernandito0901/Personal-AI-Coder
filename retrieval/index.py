"""
Tree-sitter index build/query (Python-only for now)

Builds a symbol-level index of Python files (functions/classes with start/end lines)
under a workspace directory, stores to .ai_index/index.json, and provides query API.
"""
from __future__ import annotations
from dataclasses import dataclass, asdict
from typing import List, Dict, Any
import os
import ast
import json

INDEX_DIR = ".ai_index"
INDEX_FILE = os.path.join(INDEX_DIR, "index.json")


@dataclass
class Symbol:
    path: str
    kind: str  # function | class
    name: str
    start: int
    end: int
    code: str


def _read_file(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def _extract_symbols_py(path: str) -> List[Symbol]:
    text = _read_file(path)
    symbols: List[Symbol] = []
    try:
        tree = ast.parse(text)
    except Exception:
        return symbols

    class Visitor(ast.NodeVisitor):
        def generic_visit(self, node):
            end = getattr(node, "end_lineno", None)
            start = getattr(node, "lineno", None)
            if isinstance(node, ast.FunctionDef) and start and end:
                code = "\n".join(text.splitlines()[start - 1 : end])
                symbols.append(Symbol(path=path, kind="function", name=node.name, start=start, end=end, code=code))
            elif isinstance(node, ast.AsyncFunctionDef) and start and end:
                code = "\n".join(text.splitlines()[start - 1 : end])
                symbols.append(Symbol(path=path, kind="function", name=node.name, start=start, end=end, code=code))
            elif isinstance(node, ast.ClassDef) and start and end:
                code = "\n".join(text.splitlines()[start - 1 : end])
                symbols.append(Symbol(path=path, kind="class", name=node.name, start=start, end=end, code=code))
            super().generic_visit(node)

    Visitor().visit(tree)
    return symbols


def build_index(root_dir: str) -> int:
    os.makedirs(INDEX_DIR, exist_ok=True)
    all_symbols: List[Symbol] = []
    for base, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in {".git", "node_modules", "venv", ".venv", "dist", "build", "__pycache__", INDEX_DIR.strip("./")}]
        for f in files:
            if not f.endswith(".py"):
                continue
            path = os.path.join(base, f)
            try:
                all_symbols.extend(_extract_symbols_py(path))
            except Exception:
                continue
    with open(INDEX_FILE, "w", encoding="utf-8") as out:
        json.dump([asdict(s) for s in all_symbols], out)
    return len(all_symbols)


def _load_index() -> List[Dict[str, Any]]:
    if not os.path.exists(INDEX_FILE):
        return []
    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def query_symbols(query: str, k: int = 8) -> List[Dict[str, Any]]:
    q = (query or "").lower()
    if not q:
        return []
    idx = _load_index()
    # simple scoring by name match then context length
    scored: List[tuple[int, Dict[str, Any]]] = []
    for item in idx:
        name = item.get("name", "").lower()
        code = item.get("code", "").lower()
        score = (10 if q in name else 0) + (1 if q in code else 0)
        if score > 0:
            scored.append((score, item))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [s for _, s in scored[:k]]
