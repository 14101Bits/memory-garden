#!/bin/bash
set -euo pipefail

# Stops ONLY a server previously started by macos/launch.sh.
project_root="$(cd "$(dirname "$0")/.." && pwd -P)"
pid_file="$HOME/Library/Application Support/MemoryGarden/server.pid"

if [[ ! -f "$pid_file" ]]; then
  echo "No managed Memory Garden server was found."
  exit 0
fi

pid="$(<"$pid_file")"
if [[ ! "$pid" =~ ^[0-9]+$ ]]; then
  echo "Invalid PID file; refusing to stop any process." >&2
  exit 1
fi

process_args="$(ps -ww -p "$pid" -o args= 2>/dev/null || true)"
expected_arguments="http.server 4173 --bind 127.0.0.1 --directory $project_root"
if [[ -z "$process_args" ]]; then
  rm -- "$pid_file"
  echo "The server is already stopped. Removed the stale PID file."
elif [[ "$process_args" == *"$expected_arguments"* ]]; then
  kill "$pid"
  rm -- "$pid_file"
  echo "Stopped Memory Garden. Anki remains open."
else
  echo "PID $pid now belongs to another process. Refusing to stop it." >&2
  exit 1
fi
