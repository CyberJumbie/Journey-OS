#!/usr/bin/env python3
"""
RLM REPL — Persistent Python REPL for document processing.
Used by Claude Code's root LLM to manage large context files
without consuming the main context window.

Usage:
    python3 .claude/skills/rlm/scripts/rlm_repl.py
    >>> load(".context/source/02-architecture/ARCHITECTURE.md")
    >>> peek("ARCHITECTURE.md")
    >>> chunks = chunk(source_docs["ARCHITECTURE.md"], size=4000)
    >>> search("WorkbenchState", source_docs)
"""

import os
import re
import json
from pathlib import Path

# Document storage
source_docs: dict[str, str] = {}


def load(path: str) -> str:
    """Load a document into memory and return its size."""
    p = Path(path)
    if not p.exists():
        return f"ERROR: File not found: {path}"
    text = p.read_text(encoding="utf-8")
    name = p.name
    source_docs[name] = text
    return f"Loaded {name}: {len(text)} chars, {len(text.split())} words"


def peek(doc_name: str, start: int = 0, end: int = 1000) -> str:
    """Sample a document without loading it fully into context."""
    if doc_name not in source_docs:
        return f"ERROR: {doc_name} not loaded. Use load(path) first."
    return source_docs[doc_name][start:end]


def chunk(text: str, size: int = 4000) -> list[str]:
    """Split text into chunks, preferring section boundaries."""
    # Try to split on markdown headings first
    sections = re.split(r'\n(?=#{1,3} )', text)
    
    chunks = []
    current = ""
    
    for section in sections:
        if len(current) + len(section) > size and current:
            chunks.append(current.strip())
            current = section
        else:
            current += "\n" + section if current else section
    
    if current.strip():
        chunks.append(current.strip())
    
    # If any chunk is still too large, split by paragraphs
    final_chunks = []
    for c in chunks:
        if len(c) > size * 1.5:
            paragraphs = c.split("\n\n")
            sub_chunk = ""
            for p in paragraphs:
                if len(sub_chunk) + len(p) > size and sub_chunk:
                    final_chunks.append(sub_chunk.strip())
                    sub_chunk = p
                else:
                    sub_chunk += "\n\n" + p if sub_chunk else p
            if sub_chunk.strip():
                final_chunks.append(sub_chunk.strip())
        else:
            final_chunks.append(c)
    
    return final_chunks


def search(query: str, docs: dict[str, str] | None = None) -> list[dict]:
    """Search across loaded documents for a query string."""
    target = docs or source_docs
    results = []
    
    pattern = re.compile(re.escape(query), re.IGNORECASE)
    
    for name, text in target.items():
        matches = list(pattern.finditer(text))
        for m in matches:
            # Get surrounding context (200 chars each side)
            start = max(0, m.start() - 200)
            end = min(len(text), m.end() + 200)
            results.append({
                "doc": name,
                "position": m.start(),
                "context": text[start:end],
            })
    
    return results


def extract(doc_name: str, section_heading: str) -> str:
    """Extract a specific section by its heading."""
    if doc_name not in source_docs:
        return f"ERROR: {doc_name} not loaded."
    
    text = source_docs[doc_name]
    
    # Find the heading
    pattern = re.compile(
        rf'^(#{1,4})\s+.*{re.escape(section_heading)}.*$',
        re.MULTILINE | re.IGNORECASE
    )
    match = pattern.search(text)
    
    if not match:
        return f"ERROR: Section '{section_heading}' not found in {doc_name}"
    
    heading_level = len(match.group(1))
    start = match.start()
    
    # Find the next heading at same or higher level
    next_heading = re.compile(
        rf'^#{{{1},{heading_level}}}\s+',
        re.MULTILINE
    )
    remaining = text[match.end():]
    next_match = next_heading.search(remaining)
    
    if next_match:
        end = match.end() + next_match.start()
    else:
        end = len(text)
    
    return text[start:end].strip()


def list_docs() -> str:
    """List all loaded documents with sizes."""
    if not source_docs:
        return "No documents loaded."
    lines = []
    for name, text in source_docs.items():
        lines.append(f"  {name}: {len(text):,} chars, {len(text.split()):,} words")
    return "\n".join(lines)


def headings(doc_name: str) -> list[str]:
    """List all markdown headings in a document."""
    if doc_name not in source_docs:
        return [f"ERROR: {doc_name} not loaded."]
    
    text = source_docs[doc_name]
    heading_pattern = re.compile(r'^(#{1,4})\s+(.+)$', re.MULTILINE)
    
    results = []
    for m in heading_pattern.finditer(text):
        level = len(m.group(1))
        title = m.group(2).strip()
        indent = "  " * (level - 1)
        results.append(f"{indent}{title}")
    
    return results


if __name__ == "__main__":
    print("RLM REPL initialized. Functions: load, peek, chunk, search, extract, list_docs, headings")
    print("Documents are stored in source_docs{} dictionary.")
    # In interactive mode, this runs as a persistent REPL
    # Claude Code interacts with it via bash commands
