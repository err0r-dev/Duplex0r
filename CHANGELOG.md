# Changelog

All notable changes to Duplex0r PDF Interleaver will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.5] - 2025-12-13

### Added

#### Docker Support

- **Dockerfile** - Multi-stage build for production-ready container image
- **docker-compose.yml** - Single command deployment with `docker-compose up -d`
- **Static file serving** - Frontend served from FastAPI in production mode via `SERVE_FRONTEND` environment variable
- **.dockerignore** - Optimized build context excluding unnecessary files
- **.env.example** - Documentation for environment variables

### Technical Details

- Multi-stage Docker build: Node.js for frontend compilation, Python 3.13-slim for runtime
- Frontend assets built with Vite and served directly from FastAPI
- SQLite database persisted via Docker volume (`duplex0r-data`)
- Health check endpoint integration for container orchestration
- Configurable via environment variables: `SERVE_FRONTEND`, `DATABASE_URL`, `ALLOW_ORIGINS`

## [0.6.0] - 2025-11-13

### Added

#### Reverse Page Order Feature

- **Reverse page order checkboxes** - Added checkboxes under each PDF upload zone to reverse page order before interleaving
- **Duplex scanning support** - Perfect for handling back-side scans where pages are in reverse order after flipping the stack
- **Independent control** - Each PDF can be reversed independently via its own checkbox
- **State persistence** - Reverse settings are maintained when swapping files and cleared on reset
- **Backend processing** - Enhanced `interleave_pdfs()` function with `reverse_a` and `reverse_b` parameters
- **API parameters** - Added `reverse_first` and `reverse_second` form fields to `/api/process/` endpoint

#### UI Components

- **Checkbox component** - Added shadcn/ui Checkbox component based on Radix UI
- **Accessible labels** - Clear labels explaining the reverse functionality
- **Intuitive placement** - Checkboxes positioned directly under each PDF upload zone

### Changed

- **API documentation** - Updated curl examples to include the new reverse parameters
- **README** - Enhanced documentation with duplex scanning use case

### Technical Details

- Frontend: Added checkbox state management with `reverseFirstPdf` and `reverseSecondPdf` state variables
- Backend: Modified PDF service to reverse page arrays before interleaving when flags are set
- API: Extended form data handling to accept and process reverse flags as boolean values

## [0.5.0] - 2025-11-06

### Initial Release

First working version of Duplex0r PDF Interleaver - a modern, full-stack web application for interleaving PDF documents.

### Features

#### PDF Processing Engine
- **Page-by-page PDF interleaving** - Merge two PDF files by alternating their pages
- **Configurable page ordering** - Choose between "First→Second" or "Second→First" interleaving order
- **Custom output filenames** - Specify your own filename for the generated PDF with automatic .pdf extension handling
- **Instant browser download** - Processed PDFs download directly to your browser
- **Smart filename suggestions** - Auto-generates descriptive filenames based on input files

#### File Upload Interface
- **Drag-and-drop file zones** - Intuitive drag-and-drop interface for both PDF inputs
- **Click-to-browse fallback** - Traditional file picker as alternative to drag-and-drop
- **File validation** - Ensures only PDF files are accepted
- **Visual feedback** - Shows file size and name after selection
- **File swap functionality** - Quick swap button to exchange the two uploaded files

#### User Interface
- **Dark/light theme toggle** - System-aware theme with manual override
- **Responsive design** - Works seamlessly on desktop, tablet, and mobile devices
- **Progress indication** - Visual feedback during PDF processing
- **Confirmation dialogs** - Prevents accidental actions with confirm/cancel flows
- **Modern green color scheme** - Clean, professional design with Lato, Merriweather, and Roboto Mono fonts

#### Settings & Preferences
- **Persistent default ordering** - Save your preferred page order for future sessions
- **Database-backed storage** - Settings persist across application restarts
- **Quick order toggle** - Switch between ordering modes with one click

#### Activity Logging
- **Complete processing history** - View all past PDF interleaving operations
- **Detailed log entries** - Timestamp, input filenames, order, and status for each operation
- **Status tracking** - Monitor completed, pending, and failed operations
- **Error message capture** - See detailed error information for failed operations
- **Clear logs functionality** - Remove all logs with confirmation dialog
- **Real-time refresh** - Manual refresh button to update the activity log

