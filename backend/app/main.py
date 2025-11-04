from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import api_router
from app.config import settings
from app.db.session import AsyncSessionLocal, init_db
from app.utils.audit import log_error

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def handle_startup() -> None:
    await init_db()


@app.middleware("http")
async def capture_unhandled_exceptions(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as exc:  # pragma: no cover - defensive logging
        async with AsyncSessionLocal() as session:
            await log_error(
                session,
                location=f"{request.method} {request.url.path}",
                message=str(exc),
                details={"url": str(request.url)},
            )
            await session.commit()
        raise


app.include_router(api_router)


def get_app() -> FastAPI:
    return app
