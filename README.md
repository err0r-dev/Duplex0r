# Dupl3x

Dupl3x is a lightweight duplexing assistant for the desktop that blends a Python/FastAPI backend, a React + React Native Web frontend, and a PostgreSQL event log. Upload two PDFs, reorder them with drag and drop, preview the merged result, and download an interlaced document that alternates pages from each source file.

## Project layout

```
backend/   FastAPI application, database models, and PDF handling utilities
frontend/  React (Vite) app using React Native Web components and DnD previews
scripts/   Automation helpers to start/stop every service locally
```

Additional top-level assets include a reproducible change log (`CHANGELOG.md`), Docker Compose configuration for PostgreSQL, and workspace-level ignores.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (preferred for the PostgreSQL instance)
- [uv](https://docs.astral.sh/uv/) `0.8+`
- Node.js `>=20.19` (Vite emits warnings on older runtimes)
- npm (bundled with Node.js)
- `lsof` (used to probe open ports; bundled with macOS, otherwise install via your package manager)

If Docker (or Docker Compose) is unavailable, the start helper falls back to a local PostgreSQL cluster. On macOS it will attempt to install `postgresql@16` via Homebrew automatically, otherwise you will need to provision PostgreSQL manually and rerun the script. The helper probes ports `5432-5450` (for both Docker and the local fallback) and exports `DUPL3X_DATABASE_PORT` for the backend so existing installations aren’t disrupted.

The start script will install missing frontend dependencies automatically and `uv run` will materialise the Python virtual environment on demand.

## Quick start

From the repository root:

```bash
./scripts/start.sh
```

The helper script orchestrates everything that is needed:

1. Bootstraps PostgreSQL via Docker Compose (default credentials `postgres/postgres`, database `dupl3x`). If Docker/Compose is missing, it provisions a local PostgreSQL cluster under `.postgres-data-local/`. In either case it selects the first free port in the `5432-5450` range and shares it through `DUPL3X_DATABASE_PORT`.
2. Syncs backend dependencies with UV, launches the FastAPI server, and writes logs to `logs/backend.log`.
3. Runs `npm install` to guarantee frontend packages are present, starts the Vite dev server, and writes logs to `logs/frontend.log`.
4. Opens the default browser to [`http://localhost:5173`](http://localhost:5173). If automatic launch fails, open that URL manually.

Set `USE_LOCAL_DB=true ./scripts/start.sh` to force the local PostgreSQL path even when Docker is installed. Provide a custom port with `DUPL3X_DATABASE_PORT=5433 ./scripts/start.sh` if you need something outside the default scan range.

When you are done, shut everything down and clean up processes with:

```bash
./scripts/stop.sh
```

The stop script stops the frontend and backend processes tracked in `scripts/.processes` and tears down the PostgreSQL container.

## Application flow

1. **Upload & preview** – Select exactly two PDFs. Dupl3x stores them under a per-session folder (ignored by git) and displays the first page of each document for quick visual validation.
2. **Reorder** – Drag and drop the cards to re-sequence the input. Click *Confirm order* to persist the new sequence in PostgreSQL.
3. **Interlace** – Provide (or keep) a target filename, interlace the pages, preview the generated document, and download it.
4. **Reset** – Clear the workspace at any time to remove uploaded PDFs and generated artefacts while keeping the action log intact.

All user actions and server-side failures are logged to PostgreSQL tables with UUID primary keys. Frontend exceptions are bubbled to the backend through `/api/logs/errors` for a single source of truth.

## Backend notes

- Service entrypoint: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Dependencies managed via `backend/pyproject.toml` (UV). Use `uv run --project backend ...` for ad-hoc commands.
- Uploaded files live in `backend/storage/<session-id>` and are never committed. Generated PDFs follow the same rule.
- Database schema: `sessions`, `session_files`, `interlaced_jobs`, `action_logs`, and `error_logs` tables—each uses `UUID` primary keys.

## Frontend notes

- Built with Vite + React + TypeScript and React Native Web components for responsive design.
- Drag and drop powered by `@dnd-kit`, PDF previews via `react-pdf` (PDF.js).
- Dark mode toggles at runtime; theme state is stored in `document.body.dataset.theme`.
- Proxying is configured in `vite.config.ts` so `/api` calls during development route to `http://localhost:8000` automatically.

## Keeping credentials visible

The **Settings** tab in the UI surfaces the default local database connection details (host, port, user, password, database). They are also reflected in `backend/.env.example` should you need to override them.

## Logs & troubleshooting

- Backend logs: `logs/backend.log`
- Frontend logs: `logs/frontend.log`
- Docker/PostgreSQL logs: `docker compose logs db`

## Known issues (0.0.1)

- Backend startup currently fails with import and schema errors when launched through `scripts/start.sh`, which surfaces in the UI as “Unable to start a new session”. Inspect `logs/backend.log` for the active traceback before attempting further work.
- Even with automatic port probing, other PostgreSQL instances binding to ports in the 5432–5450 range can prevent the helper from provisioning the database. Set `DUPL3X_DATABASE_PORT` manually if the script exits early.
- Frontend flows (upload, order, interlace) are blocked until the backend issues are resolved; expect incomplete sessions and missing job previews.

If you encounter issues while the UI is open, they will appear inline as banners and the frontend will push the error context to the backend logging endpoint for persistence.

## Development tips

- Use `uv run --project backend pytest` for tests once they are added.
- `npm run dev` (frontend) and `uv run --project backend uvicorn app.main:app --reload` can be executed manually if you prefer decoupled workflows.
- Avoid committing database volumes (`.postgres-data/`) or generated PDFs—`.gitignore` protects these paths by default.

Refer to `CHANGELOG.md` for a concise summary of historical changes.
