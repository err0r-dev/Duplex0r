# Changelog

All notable changes to this project will be documented here.

## [0.0.1] - 2025-02-17

### Implemented
- Initial FastAPI service scaffold with UUID-first schema, file persistence helpers, and PDF interlacing utility.
- React + React Native Web front-end with drag-and-drop ordering, PDF previews, settings tab, and theme toggling.
- Start/stop orchestration that provisions Postgres (Docker or local cluster), syncs Python and Node dependencies, and opens the workspace automatically.
- Logging endpoints and per-session storage that avoid committing generated PDFs or database volumes.

### Current Issues
- Backend currently fails to start correctly when launched through the helper scripts because dependency sync and module path handling still surface runtime errors; UI displays “Unable to start a new session”.
- Local PostgreSQL fallback works, but clashes with existing Postgres instances can still interrupt startup despite the port probing logic.
- Frontend cannot complete the upload flow until the backend service is stable; expect runtime banners and incomplete job records.
- Repository-wide configuration including `.gitignore`, environment templates, and documentation guidance for running the stack.
