#!/usr/bin/env bash
# Run the whole template locally with no database to install: API on :8010 (in-memory demo data), web app on :3000.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"
if [ ! -d .venv ]; then
  if command -v uv >/dev/null; then uv venv -q --python 3.12 .venv && uv pip install -q --python .venv/bin/python -r requirements.txt
  else python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt; fi
fi
.venv/bin/uvicorn server:app --host 127.0.0.1 --port 8010 &
API=$!
trap 'kill $API 2>/dev/null' EXIT
cd "$ROOT/frontend"
[ -d node_modules ] || npm install --silent
echo ""
echo "  Job OS is starting:  http://localhost:3000   (demo login buttons on the sign-in page)"
echo "  API docs:            http://127.0.0.1:8010/docs"
echo ""
npx vite --port 3000
