#!/usr/bin/env sh
# FitPower launcher for macOS and Linux: installs dependencies on first run,
# builds the app and serves it on http://localhost:5173.
set -e
cd "$(dirname "$0")"

if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js is not installed. Install the LTS version from https://nodejs.org and try again." >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "First run - installing dependencies, this can take a few minutes..."
  npm install
fi

# Your data is saved against http://localhost:5173 exactly. The port is strict,
# so if something else is using it, stop that first rather than changing ports.
URL="http://localhost:5173"
(
  # Open the browser once the server answers (up to ~2 minutes).
  i=0
  while [ "$i" -lt 120 ]; do
    if curl -s -o /dev/null "$URL" 2>/dev/null; then
      if command -v open >/dev/null 2>&1; then open "$URL"
      elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1
      fi
      break
    fi
    i=$((i + 1))
    sleep 1
  done
) &

echo "Starting FitPower on $URL (Ctrl+C to stop)"
exec npm start
