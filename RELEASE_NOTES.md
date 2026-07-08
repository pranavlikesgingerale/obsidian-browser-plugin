# Release title

**Use this as the GitHub release title (must include the version):**

```
Local HTML Browser 1.1.0
```

**Tag:** `1.1.0`  
**Requires Obsidian 1.12.7+** · Desktop only

Attach `main.js`, `manifest.json`, and `styles.css` from this release (run `npm run build` first).

---

## Summary

**1.1.0** is the first major feature release after 1.0.3. It adds browser history, session restore, a full tab bar, standalone page tabs, reliability fixes for blank screens, and **Obsidian 1.12.7** support so the community store installs the latest version (not 1.0.1).

---

## New features

### History
- Navigation history saved to disk
- History panel (toolbar clock icon or **Browser: Show history**)
- Search, reopen, delete entries, or clear all
- Command: **Browser: Clear history**

### Session restore
- **Restore session on startup** setting (on by default)
- Browser tabs and active page restore after closing Obsidian
- Standalone page tabs also restore when enabled

### Tab bar
- Rename tabs (double-click, F2, right-click, or **Browser: Rename tab**)
- Drag to reorder, middle-click to close
- Shortcuts: Ctrl+T, Ctrl+W, Ctrl+Shift+T, Ctrl+Tab
- Right-click: duplicate, close others, close to the right
- New-window links open in a new tab

### Standalone page tabs
- **Open as page** uses webview (fixes blank screen for local SPAs)
- Auto-saves `.webpage` notes to `Browser Pages/`
- Reopen from vault or on startup

---

## Reliability fixes

- Deferred loading until the webview container has size (fixes blank pages)
- Layout sync when resizing panes or switching tabs
- Tab switching no longer pollutes history
- History titles update when the page title loads
- Session restore uses fresher saved state
- Welcome/blob pages no longer break tab restore
- Auto-refresh on file save works in the main browser view

---

## Obsidian 1.12.7 compatibility

- `minAppVersion` lowered to **1.12.7** (was 1.13.0 in 1.0.3)
- Legacy **`display()`** settings for Obsidian 1.12.x
- **`getSettingDefinitions()`** kept for Obsidian 1.13+ settings search
- Fixes store showing only **1.0.1** on Obsidian 1.12.7

---

## Other

- GitHub author updated to **pranavshantagiri**

---

## Upgrade from 1.0.3 or 1.0.1

1. Install **1.1.0** from the community plugin store, or manually replace files in `.obsidian/plugins/local-html-browser/`
2. Reload Obsidian

---

## Publish commands

```bash
npm run build

git add main.js manifest.json styles.css versions.json package.json
git commit -m "Release 1.1.0"
git push origin main

git tag 1.1.0
git push origin 1.1.0
```

Then on GitHub: **Releases → New release → tag `1.1.0`**  
Upload `main.js`, `manifest.json`, `styles.css`.

If listed in the community store, ensure `community-plugins.json` has:

```json
"author": "pranavshantagiri",
"repo": "pranavshantagiri/Obsidian_browser_plugin"
```
