#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$PROJECT_ROOT"

usage() {
  cat <<USAGE
Usage: ./run_local.sh [--no-install]

Options:
  --no-install   Skip dependency installation, just run the app

Environment:
  PY             Python executable (default: python3)
USAGE
}

NO_INSTALL=false
for arg in "${@:-}"; do
  case "$arg" in
    --no-install) NO_INSTALL=true ;;
    -h|--help) usage; exit 0 ;;
  esac
done

PY=${PY:-python3}

if [ ! -d venv ]; then
  echo "📦 Creating venv..."
  $PY -m venv venv
fi

if [ "$NO_INSTALL" != true ]; then
  echo "📦 Installing requirements..."
  "$PROJECT_ROOT/venv/bin/pip" install --upgrade pip wheel
  # Try standard install first; if pandas/numpy wheels fail, retry with binary-only
  if ! "$PROJECT_ROOT/venv/bin/pip" install -r requirements.txt; then
    echo "⚠️  Standard install failed. Retrying with binary-only wheels for heavy packages..."
    "$PROJECT_ROOT/venv/bin/pip" install --only-binary=all pandas numpy || true
    "$PROJECT_ROOT/venv/bin/pip" install -r requirements.txt
  fi
fi

echo "▶️  Starting FollowScope at http://localhost:8080"
exec "$PROJECT_ROOT/venv/bin/python" web_app/app.py
