#!/bin/bash
set -euo pipefail

# Install a native AppleScript app into the current user's Applications folder.
# No sudo, login item, or security-setting change is required.
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This installer must be run on macOS." >&2
  exit 1
fi

project_root="$(cd "$(dirname "$0")/.." && pwd -P)"
source_script="$project_root/macos/MemoryGarden.applescript"
applications_dir="${MEMORY_GARDEN_APPLICATIONS_DIR:-$HOME/Applications}"
application_path="$applications_dir/Memory Garden.app"

if ! command -v osacompile >/dev/null 2>&1; then
  echo "AppleScript compiler (osacompile) is unavailable on this Mac." >&2
  exit 1
fi

if [[ -e "$application_path" && ! -f "$application_path/Contents/Resources/project-root.txt" ]]; then
  echo "An unrelated app already exists at: $application_path" >&2
  echo "Please move or rename it manually; nothing was changed." >&2
  exit 1
fi

mkdir -p "$applications_dir"
build_dir="$(mktemp -d "${TMPDIR:-/tmp}/memory-garden-install.XXXXXX")"
trap 'rm -rf -- "$build_dir"' EXIT

osacompile -o "$build_dir/Memory Garden.app" "$source_script"
printf '%s\n' "$project_root" > "$build_dir/Memory Garden.app/Contents/Resources/project-root.txt"

if [[ -e "$application_path" ]]; then
  backup_path="$applications_dir/Memory Garden.backup.$(date +%Y%m%d-%H%M%S).$$.app"
  mv -- "$application_path" "$backup_path"
  echo "Previous launcher preserved at: $backup_path"
fi

mv -- "$build_dir/Memory Garden.app" "$application_path"

echo "Installed: $application_path"
echo "Drag Memory Garden.app to the Dock. Click it whenever you want to study."
echo "If you move the project directory, rerun this installer."
open -R "$application_path" || true
