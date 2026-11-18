# Memory Garden

**A calmer way to review Anki cards on your Mac.**

Memory Garden is a lightweight, local-first review interface built with plain HTML, CSS, and JavaScript. It connects to the official Anki desktop app through [AnkiConnect](https://github.com/amikey/anki-connect), so Anki remains responsible for scheduling, review history, and AnkiWeb synchronization.

**Documentation:** English · [日本語](README.ja.md) · [简体中文](README.zh-CN.md)

> [!NOTE]
> This is an independent prototype, not an official Anki client. Real-card review and synchronization have not yet been tested against every Anki version or card template.

## Features

- Clean dashboard, light/dark themes, and adjustable daily goals (5–30 reviews).
- Deck browsing, due counts, today's review count, and a seven-day overview when supported by AnkiConnect.
- Front/back review and native Anki grading (`Again`, `Hard`, `Good`, `Easy`, as available).
- Keyboard controls: `Space` to reveal and `1`–`4` to grade.
- Sample cards when Anki is disconnected; sample reviews never modify your collection.
- Sandboxed card rendering with support for common local images and audio.
- **One-click Mac launcher:** start Anki if needed, run the local web server in the background, and open the interface without leaving a Terminal window open.

## Requirements

- macOS with the official [Anki Desktop](https://apps.ankiweb.net/) application.
- [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on (`2055492159`), installed and enabled in Anki.
- Python 3 for the small local HTTP server. No Node.js installation or `npm install` is required to run the app.
- A modern browser (Safari, Chrome, or Firefox).

> **Important:** The third-party product named *AnkiApp* / *AlgoApp* is not the official Anki desktop application and is not compatible with this setup.

## Quick start on macOS (recommended)

1. Clone the repository anywhere you wish to keep it:

   ```sh
   git clone https://github.com/14101Bits/memory-garden.git
   cd memory-garden
   ```

2. Compile and install the personal launcher (one-time setup):

   ```sh
   bash macos/install.command
   ```

3. Find **Memory Garden.app** in `~/Applications`, drag it to your Dock, and click it whenever you want to study. It will:

   - Open Anki if it is not already running (or continue in demo mode if Anki is unavailable).
   - Reuse an existing Memory Garden server, or start one bound to `127.0.0.1:4173`.
   - Open <http://127.0.0.1:4173> in your default browser.

   Repeated clicks will not intentionally start another server on the same port. The background server remains running after the browser closes.

4. In Anki, open **Tools → Add-ons → AnkiConnect → Config**. Keep the existing JSON settings and add the following origins to `webCorsOriginList`:

   ```json
   "webCorsOriginList": ["http://127.0.0.1:4173", "http://localhost:4173"]
   ```

   This is a **JSON property**, not a complete replacement configuration. AnkiConnect may also ask you to approve the page's access. Keep Anki running while you review.

To stop the web server without quitting Anki:

```sh
bash macos/stop.command
```

If you move the cloned project, run `bash macos/install.command` again to update the launcher's saved path. It preserves the previous launcher as a backup. Normal `git pull` updates the web code directly.

**Security:** The launcher runs as your normal macOS user, does not request `sudo`, and does not disable Gatekeeper. If macOS warns about the locally compiled app, inspect the script and use the normal **System Settings → Privacy & Security** review flow; do not disable system-wide security protections. Automatic launch at login is **not enabled by default**.

## Manual start (without the Mac launcher)

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Run the command from the repository directory, then open <http://127.0.0.1:4173>. The legacy `start.command` also works. Do not open `index.html` directly via `file://`; local API access requires an HTTP origin.

## Architecture

```text
Memory Garden (local web UI, 127.0.0.1:4173)
       ↓ AnkiConnect JSON API (127.0.0.1:8765)
Anki Desktop (cards, scheduler, review history)
       ↓ normal Anki sync
AnkiWeb → other official Anki clients
```

Memory Garden never signs in to AnkiWeb directly or uploads your collection to another service. The **Sync AnkiWeb** button asks desktop Anki to synchronize; confirm completion in Anki itself. The browser only remembers your theme and daily goal locally.

## Known limitations

- The desktop Anki app must be open for real reviews. Do not review the same card concurrently in Anki and Memory Garden.
- Advanced card templates using JavaScript, TTS, videos, or special add-ons may render differently or require the native Anki reviewer.
- Some dashboard counters depend on optional AnkiConnect actions; unsupported counters may display `—`.
- The web server listens only on the local loopback interface. **Do not expose port `8765` or your AnkiConnect API to the internet.**
- If port `4173` is occupied by another application, the launcher stops and displays an error rather than replacing that process.
- After a Mac reboot, the server is off until you click the app again. The app is intentionally on-demand to save resources.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| "Python 3 is required" | Install Python 3, then click the launcher again. |
| Anki remains disconnected | Start Anki, enable AnkiConnect, and verify the `webCorsOriginList` entry. |
| Port `4173` is occupied | Stop the conflicting app, or stop a previous Memory Garden instance with `bash macos/stop.command`. |
| The app cannot locate the project | Rerun `bash macos/install.command` from the repository's new location. |
| The server will not start | See `~/Library/Logs/MemoryGarden/server.log`. |

## Development

No build step is required. The project is split into `index.html`, `styles.css`, `main.js`, and testable helpers in `lib.js`.

```sh
npm test
```

This requires Node.js **only for tests**. Mac launcher sources live in `macos/`. The launcher creates a personal app in `~/Applications`; no generated `.app` bundle is tracked in Git.

Contributions and issue reports are welcome. When reporting AnkiConnect issues, include your Anki version, add-on version, and whether the same action works in the official Anki reviewer.
