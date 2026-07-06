# Local HTML Browser — Possibilities

Everything below is *potentially* doable. Some need webview. Some need Obsidian API hacks. Some need you to accept weird tradeoffs. Nothing here is guaranteed on every platform — but none of it is magic either.

Tick what you want. Ignore the rest.

---

## Core browser

- [ ] Load any local `file://` path like Chrome does (HTML, SPA, hash routes like `#/today`)
- [ ] Full back/forward history per tab
- [ ] Hard reload that actually busts cache
- [ ] Stop loading mid-request
- [ ] Home button pinned to your L app / Notion task dashboard
- [ ] Multiple tabs with drag-to-reorder
- [ ] Tab pinning (L app always first)
- [ ] Tab groups / folders ("Work", "Personal", "Dev")
- [ ] Duplicate tab
- [ ] Reopen closed tab (already partly there — extend to full history)
- [ ] Middle-click link → new tab
- [ ] Ctrl+click link → new tab
- [ ] Download manager with progress bars
- [ ] Open downloads in system folder
- [ ] Custom user-agent string (pretend to be Chrome for picky sites)
- [ ] Per-tab session (separate cookies/storage)
- [ ] Shared session across tabs (single login state)
- [ ] Incognito tab (no persistence)
- [ ] Block all external URLs except allowlist
- [ ] Allowlist only your L app folder + Notion API domains
- [ ] Mixed content toggle
- [ ] Disable JS per tab (for testing)
- [ ] Print page
- [ ] Find in page (Ctrl+F)
- [ ] Zoom in/out per tab
- [ ] Full-screen mode (hide Obsidian chrome)
- [ ] Picture-in-picture for video elements
- [ ] PDF rendering inside the browser view
- [ ] Open `localhost` dev servers alongside `file://` apps

---

## Web pages as Obsidian citizens

- [ ] `.webpage` notes that open as live tabs (already started)
- [ ] Pin a web page tab like a note pin
- [ ] Web page tabs persist across Obsidian restarts exactly where you left them
- [ ] Web page tab shows in the tab bar with favicon + title live-updated
- [ ] Right-click vault file → "Open as live page"
- [ ] Right-click vault file → "Open in full browser"
- [ ] Drag `.webpage` file into a split pane
- [ ] Embed a live page inside a markdown note (iframe or webview block)
- [ ] `![[My App.webpage]]` wikilink opens as embedded live view
- [ ] Canvas card that renders a live local app
- [ ] Daily note template that auto-opens your L dashboard
- [ ] Frontmatter `browser-page: true` on any note (already partly there)
- [ ] Sidebar file explorer icon overlay for `.webpage` files
- [ ] Rename `.webpage` note without breaking the URL inside
- [ ] Move `.webpage` note to another folder, URL stays the same
- [ ] Multiple `.webpage` notes pointing at different routes of the same app (`#/today`, `#/inbox`)
- [ ] `.webpage` note stores last visited route and reopens there
- [ ] Graph view node for web pages linked from notes
- [ ] Backlinks to a `.webpage` note from regular markdown
- [ ] Search finds `.webpage` titles and URLs in vault search

---

## L app / Notion task workflow

- [ ] One-click open L app at `#/today` on Obsidian startup
- [ ] Ribbon button that jumps straight to today's view
- [ ] Status bar widget showing today's focus task pulled from L app DOM
- [ ] Obsidian command: "Jump to L inbox"
- [ ] Obsidian command: "Jump to L calendar"
- [ ] Bi-directional link: click a task in L → open related Obsidian note
- [ ] Obsidian note frontmatter links to L app route
- [ ] Capture inbox in Obsidian → POST/message into L app via `postMessage`
- [ ] L app completion events logged to a daily Obsidian note automatically
- [ ] Sync L app XP/level into a markdown progress tracker
- [ ] Obsidian reminder triggers L app notification inside the page
- [ ] Split view: L app on left, today's daily note on right
- [ ] Hotkey toggles between note-taking and task dashboard
- [ ] Offline-first: L app works with no internet, plugin never blocks it
- [ ] Notion API calls from L app allowed through plugin allowlist
- [ ] Cache Notion responses locally for faster loads
- [ ] Show "last synced with Notion" in status bar

---

## Live development