#### Processing Controls
- **Reset functionality** - Clear all inputs and start fresh
- **Form validation** - Ensures both PDFs are selected before processing
- **Loading states** - Clear visual feedback during operations
- **Error handling** - User-friendly error messages for all failure scenarios

#### Developer Experience
- **One-command startup** - `python scripts/start.py` installs dependencies and starts both servers
- **One-command shutdown** - `python scripts/stop.py` cleanly stops all processes
- **Automatic database setup** - SQLite database created automatically on first run
- **Process management** - PID tracking for clean process lifecycle
- **Separate logging** - Backend and frontend logs in `.duplex0r/` directory
- **Hot reload** - Vite HMR for frontend, Uvicorn reload for backend

### Technical Stack

#### Backend
- **FastAPI** - Modern, high-performance Python web framework
- **SQLAlchemy** (async) - Database ORM with async support
- **PyPDF** - Robust PDF manipulation library
- **SQLite** - Default database with PostgreSQL support via DATABASE_URL
- **Uvicorn** - ASGI server with auto-reload
- **Python 3.13+** - Latest Python features

#### Frontend
- **React 18** - Modern React with hooks
- **Vite** - Next-generation frontend tooling
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components based on Radix UI
- **next-themes** - Theme management with system detection
- **Lucide React** - Beautiful icon library

#### Database Schema
- **processing_logs** table - Tracks all PDF processing operations
- **app_settings** table - Stores user preferences and configuration

#### API Endpoints
- `POST /api/process/` - Process and interleave two PDF files
- `GET /api/logs/` - Retrieve processing history
- `DELETE /api/logs/` - Clear all processing logs
- `GET /api/settings/` - Get current settings
- `POST /api/settings/` - Update settings
- `GET /health` - Health check endpoint

### Configuration

#### Environment Variables
- `DATABASE_URL` - Optional PostgreSQL connection string (defaults to SQLite)
- `BACKEND_PORT` - Backend server port (default: 8000)
- `FRONTEND_PORT` - Frontend server port (default: 5173)
- `VITE_API_BASE_URL` - API base URL for frontend (default: http://localhost:8000/api)

### File Structure

```
Duplex0r/
├── backend/api/        # FastAPI backend application
│   ├── app/           # Application code
│   │   ├── routers/   # API route handlers
│   │   ├── services/  # Business logic
│   │   ├── models.py  # Database models
│   │   ├── schemas.py # Pydantic schemas
│   │   └── database.py # Database configuration
│   └── tests/         # Backend tests
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── lib/       # Utilities
│   │   └── App.tsx    # Main application
│   └── public/        # Static assets
├── scripts/           # Startup and management scripts
│   ├── start.py       # Start both servers
│   └── stop.py        # Stop both servers
└── .duplex0r/        # Runtime data (gitignored)
    ├── pids.json      # Process IDs
    ├── backend.log    # Backend logs
    └── frontend.log   # Frontend logs
```

### Security

- Database files excluded from version control
- Upload directory excluded from version control
- Environment files properly gitignored
- No sensitive data in repository

### Getting Started

1. **Prerequisites:**
   - Python 3.13 or higher
   - Node.js 18 or higher
   - npm or yarn

2. **Quick Start:**
   ```bash
   python scripts/start.py
   ```

3. **Stop Application:**
   ```bash
   python scripts/stop.py
   ```

### Known Limitations

- Maximum PDF file size determined by browser memory
- Processing is synchronous (one operation at a time)
- Output PDFs stored in `backend/api/data/output/` (not auto-cleaned)
- Requires both PDFs to have compatible page structures

### Future Enhancements

Future versions may include:
- Batch processing of multiple PDF pairs
- Async processing with WebSocket progress updates
- Custom page selection (not just alternating)
- PDF preview before download
- Cloud storage integration
- User authentication and multi-user support
- Processing history export

---

## Release Notes

This is the first production-ready release of Duplex0r PDF Interleaver. All core features are functional and tested. The application is ready for personal and professional use for PDF interleaving tasks.

[0.5.0]: https://github.com/yourusername/duplex0r/releases/tag/v0.5.0
