#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT_DIR/scripts/.processes"
LOG_DIR="$ROOT_DIR/logs"
CACHE_DIR="$ROOT_DIR/.uv-cache"
APP_URL="http://localhost:5173"
LOCAL_DB_DIR="$ROOT_DIR/.postgres-data-local"

DEFAULT_DB_PORT=5432
PORT_CANDIDATES=(5432 5433 5434 5435 5436 5437 5438 5439 5440 5441 5442 5443 5444 5445 5446 5447 5448 5449 5450)

if [[ -n "${DUPL3X_DATABASE_PORT:-}" ]]; then
  PG_PORT="${DUPL3X_DATABASE_PORT}"
  CUSTOM_DB_PORT=true
else
  PG_PORT=$DEFAULT_DB_PORT
  CUSTOM_DB_PORT=false
fi

mkdir -p "$LOG_DIR" "$CACHE_DIR"

if ! command -v lsof >/dev/null 2>&1; then
  echo "The 'lsof' utility is required to probe free ports. Install it (e.g. via Homebrew) and rerun." >&2
  exit 1
fi

is_port_in_use() {
  lsof -PiTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

if [[ "$CUSTOM_DB_PORT" == "false" ]] && is_port_in_use "$PG_PORT"; then
  for candidate in "${PORT_CANDIDATES[@]}"; do
    if ! is_port_in_use "$candidate"; then
      PG_PORT=$candidate
      break
    fi
  done
fi

if is_port_in_use "$PG_PORT"; then
  echo "Database port $PG_PORT is already in use. Set DUPL3X_DATABASE_PORT to a free port or stop the conflicting service." >&2
  exit 1
fi

export DUPL3X_DATABASE_PORT="$PG_PORT"
echo "Using PostgreSQL port $PG_PORT"

DB_MODE="docker"
if [[ "${USE_LOCAL_DB:-}" == "1" || "${USE_LOCAL_DB:-}" == "true" ]]; then
  DB_MODE="local"
elif ! command -v docker >/dev/null 2>&1; then
  DB_MODE="local"
fi

if [[ -f "$PID_FILE" ]]; then
  echo "Process tracker $PID_FILE already exists. Run scripts/stop.sh before starting new services." >&2
  exit 1
fi

if [[ "$DB_MODE" == "docker" ]]; then
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
  else
    echo "Docker Compose is not available. Falling back to local PostgreSQL." >&2
    DB_MODE="local"
  fi
fi

if [[ "$DB_MODE" == "docker" ]]; then
  echo "Starting PostgreSQL via Docker..."
  if [[ ${COMPOSE_CMD[0]} == "docker" ]]; then
    "${COMPOSE_CMD[@]}" up -d --force-recreate --wait db >/dev/null 2>&1 || "${COMPOSE_CMD[@]}" up -d --force-recreate db
  else
    "${COMPOSE_CMD[@]}" up -d --force-recreate db
  fi

  echo -n "Waiting for database to become ready"
  for _ in {1..30}; do
    if "${COMPOSE_CMD[@]}" exec -T db pg_isready -U postgres >/dev/null 2>&1; then
      echo " ✔"
      break
    fi
    echo -n "."
    sleep 1
  done
  echo "db_mode:docker" >>"$PID_FILE"
else
  if ! command -v pg_ctl >/dev/null 2>&1; then
    if command -v brew >/dev/null 2>&1; then
      echo "PostgreSQL not found. Installing via Homebrew..."
      brew install postgresql@16 >/dev/null 2>&1 || {
        echo "Failed to install PostgreSQL via Homebrew." >&2
        exit 1
      }
      brew link postgresql@16 --force >/dev/null 2>&1 || true
    else
      echo "PostgreSQL binaries are required. Install PostgreSQL (e.g. via Homebrew) or enable Docker, then rerun." >&2
      exit 1
    fi
  fi

  if ! command -v pg_ctl >/dev/null 2>&1 || ! command -v initdb >/dev/null 2>&1 || ! command -v pg_isready >/dev/null 2>&1 || ! command -v psql >/dev/null 2>&1 || ! command -v createdb >/dev/null 2>&1; then
    echo "PostgreSQL client utilities (pg_ctl, initdb, pg_isready, psql, createdb) are not available on PATH." >&2
    exit 1
  fi

  mkdir -p "$LOCAL_DB_DIR"
  if [[ ! -f "$LOCAL_DB_DIR/PG_VERSION" ]]; then
    echo "Initialising local PostgreSQL cluster in $LOCAL_DB_DIR ..."
    PASSFILE=$(mktemp)
    printf 'postgres\n' >"$PASSFILE"
    initdb -D "$LOCAL_DB_DIR" --username=postgres --pwfile="$PASSFILE" --encoding=UTF8 >/dev/null
    rm -f "$PASSFILE"
  fi

  echo "Starting local PostgreSQL..."
  pg_ctl -D "$LOCAL_DB_DIR" -l "$LOG_DIR/postgres.log" -o "-p $PG_PORT" start >/dev/null

  echo -n "Waiting for database to become ready"
  for _ in {1..30}; do
    if pg_isready -h 127.0.0.1 -p "$PG_PORT" -U postgres >/dev/null 2>&1; then
      echo " ✔"
      break
    fi
    echo -n "."
    sleep 1
  done

  echo "db_mode:local" >>"$PID_FILE"
  echo "db_data:$LOCAL_DB_DIR" >>"$PID_FILE"
fi
echo "db_port:$PG_PORT" >>"$PID_FILE"

if [[ "$DB_MODE" == "local" ]]; then
  export PGPASSWORD=postgres
  if ! psql -h 127.0.0.1 -p "$PG_PORT" -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'dupl3x'" >/dev/null 2>&1; then
    createdb -h 127.0.0.1 -p "$PG_PORT" -U postgres dupl3x >/dev/null 2>&1 || {
      echo "Failed to create dupl3x database in local PostgreSQL instance." >&2
      exit 1
    }
  fi
  unset PGPASSWORD
fi

echo "Bootstrapping backend dependencies via uv..."
if UV_CACHE_DIR="$CACHE_DIR" uv sync --project "$ROOT_DIR/backend" >>"$LOG_DIR/backend-install.log" 2>&1; then
  echo "Backend dependencies are in sync."
else
  echo "uv sync failed, continuing (uv run will attempt to materialise dependencies on demand)." >&2
fi

UV_CACHE_DIR="$CACHE_DIR" nohup uv run --project "$ROOT_DIR/backend" \
  uvicorn --app-dir "$ROOT_DIR/backend" app.main:app --host 0.0.0.0 --port 8000 \
  >"$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "backend:$BACKEND_PID" >>"$PID_FILE"

echo "Ensuring frontend dependencies are installed..."
(cd "$ROOT_DIR/frontend" && npm install --no-audit --no-fund) >>"$LOG_DIR/frontend.log" 2>&1

echo "Starting frontend dev server..."
(
  cd "$ROOT_DIR/frontend"
  BROWSER=none nohup npm run dev -- --host 0.0.0.0 --port 5173 \
    >>"$LOG_DIR/frontend.log" 2>&1 &
  FRONTEND_PID=$!
  echo "frontend:$FRONTEND_PID" >>"$PID_FILE"
)

# shellcheck disable=SC2002
FRONTEND_PID=$(grep '^frontend:' "$PID_FILE" | cut -d: -f2)
if [[ -z "$FRONTEND_PID" ]]; then
  echo "Failed to start frontend server." >&2
  exit 1
fi

sleep 2

if command -v open >/dev/null 2>&1; then
  open "$APP_URL" || true
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$APP_URL" >/dev/null 2>&1 || true
elif command -v start >/dev/null 2>&1; then
  start "" "$APP_URL" || true
fi

echo "Services started. Backend PID $BACKEND_PID, frontend PID $FRONTEND_PID."
echo "Visit $APP_URL. Logs live in $LOG_DIR. Use scripts/stop.sh to shut everything down."