- [ ] Auto-refresh on file save (partly there)
- [ ] Watch entire L app folder recursively
- [ ] Live reload only CSS (no full page flash)
- [ ] Live reload only changed module (HMR-style, if your app supports it)
- [ ] Show which file triggered the reload
- [ ] Disable auto-refresh per tab
- [ ] Manual refresh button in page tab header
- [ ] Hard refresh button in page tab header
- [ ] Console error overlay on top of page when JS crashes
- [ ] Display build errors from Vite/webpack in Obsidian notice
- [ ] Open DevTools docked inside Obsidian instead of floating
- [ ] Remember DevTools open/closed state per project
- [ ] Network tab filtered to show only failed requests
- [ ] One-click copy console errors to clipboard
- [ ] Source maps working in DevTools for local TS/React apps
- [ ] Lighthouse-style basic audit (load time, bundle size warnings)

---

## Developer tools & debugging

- [ ] Toggle Chromium DevTools (partly there)
- [ ] DevTools console forwarded to Obsidian console (partly there)
- [ ] Separate DevTools panel as an Obsidian side pane
- [ ] Element picker → copy CSS selector
- [ ] Inspect localStorage / sessionStorage / IndexedDB from plugin UI
- [ ] Clear site data (cookies, storage) per tab
- [ ] Export HAR network log
- [ ] JavaScript snippet runner against current page
- [ ] Bookmarklet support
- [ ] Inject custom CSS into any loaded page (dark mode fixes, etc.)
- [ ] Inject custom JS on every page load (power users only)
- [ ] UserScript support (Tampermonkey-lite)
- [ ] Performance timeline snapshot
- [ ] Memory usage display for webview process
- [ ] Crash recovery — auto-reload if webview process dies

---

## Obsidian deep integration

- [ ] Command palette entries for every browser action (partly there)
- [ ] Custom hotkeys for all navigation
- [ ] Browser tab appears in Obsidian's "Open recent" list
- [ ] Workspace layout saves browser tabs (like VS Code)
- [ ] Different workspaces open different browser home pages
- [ ] Plugin reads active note and passes context into L app via query string
- [ ] L app reads `?note=Daily/2026-07-07` and shows linked tasks
- [ ] Obsidian theme CSS variables injected into loaded pages
- [ ] Loaded page auto-matches Obsidian light/dark mode
- [ ] Status bar shows current Obsidian vault name + page URL
- [ ] Browser respects Obsidian's font size setting
- [ ] Mobile companion: read-only view of saved `.webpage` notes (stretch goal)
- [ ] Publish `.webpage` notes to web via Obsidian Publish (probably limited)
- [ ] Bases / Dataview queries on `.webpage` metadata (url, title, last opened)

---

## Bookmarks, history, navigation

- [ ] Bookmarks with folders (partly there)
- [ ] Bookmark bar always visible (like Chrome)
- [ ] Import bookmarks from Chrome HTML export
- [ ] Export bookmarks to markdown list
- [ ] History searchable from command palette
- [ ] History grouped by date
- [ ] Clear history per domain or per folder
- [ ] Top sites on new tab page
- [ ] Recent files list from local disk
- [ ] Quick-switch between tabs (Ctrl+Tab overlay)
- [ ] Frecency ranking — most-used pages float to top
- [ ] Smart suggestions in address bar from history

---

## UI & polish

- [ ] Minimal mode — hide all chrome, just the page
- [ ] Compact toolbar for small screens
- [ ] Vertical sidebar layout option
- [ ] Custom toolbar — pick which buttons show
- [ ] Themes: match Obsidian, match Chrome, custom CSS
- [ ] Animated loading bar (partly there)
- [ ] Favicon in tab bar (partly there)
- [ ] Page title in Obsidian tab title live-updated
- [ ] Split browser — two pages side by side in one view
- [ ] Drag URL between splits
- [ ] Picture of page thumbnail in tab hover tooltip
- [ ] Breadcrumb bar for file:// folder navigation
- [ ] Address bar autocomplete from history + filesystem
- [ ] Error pages with helpful messages (not blank screen)
- [ ] "Open in Chrome" fallback button on any error

---

## Security & privacy

