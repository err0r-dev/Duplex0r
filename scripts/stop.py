#!/usr/bin/env python3
"""Stop the Duplex0r stack using the stored PID file."""

from __future__ import annotations

import json
import os
import signal
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATE_DIR = ROOT / ".duplex0r"
PID_FILE = STATE_DIR / "pids.json"


def terminate_process(pid: int, label: str) -> None:
    try:
        os.kill(pid, signal.SIGTERM)
        print(f"[+] Sent SIGTERM to {label} (PID {pid})")
    except ProcessLookupError:
        print(f"[!] {label} (PID {pid}) not running.")
        return

    deadline = time.time() + 10
    while time.time() < deadline:
        try:
            os.kill(pid, 0)
        except ProcessLookupError:
            print(f"[+] {label} has stopped.")
            return
        time.sleep(0.5)

    print(f"[!] {label} did not exit gracefully; sending SIGKILL.")
    try:
        os.kill(pid, signal.SIGKILL)
    except ProcessLookupError:
        pass


def main() -> int:
    if not PID_FILE.exists():
        print("[-] No PID file found. Are the services running?")
        return 1

    try:
        payload = json.loads(PID_FILE.read_text())
    except json.JSONDecodeError as exc:
        print(f"[-] Failed to read PID file: {exc}")
        return 1

    backend_pid = payload.get("backend_pid")
    frontend_pid = payload.get("frontend_pid")

    if backend_pid:
        terminate_process(int(backend_pid), "backend")
    if frontend_pid:
        terminate_process(int(frontend_pid), "frontend")

    try:
        PID_FILE.unlink()
        print("[+] Removed PID file.")
    except FileNotFoundError:
        pass

    return 0


if __name__ == "__main__":
    sys.exit(main())
