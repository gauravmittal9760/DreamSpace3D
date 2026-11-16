#!/usr/bin/env bash
# Render build step: install Python deps, then build the React frontend into frontend/dist
set -euo pipefail
pip install --upgrade pip
pip install -r requirements.txt
cd frontend
if [ ! -f dist/index.html ] || [ "${FORCE_FRONTEND_BUILD:-1}" = "1" ]; then
  npm ci --no-audit --no-fund || npm install --no-audit --no-fund
  NODE_OPTIONS="--max-old-space-size=400" npm run build
fi
# the build tools are not needed at runtime - free the disk
rm -rf node_modules
