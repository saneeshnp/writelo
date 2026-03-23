# Changelog

All notable changes to Writelo will be documented in this file.

## [1.2.0] - 2026-03-23

### New Features

- **Focus Mode** — A new toolbar button (⤢) hides the header, sidebar, and bottom links, leaving the editor as a full-viewport writing surface. Exit by pressing `Escape` or clicking the "Exit focus" button that appears in the top-right corner.
- **Export as .txt** — Right-click any tab to download its content as a plain `.txt` file named after the tab. Works on background tabs too (no need to switch first). Available in the tab context menu alongside Duplicate and Close.

### Visual Improvements

- **Dark theme redesigned** — The default dark theme now uses charcoal gray tones (inspired by Notion's dark palette) instead of the previous blue-navy gradient. Backgrounds, surfaces, modals, and toasts all updated for a warmer, less blue-tinted feel.
- **Default accent color changed to Blue** — The out-of-the-box accent is now Blue (`#3b82f6`) instead of Teal. Existing users with a saved preference are unaffected.
- **Editor focus border removed** — The purple glow that appeared around the editor on focus has been removed for a cleaner look.

### Bug Fixes

- **Light theme toggle switches** — Toggle switch tracks in the Settings modal were nearly invisible on the light theme. They now have a visible inset border when off, which clears cleanly when toggled on.

## [1.1.0] - 2026-03-21

### Improvements

- **Collapsible sidebar** — The tab sidebar can now be collapsed to a slim 32px strip to give more writing space. Preference is saved to `localStorage` and restored on reload. Defaults to collapsed on mobile and expanded on desktop.
- **Sidebar toggle button** — A chevron toggle sits at the top of the sidebar. When expanded, a "Hide" label accompanies the icon. The Add Tab (+) button remains visible in the collapsed strip on all screen sizes.
- **Mobile header overflow menu** — On mobile, secondary actions (Settings, Undo, Preview, Find & Replace, Clear) are tucked behind a ⋯ button to prevent cramping. Copy and the save indicator are always visible. The overflow panel drops as an animated card below the header and closes on outside tap.
- **Mobile header layout fix** — The header is now a single non-wrapping row on mobile, so the Live Sync indicator appearing no longer pushes buttons to a second row. The sync indicator is compacted to an icon-only badge on mobile.
- **Overflow panel animation** — The secondary actions panel slides in with a subtle scale + fade animation when opened.
- **Stacking fix** — The header is raised above the editor container on mobile so the overflow panel always renders on top of the writing area.

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
