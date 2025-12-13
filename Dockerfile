# =============================================================================
# Stage 1: Frontend Builder
# =============================================================================
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

# Copy package files first for layer caching
COPY frontend/package.json frontend/package-lock.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build the frontend with relative API path for production
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# =============================================================================
# Stage 2: Python Dependencies
# =============================================================================
FROM python:3.13-slim AS python-builder

WORKDIR /app

# Install UV
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies (without dev dependencies)
RUN uv sync --frozen --no-dev

# =============================================================================
# Stage 3: Production Runtime
# =============================================================================
FROM python:3.13-slim AS production

WORKDIR /app

# Copy UV from builder (useful for potential runtime commands)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy virtual environment from python-builder
COPY --from=python-builder /app/.venv /app/.venv

# Copy dependency files (needed for uv to recognize the project)
COPY pyproject.toml uv.lock ./

# Copy application code
COPY backend/ ./backend/

# Copy built frontend assets
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create data directories with proper permissions
RUN mkdir -p /app/backend/api/data/output && chmod -R 777 /app/backend/api/data

# Set environment variables
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Run the application
CMD ["uvicorn", "backend.api.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
