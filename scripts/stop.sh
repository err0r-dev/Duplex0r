#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT_DIR/scripts/.processes"

DB_MODE=""
DB_DATA=""
if [[ -f "$PID_FILE" ]]; then
  DB_MODE=$(grep '^db_mode:' "$PID_FILE" | tail -n1 | cut -d: -f2)
  DB_DATA=$(grep '^db_data:' "$PID_FILE" | tail -n1 | cut -d: -f2-)
fi

if command -v docker >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
  else
    COMPOSE_CMD=()
  fi
else
  COMPOSE_CMD=()
fi

if [[ -f "$PID_FILE" ]]; then
  while IFS=: read -r name pid; do
    [[ "$name" == "db_mode" || "$name" == "db_data" || "$name" == "db_port" ]] && continue
    [[ -z "$name" || -z "$pid" ]] && continue
    if ps -p "$pid" >/dev/null 2>&1; then
      echo "Stopping $name (PID $pid)..."
      kill "$pid" >/dev/null 2>&1 || true
      kill -- -"$pid" >/dev/null 2>&1 || true
      wait "$pid" 2>/dev/null || true
    fi
  done <"$PID_FILE"
else
  echo "No process tracker found. Skipping app process shutdown."
fi

if [[ "$DB_MODE" == "docker" ]]; then
  echo "Stopping PostgreSQL container..."
  if [[ ${#COMPOSE_CMD[@]} -gt 0 ]]; then
    "${COMPOSE_CMD[@]}" down >/dev/null 2>&1 || true
  else
    echo "Docker Compose not available; skip container shutdown." >&2
  fi
elif [[ "$DB_MODE" == "local" ]]; then
  echo "Stopping local PostgreSQL..."
  if command -v pg_ctl >/dev/null 2>&1 && [[ -n "$DB_DATA" ]]; then
    pg_ctl -D "$DB_DATA" stop -m fast >/dev/null 2>&1 || true
  else
    echo "pg_ctl not available; please stop the local PostgreSQL instance manually." >&2
  fi
fi

rm -f "$PID_FILE"

echo "All services stopped."
