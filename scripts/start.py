#!/usr/bin/env python3
"""Start the Dupl3x stack (backend + frontend) using uv and npm."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATE_DIR = ROOT / ".dupl3x"
PID_FILE = STATE_DIR / "pids.json"
BACKEND_LOG = STATE_DIR / "backend.log"
FRONTEND_LOG = STATE_DIR / "frontend.log"
BACKEND_PORT = os.environ.get("BACKEND_PORT", "8000")
FRONTEND_PORT = os.environ.get("FRONTEND_PORT", "5173")


def run_command(command: list[str], workdir: Path, label: str) -> None:
    print(f"[+] {label} :: {' '.join(command)}")
    result = subprocess.run(command, cwd=workdir, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"{label} failed with exit code {result.returncode}")


def start_process(command: list[str], workdir: Path, log_path: Path, env: dict[str, str]) -> subprocess.Popen:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_file = open(log_path, "a", buffering=1)
    process = subprocess.Popen(
        command,
        cwd=workdir,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        env=env,
    )
    log_file.write(f"\n=== Launched at {time.strftime('%Y-%m-%d %H:%M:%S')} ===\n")
    log_file.flush()
    return process


def write_pids(backend_pid: int, frontend_pid: int) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "backend_pid": backend_pid,
        "frontend_pid": frontend_pid,
        "backend_port": BACKEND_PORT,
        "frontend_port": FRONTEND_PORT,
    }
    PID_FILE.write_text(json.dumps(payload, indent=2))


def main() -> int:
    STATE_DIR.mkdir(parents=True, exist_ok=True)

    if PID_FILE.exists():
        print("[-] A PID file already exists. Run stop.py before starting new processes.")
        return 1

    try:
        run_command(["uv", "sync"], ROOT, "Installing Python dependencies with uv")
        run_command(["npm", "install"], ROOT / "frontend", "Installing frontend dependencies")
    except RuntimeError as exc:
        print(f"[-] {exc}")
        return 1

    env_common = os.environ.copy()
    env_common["PYTHONUNBUFFERED"] = "1"

    backend_env = env_common.copy()
    backend_command = [
        "uv",
        "run",
        "uvicorn",
        "backend.api.app.main:app",
        "--host",
        "0.0.0.0",
        "--port",
        BACKEND_PORT,
    ]

    frontend_env = env_common.copy()
    frontend_env.setdefault("BROWSER", "none")
    frontend_env["VITE_API_BASE_URL"] = f"http://localhost:{BACKEND_PORT}/api"
    frontend_command = [
        "npm",
        "run",
        "dev",
        "--",
        "--host",
        "0.0.0.0",
        "--port",
        FRONTEND_PORT,
        "--strictPort",
    ]

    print("[+] Starting backend server…")
    backend_process = start_process(backend_command, ROOT, BACKEND_LOG, backend_env)

    print("[+] Starting frontend dev server…")
    frontend_process = start_process(frontend_command, ROOT / "frontend", FRONTEND_LOG, frontend_env)

    write_pids(backend_process.pid, frontend_process.pid)
    print(f"[+] Backend PID: {backend_process.pid} | Frontend PID: {frontend_process.pid}")

    time.sleep(2)
    url = f"http://localhost:{FRONTEND_PORT}"
    print(f"[+] Opening browser at {url}")
    try:
        webbrowser.open(url)
    except Exception as exc:  # pragma: no cover - best effort
        print(f"[!] Unable to open browser automatically: {exc}")

    print("[+] Services launched. Logs available in .dupl3x/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
