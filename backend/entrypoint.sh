#!/bin/bash
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Running database migrations..."
  alembic upgrade head
fi

# Default workspace for the filesystem MCP server (its allowed root).
mkdir -p /app/workspace

echo "Starting server..."
if [ "${ENVIRONMENT:-development}" = "development" ]; then
  # Keep local iteration convenient; production runs without a file watcher.
  exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir /app/app
fi
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers
