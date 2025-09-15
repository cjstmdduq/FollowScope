#!/usr/bin/env bash
set -euo pipefail

echo "🔧 Setting up local dev environment..."

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$PROJECT_ROOT"

PY=${PY:-python3}

if [ ! -d venv ]; then
  echo "📦 Creating venv..."
  $PY -m venv venv
fi

echo "📦 Installing requirements..."
"$PROJECT_ROOT/venv/bin/pip" install --upgrade pip >/dev/null
"$PROJECT_ROOT/venv/bin/pip" install -r requirements.txt

echo "▶️  Starting FollowScope at http://localhost:8080"
exec "$PROJECT_ROOT/venv/bin/python" web_app/app.py

