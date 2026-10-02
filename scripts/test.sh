#!/usr/bin/env bash
# The template's hidden tests + a frontend build. Run after every change.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend" && .venv/bin/python -m pytest -q -p no:warnings
cd "$ROOT/frontend" && npx vite build >/dev/null && echo "frontend build ok"
