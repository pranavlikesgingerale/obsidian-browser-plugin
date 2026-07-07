# Local HTML Browser v1.0.2

Run local `file://` HTML apps inside Obsidian — built for SPAs, hash routes, and offline tools like a personal task dashboard.

**Desktop only** · Requires Obsidian 1.7.2+

---

## Install

1. Download `main.js`, `manifest.json`, and `styles.css` from this release
2. Put them in `.obsidian/plugins/local-html-browser/`
3. Enable **Local HTML Browser** under Settings → Community plugins
4. Click the globe icon in the ribbon

Or build from source:

```bash
npm install
npm run build
```

---

## What's included

### Full browser view
- Address bar, back/forward, reload, hard reload, stop, home
- Multiple tabs — new, close, duplicate, reopen closed
- Open file / open folder
- Bookmarks and history
- DevTools toggle (webview mode)
- Auto-refresh when files change
- Security settings: JS toggle, local file access, sandbox, incognito, block external URLs

### Page tabs
- Open a page as its own tab — live web content, minimal chrome
- Save a page as a `.webpage` vault note
- Markdown frontmatter support (`browser-page: true`)
- Open vault `.html` files as live pages

### Engines
- **Webview** — closest to Chrome, proper `file://` + SPA support
- **Iframe fallback** — used automatically if webview doesn't respond

Compatibility report under Settings → Local HTML Browser.

---

## Example

```
file:///C:/path/to/your/app/index.html#/today
```

Set as home URL in settings, or save as a `.webpage` note:

```yaml
---
url: file:///C:/path/to/your/app/index.html#/today
title: Daily Tasks
---
```

---

## Known limitations

- Webview depends on your Obsidian/Electron build — if you see **Iframe Fallback**, bundled apps may not work fully
- Iframe mode can't attach DevTools the same way webview can
- Mobile is not supported
- Direct filesystem access via Node `fs` is intentional for local HTML apps outside the vault

---

## Files in this release

| File | Required |
|------|----------|
| `main.js` | Yes |
| `manifest.json` | Yes |
| `styles.css` | Yes |

**Release name must include the version:** e.g. `Local HTML Browser 1.0.2`

---

## Changelog

### 1.0.2
- Obsidian review fixes: Platform API, CSS classes instead of inline styles, settings headings, typed Electron helpers
- Raised `minAppVersion` to 1.7.2 for modern workspace APIs
- Popout-safe `activeDocument` usage, promise handling cleanup
- Removed deprecated `builtin-modules` dependency; safer `loadData` parsing
- Webview event handlers without unnecessary casts; settings compat refresh without full re-render

### 1.0.1
- First publishable release under plugin ID `local-html-browser`
- Full browser + page tab views
- `.webpage` vault notes and save-as-note
- Webview with automatic iframe fallback
- Live reload on file watch and vault save
- Compatibility detection in settings
