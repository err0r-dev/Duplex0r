from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .database import lifespan
from .routers import logs, processing, settings as settings_router

settings = get_settings()

app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(processing.router, prefix="/api")
app.include_router(settings_router.router, prefix="/api")
app.include_router(logs.router, prefix="/api")


@app.get("/health")
async def health_check():
    return {"status": "ok"}


# Serve frontend static files in production (when SERVE_FRONTEND=true)
if os.getenv("SERVE_FRONTEND", "false").lower() == "true":
    import mimetypes

    # Ensure SVG mime type is registered (some minimal images may lack it)
    mimetypes.add_type("image/svg+xml", ".svg")

    frontend_dist = Path(__file__).resolve().parent.parent.parent.parent / "frontend" / "dist"
    if frontend_dist.exists():
        # Serve static assets (JS, CSS, images)
        assets_dir = frontend_dist / "assets"
        if assets_dir.exists():
            app.mount("/assets", StaticFiles(directory=assets_dir), name="static-assets")

        @app.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            """Serve the SPA index.html for any non-API routes."""
            file_path = frontend_dist / full_path
            if file_path.exists() and file_path.is_file():
                # Determine media type for proper Content-Type header
                media_type, _ = mimetypes.guess_type(str(file_path))
                return FileResponse(file_path, media_type=media_type)
            return FileResponse(frontend_dist / "index.html")
