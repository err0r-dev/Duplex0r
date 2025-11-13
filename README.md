# Dupl3x PDF Interleaver

![Version](https://img.shields.io/badge/version-0.6.0-blue.svg)
![Python](https://img.shields.io/badge/python-3.13+-green.svg)
![Node](https://img.shields.io/badge/node-18.18+-green.svg)

Dupl3x is a modern, full-stack web application for interleaving PDF documents. Upload two PDFs, choose the page order, and download a merged result where pages alternate between your documents. Perfect for combining odd/even scanned pages, merging duplex scans, or any scenario requiring page-by-page interleaving.

The FastAPI backend handles PDF processing, activity logging, and settings storage (PostgreSQL-ready with SQLite fallback), while the React + Vite frontend offers an intuitive drag-and-drop interface with dark/light theme support.

## Features

### PDF Processing
- **Page-by-page interleaving** - Merge two PDFs by alternating pages
- **Flexible ordering** - Choose "First→Second" or "Second→First" page order
- **Reverse page order** - Optional checkboxes to reverse each PDF before interleaving (perfect for duplex scanning)
- **Custom filenames** - Specify your own output filename with smart suggestions
- **Instant download** - Processed PDFs download directly to your browser
- **Automatic .pdf extension** - Ensures proper file naming

### User Interface
- **Drag-and-drop upload** - Intuitive file zones for both PDFs with visual feedback
- **Click-to-browse fallback** - Traditional file picker as alternative
- **File validation** - Accepts only PDF files with clear error messages
- **File swap functionality** - Quick button to exchange the two uploaded files
- **Dark/light theme** - System-aware with manual toggle
- **Responsive design** - Works on desktop, tablet, and mobile
- **Progress indication** - Visual feedback during processing
- **Confirmation dialogs** - Prevents accidental actions

### Settings & History
- **Persistent preferences** - Save your default page order
- **Activity log** - Complete history of all processing operations
- **Detailed tracking** - Timestamp, filenames, order, and status for each operation
- **Error capture** - View detailed error messages for failed operations
- **Clear logs** - Remove all history with confirmation
- **Real-time refresh** - Manual refresh button for activity log

### Developer Experience
- **One-command startup** - Single script installs everything and starts both servers
- **One-command shutdown** - Clean process termination
- **Automatic database setup** - No manual schema creation needed
- **Hot reload** - Frontend HMR and backend auto-reload
- **Comprehensive logging** - Separate log files for debugging

## Project Structure

```
Dupl3x/
├── backend/api/           # FastAPI backend application
│   ├── app/
│   │   ├── routers/       # API endpoint handlers
│   │   │   ├── processing.py  # PDF interleaving endpoint
│   │   │   ├── logs.py        # Activity log endpoints
│   │   │   └── settings.py    # User settings endpoints
│   │   ├── services/      # Business logic
│   │   │   └── pdf.py         # PDF interleaving service
│   │   ├── models.py      # SQLAlchemy database models
│   │   ├── schemas.py     # Pydantic request/response schemas
│   │   ├── database.py    # Database configuration
│   │   └── main.py        # FastAPI application setup
│   ├── data/              # Runtime data (gitignored)
│   │   ├── app.db         # SQLite database
│   │   └── output/        # Generated PDF files
│   └── tests/             # Backend tests
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/        # shadcn/ui components
│   │   │   ├── FileDropZone.tsx   # Drag-and-drop component
│   │   │   ├── theme-provider.tsx # Theme management
│   │   │   └── theme-toggle.tsx   # Theme switcher
│   │   ├── lib/           # Utility functions
│   │   ├── App.tsx        # Main application component
│   │   ├── main.tsx       # React entry point
│   │   └── index.css      # Global styles and theme
│   └── public/            # Static assets
├── scripts/
│   ├── start.py           # Start both servers with one command
│   └── stop.py            # Stop both servers cleanly
└── .dupl3x/               # Runtime artifacts (gitignored)
    ├── pids.json          # Process IDs for management
    ├── backend.log        # Backend application logs
    └── frontend.log       # Frontend development logs
```

## Prerequisites

- **Python 3.13 or higher** - [Download Python](https://www.python.org/downloads/)
- **[uv](https://github.com/astral-sh/uv)** - Fast Python package manager (install with `pip install uv`)
- **Node.js 18.18 or higher** - Node 20+ recommended ([Download Node.js](https://nodejs.org/))
- **npm** - Ships with Node.js
- **PostgreSQL** (optional) - For production deployments; SQLite used by default

## Quick Start

### 1. Start the Application

```bash
python scripts/start.py
```

This single command will:
- Install Python dependencies with `uv sync`
- Install frontend dependencies with `npm install`
- Create the SQLite database automatically
- Start the FastAPI backend on port 8000
- Start the Vite dev server on port 5173
- Open your browser to http://localhost:5173

### 2. Use the Application

1. **Upload PDFs** - Drag and drop two PDF files or click to browse
2. **Reverse Pages (Optional)** - Check the boxes to reverse page order for duplex scanning
3. **Choose Order** - Select "First→Second" or "Second→First"
4. **Click Process** - Enter a filename and confirm
5. **Download** - Your interleaved PDF downloads automatically

### 3. Stop the Application

```bash
python scripts/stop.py
```

This cleanly terminates both servers and removes PID files.

## Manual Commands

If you prefer running components separately:

### Backend Only
```bash
uv run uvicorn backend.api.app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Only
```bash
cd frontend
npm install
VITE_API_BASE_URL=http://localhost:8000/api npm run dev -- --host 0.0.0.0 --port 5173
```

### Run Tests
```bash
# Backend unit tests
uvx pytest backend/api/tests/test_pdf.py

# Backend smoke test
uv run python -c "from backend.api.app.main import app; print('App loaded:', bool(app))"

# Frontend build verification
cd frontend && npm run build
```

## Configuration

### Environment Variables

| Variable | Description | Default | Example |
| --- | --- | --- | --- |
| `DATABASE_URL` | Database connection string (async SQLAlchemy format). Falls back to SQLite when unset. | `sqlite+aiosqlite:///backend/api/data/app.db` | `postgresql+asyncpg://user:password@localhost:5432/dupl3x` |
| `BACKEND_PORT` | Port for FastAPI backend server | `8000` | `8080` |
| `FRONTEND_PORT` | Port for Vite development server | `5173` | `3000` |
| `VITE_API_BASE_URL` | API base URL for frontend (auto-set by start.py) | `http://localhost:8000/api` | `https://api.example.com/api` |

### Database Configuration

**SQLite (Default):**
- No setup required - database created automatically
- Location: `backend/api/data/app.db`
- Perfect for development and personal use

**PostgreSQL (Production):**
```bash
export DATABASE_URL="postgresql+asyncpg://username:password@localhost:5432/dupl3x"
python scripts/start.py
```

Schema is created automatically on first startup.

### Output Files

Processed PDF files are saved to:
```
backend/api/data/output/
```

**Note:** This directory is excluded from git. Consider implementing a cleanup strategy for production deployments.

## User Interface

### Main Interface
- **Header** - Application title with theme toggle button
- **Upload Section** - Two drag-and-drop zones for PDF files with reverse page order checkboxes
- **Order Controls** - Toggle between "First→Second" and "Second→First"
- **Action Buttons** - Swap files, Reset form, Process PDFs
- **Settings Panel** - Save default order preference
- **Activity Log** - Complete processing history with Clear All option

### Dialogs
- **Filename Dialog** - Enter custom output filename before processing
- **Progress Dialog** - Shows processing status with progress bar
- **Clear Logs Confirmation** - Prevents accidental data loss

### Theme
- **Light Mode** - Clean white background with green accents
- **Dark Mode** - Dark background with adjusted colors
- **System Detection** - Automatically matches your OS theme
- **Manual Toggle** - Sun/moon icon in header

## API Overview

### Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/process/` | Upload two PDFs (`first_pdf`, `second_pdf`) plus `order`, `reverse_first`, and `reverse_second` fields. Returns interleaved PDF. |
| `GET` | `/api/logs/` | Retrieve processing history with timestamps and status. |
| `DELETE` | `/api/logs/` | Clear all processing logs (requires confirmation in UI). |
| `GET` | `/api/settings/` | Fetch current default order preference. |
| `POST` | `/api/settings/` | Update default order preference. |
| `GET` | `/health` | Health check endpoint (returns `{"status": "ok"}`). |

### Example API Usage

**Process PDFs:**
```bash
curl -X POST http://localhost:8000/api/process/ \
  -F "first_pdf=@document1.pdf" \
  -F "second_pdf=@document2.pdf" \
  -F "order=first_second" \
  -F "reverse_first=false" \
  -F "reverse_second=true" \
  --output result.pdf
```

**Get Processing History:**
```bash
curl http://localhost:8000/api/logs/
```

**Update Settings:**
```bash
curl -X POST http://localhost:8000/api/settings/ \
  -H "Content-Type: application/json" \
  -d '{"default_order": "second_first"}'
```

## Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** (async) - ORM with async support
- **PyPDF** - PDF manipulation
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation
- **pytest** - Testing framework

### Frontend
- **React 18** - UI library with hooks
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Component library (Radix UI)
- **next-themes** - Theme management
- **Lucide React** - Icon library

### Database
- **SQLite** - Default (development)
- **PostgreSQL** - Production-ready option

## Troubleshooting

### Port Already in Use
If ports 8000 or 5173 are taken:
```bash
# Use different ports
export BACKEND_PORT=8080
export FRONTEND_PORT=3000
python scripts/start.py
```

### Database Locked Error
If you see "database is locked":
- Stop the application: `python scripts/stop.py`
- Remove lock: `rm backend/api/data/app.db-journal`
- Restart: `python scripts/start.py`

### Module Not Found
If you see import errors:
```bash
# Reinstall dependencies
uv sync --force
cd frontend && npm install
```

### Permission Errors
If you see permission denied:
```bash
# Linux/macOS - Make scripts executable
chmod +x scripts/start.py scripts/stop.py
```

### Clear All Data
To reset the application:
```bash
python scripts/stop.py
rm -rf backend/api/data/
rm -rf .dupl3x/
python scripts/start.py
```

### Browser Doesn't Open
If the browser doesn't open automatically:
- Manually navigate to http://localhost:5173
- Check if ports are accessible: `curl http://localhost:8000/health`

## Security Considerations

- Database files are excluded from version control via `.gitignore`
- Uploaded PDFs are excluded from version control
- Environment files (`.env`) are excluded from git
- No authentication implemented - suitable for local/trusted networks only
- Consider adding authentication for public deployments

## Development

### Adding New Features

1. **Backend routes:** Add to `backend/api/app/routers/`
2. **Frontend components:** Add to `frontend/src/components/`
3. **Database models:** Update `backend/api/app/models.py`
4. **Tests:** Add to `backend/api/tests/`

### Customizing Themes

Edit `frontend/src/index.css` to modify:
- Color variables (`:root` and `.dark` sections)
- Font families
- Border radius
- Shadow styles

### Building for Production

```bash
# Build frontend
cd frontend
npm run build

# Serve static files with FastAPI
# Add static file mounting in backend/api/app/main.py
```

## Known Limitations

- Maximum file size depends on browser memory
- Processing is synchronous (one operation at a time)
- Output files not automatically cleaned up
- No user authentication
- No cloud storage integration

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the [ERR0R.DEV OPEN USE LICENSE](https://github.com/err0r-dev/.github/blob/main/profile/license.md).

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and release notes.

## Support

For issues and questions:
- Open an issue on GitHub
- Check the Troubleshooting section above
- Review logs in `.dupl3x/backend.log` and `.dupl3x/frontend.log`
