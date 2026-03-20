# Changelog

All notable changes to Writelo will be documented in this file.

## [1.0.0] - 2026-03-20

### Initial Release

Writelo is a fast, fully offline text editor that runs entirely in your browser — no account, no server, no installation required. All data is stored locally in your browser's `localStorage`.

### Features

- **Multi-tab editing** — Create and manage multiple named tabs, each with independent content. Tabs auto-save as you type.
- **Auto-save** — Content is saved to `localStorage` with a 600 ms debounce after every keystroke. No data is lost on reload.
- **Undo history** — Custom per-tab undo stack (up to 50 states) triggered via Ctrl+Z / Cmd+Z. Independent from the browser's native undo.
- **Find & Replace** — Opt-in panel with real-time match highlighting, Prev/Next navigation, single and replace-all support, and match count display.
- **Markdown preview** — Renders the active tab's content as formatted HTML using `marked.js`.
- **Copy All** — Copies the full tab content to clipboard with a toast confirmation.
- **Clear** — Clears the active tab after a confirmation dialog.
- **Word & character count** — Live footer stats that update on every keystroke and tab switch.
- **Scroll to Top** — Floating button appears after scrolling 200 px down in the editor.
- **Themes** — Three built-in themes: Dark (default), Light, and Ultra-Dark.
- **Accent colors** — Six accent color options: Purple, Blue, Green, Rose, Amber, and Teal.
- **Export & Import** — Export all tabs to a `.json` file and import them back. Optionally includes app settings in the export bundle.
- **Cross-tab sync** — Multiple browser tabs open to the same file stay in sync via `BroadcastChannel` and the `storage` event.
- **Help section** — In-app help modal covering keyboard shortcuts and feature overview.
- **Favicon** — Custom app icon.
- **Grey theme variant** — Additional grey theme option added to the settings modal.