- [ ] JS on/off toggle (partly there)
- [ ] Local file access toggle (partly there)
- [ ] Sandbox mode (partly there)
- [ ] Incognito mode (partly there)
- [ ] Block external internet (partly there)
- [ ] Per-site permission prompts ("L app wants to access Notion API")
- [ ] Permission memory — allow once, allow always, deny
- [ ] Warn before loading pages outside a trusted folder
- [ ] Trusted folders list (only `C:/Users/.../Pranav/L/` allowed)
- [ ] Content Security Policy editor for paranoid mode
- [ ] Disable `postMessage` to Obsidian parent
- [ ] Audit log of every URL loaded
- [ ] Password-protect opening external URLs
- [ ] Clear all browser data on Obsidian exit

---

## Automation & scripting

- [ ] Plugin API: `app.plugins.plugins['local-html-browser'].openWebPage(url)`
- [ ] Templater command: open today's L route
- [ ] QuickAdd choice: capture to L app inbox
- [ ] Obsidian URI handler: `obsidian://local-html-browser?url=file://...`
- [ ] Cron-style reload at midnight (refresh `#/today`)
- [ ] Auto-open browser when vault opens (specific vaults only)
- [ ] Auto-close browser when vault closes
- [ ] Shell command export: open URL from terminal into Obsidian browser
- [ ] Webhook listener — external app tells Obsidian to navigate somewhere
- [ ] Macro recorder: replay navigation steps
- [ ] JSON config file for default tabs on startup

---

## Files & local projects

- [ ] Open entire folder as a "project" with index.html auto-detected
- [ ] Directory tree sidebar for local folder (like VS Code explorer)
- [ ] Edit HTML/CSS/JS in Obsidian editor → live preview in browser pane
- [ ] Side-by-side: Monaco editor + browser (local dev environment inside Obsidian)
- [ ] Open multiple local projects, each in its own tab group
- [ ] Symlink vault folder to L app source — edit in Obsidian, run in browser
- [ ] Git status badge on local project tabs
- [ ] Open SVG, XML, TXT, MD as preview (partly there)
- [ ] Serve folder via temporary local HTTP server inside plugin (bypasses some `file://` limits)
- [ ] Custom `local-html-browser://` protocol handler for vault-relative paths

---

## Insane but potentially possible

- [ ] Run two unrelated SPAs simultaneously with isolated storage
- [ ] Browser extension support inside webview (probably not — but investigate)
- [ ] WebRTC / camera / mic for web apps that need them
- [ ] Web Bluetooth / WebUSB for niche apps
- [ ] Service workers on `file://` (Electron flags may allow this)
- [ ] Push notifications from web app → Obsidian notification
- [ ] System tray mini-browser for quick capture
- [ ] Detach browser tab into floating Obsidian window
- [ ] Detach into completely separate OS window (second Electron BrowserWindow via IPC)
- [ ] Remote debug webview from real Chrome DevTools over port 9222
- [ ] Run Playwright tests against the embedded browser
- [ ] Screenshot current page → save to vault attachment
- [ ] OCR screenshot → insert into daily note
- [ ] Voice command: "open today's tasks"
- [ ] AI sidebar reads current page DOM and summarizes your task list
- [ ] Sync browser session between two machines (encrypted)
- [ ] Plugin becomes a general "local app launcher" for any HTML tool you build
- [ ] Replace Obsidian's default markdown preview with webview for `.html` notes entirely
- [ ] Build a whole second UI for Obsidian using local HTML apps in tabs
- [ ] Turn Obsidian into an Electron shell that is 50% notes, 50% local web apps
- [ ] Package L app + plugin as a single distributable "Pranav OS" vault template

---

## Infrastructure & shipping

- [ ] Publish to Obsidian community plugin store
- [ ] BRAT beta channel for early builds
- [ ] GitHub Actions CI build on every push
- [ ] Automated release with `main.js` + manifest attached
- [ ] Plugin version shown in status bar
- [ ] Changelog inside settings
- [ ] Crash report copy-to-clipboard button
- [ ] Compatibility self-test on first install
- [ ] Sample vault bundled as zip
- [ ] Video demo in README
- [ ] Settings import/export as JSON

---

## The real endgame

- [ ] Obsidian opens → L app opens → today's tasks visible in 2 seconds
- [ ] Never open Chrome for local apps again
- [ ] Notes and tasks live in one window
- [ ] Your vault becomes the shell, your HTML apps become the tools
- [ ] You forget this started as a browser plugin

---

*Last updated: July 2026*
