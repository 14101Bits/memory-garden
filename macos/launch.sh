#!/bin/bash
set -euo pipefail

# Called by Memory Garden.app. The web server is kept local to this Mac.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"
project_root="$(cd "$(dirname "$0")/.." && pwd -P)"
port=4173
url="http://127.0.0.1:$port"
state_dir="$HOME/Library/Application Support/MemoryGarden"
log_dir="$HOME/Library/Logs/MemoryGarden"
pid_file="$state_dir/server.pid"

if [[ ! -f "$project_root/index.html" ]]; then
  echo "Memory Garden files are missing at: $project_root" >&2
  echo "Restore the repository or reinstall the launcher." >&2
  exit 1
fi

# Start the desktop app only when necessary; the website can still run in demo
# mode if Anki is not installed.
if ! pgrep -x Anki >/dev/null 2>&1; then
  open -a Anki >/dev/null 2>&1 || true
fi

is_memory_garden() {
  curl --silent --show-error --fail --max-time 2 "$url/index.html" 2>/dev/null | grep -Fq '<title>Memory Garden'
}

if ! is_memory_garden; then
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is already used by another application." >&2
    echo "Close that server before launching Memory Garden." >&2
    exit 1
  fi

  if ! command -v python3 >/dev/null 2>&1 || ! python3 -c 'import http.server' >/dev/null 2>&1; then
    echo "Python 3 is required. Install it and try again." >&2
    exit 1
  fi

  umask 077
  mkdir -p "$state_dir" "$log_dir"
  nohup python3 -m http.server "$port" --bind 127.0.0.1 --directory "$project_root" \
    >> "$log_dir/server.log" 2>&1 < /dev/null &
  server_pid=$!
  printf '%s\n' "$server_pid" > "$pid_file"

  ready=false
  for ((attempt=0;attempt<40;attempt++)); do
    if is_memory_garden; then
      ready=true
      break
    fi
    sleep 0.2
  done

  if [[ "$ready" != true ]]; then
    echo "The local server did not start. Check: $log_dir/server.log" >&2
    exit 1
  fi
fi

open "$url"
