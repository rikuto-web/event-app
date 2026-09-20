#!/bin/sh
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting API server..."
exec python3 -m granian --interface asgi app.main:app --host 0.0.0.0 --port 8080
