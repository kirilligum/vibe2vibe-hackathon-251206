#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="$ROOT/.gemini/commands"

mkdir -p "$TARGET"

cp "$ROOT/gemini_commands/v2vplan.toml" "$TARGET/v2vplan.toml"
cp "$ROOT/gemini_commands/v2vplan-template.md" "$TARGET/v2vplan-template.md"

echo "Installed /v2vplan locally in $TARGET"
echo "Run from repo root: gemini /v2vplan"
