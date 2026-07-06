#!/usr/bin/env python3
"""Deterministic helpers for repository-local skill vendoring.

This script intentionally does not clone remote repositories or make selection
choices. It provides stable primitives that the vendor-skills-repo skill can use
for hashing, discovery, and lock-file normalization.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from pathlib import Path
from typing import Any

LOCKFILE = "vendor-skills.lock.json"


def sha256_dir(path: Path) -> str:
    """Return a deterministic sha256 for all files under path."""
    if not path.is_dir():
        raise SystemExit(f"not a directory: {path}")

    digest = hashlib.sha256()
    files = sorted(
        p for p in path.rglob("*")
        if p.is_file() and p.name != ".DS_Store"
    )
    for file_path in files:
        rel = file_path.relative_to(path).as_posix()
        digest.update(rel.encode("utf-8"))
        digest.update(b"\0")
        digest.update(hashlib.sha256(file_path.read_bytes()).hexdigest().encode("ascii"))
        digest.update(b"\n")
    return digest.hexdigest()


def split_frontmatter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---\n"):
        return {}, text
    end = text.find("\n---", 4)
    if end == -1:
        return {}, text
    raw = text[4:end]
    body = text[end + len("\n---"):].lstrip("\n")
    data: dict[str, str] = {}
    for line in raw.splitlines():
        match = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if match:
            value = match.group(2).strip()
            if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
                value = value[1:-1]
            data[match.group(1)] = value
    return data, body


def fallback_description(body: str) -> str:
    for paragraph in re.split(r"\n\s*\n", body):
        line = " ".join(l.strip(" #\t") for l in paragraph.splitlines()).strip()
        if line:
            return line[:180]
    return ""


def discover_skills(root: Path) -> list[dict[str, str]]:
    candidates = sorted(
        p for p in root.rglob("*")
        if p.is_file() and p.name in {"SKILL.md", "skill.md"}
    )
    skills: list[dict[str, str]] = []
    accepted_dirs: list[Path] = []
    for skill_file in candidates:
        skill_dir = skill_file.parent
        if any(parent in skill_dir.parents for parent in accepted_dirs):
            continue
        text = skill_file.read_text(encoding="utf-8")
        frontmatter, body = split_frontmatter(text)
        name = frontmatter.get("name") or skill_dir.name
        description = frontmatter.get("description") or fallback_description(body)
        skills.append({
            "name": name,
            "description": description,
            "sourcePath": skill_dir.relative_to(root).as_posix(),
            "skillFile": skill_file.relative_to(root).as_posix(),
        })
        accepted_dirs.append(skill_dir)
    return skills


def load_lock(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"version": 1, "skills": {}}
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_lock(path: Path) -> None:
    data = load_lock(path)
    data.setdefault("version", 1)
    data.setdefault("skills", {})
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    hash_parser = sub.add_parser("hash-dir", help="print deterministic content hash for a directory")
    hash_parser.add_argument("dir", type=Path)

    discover_parser = sub.add_parser("discover", help="discover skills below a cloned repo")
    discover_parser.add_argument("repo", type=Path)

    lock_parser = sub.add_parser("normalize-lock", help=f"sort and normalize {LOCKFILE}")
    lock_parser.add_argument("lockfile", nargs="?", type=Path, default=Path(LOCKFILE))

    args = parser.parse_args()
    if args.command == "hash-dir":
        print(sha256_dir(args.dir))
    elif args.command == "discover":
        print(json.dumps(discover_skills(args.repo), indent=2, sort_keys=True))
    elif args.command == "normalize-lock":
        normalize_lock(args.lockfile)


if __name__ == "__main__":
    main()
