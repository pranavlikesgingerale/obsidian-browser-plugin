# Local HTML Browser 1.2.0

**Tag:** `1.2.0`  
**Obsidian:** 1.12.7 or newer  
**Platform:** desktop only

Attach `main.js`, `manifest.json`, and `styles.css` to the GitHub release (`npm run build` first).

---

## 1.2.0

This release fixes the blank viewport and stuck loading spinner that showed up after 1.1.0, plus a few things that were annoying in daily use.

**Loading**

- The webview no longer sits on a pending URL forever when the pane has no size yet.
- Failed loads and blocked external URLs clear the loading state instead of spinning forever.
- Layout sync runs again after the load starts so the page actually paints once the pane is ready.

**Address bar**

- Hostnames like `google.com.in` open over HTTPS instead of being treated as a local file path.
- Windows paths and `file://` URLs still work as before.

**Images**

- PNG, JPEG, GIF, WebP, BMP, and ICO open from the file picker or a path in the address bar.

**History**

- The history panel groups entries under Today, Yesterday, and older dates.

**Session restore**

- Turning off **Restore session on startup** now actually stops tabs from coming back (including from Obsidian’s saved leaf state).
- **Max tabs to restore** (default 5) limits how many tabs reopen after a restart.
- **Clear saved session** drops stored tabs and standalone page tabs without touching bookmarks or history.

**Tab bar**

- The loading spinner no longer draws on top of the tab icon.

---

## Upgrade

1. Replace the plugin files in `.obsidian/plugins/local-html-browser/`
2. Reload Obsidian

From 1.1.0 or 1.1.1 you can upgrade in place. Settings are kept.

---

## 1.1.0

First big release after 1.0.x: history, session restore, tab bar, standalone page tabs, and Obsidian 1.12.7 support.

---

## 1.0.x

Initial releases. Basic browser view with webview/iframe fallback.

---

## Publish (maintainer)

```bash
npm run build

git add main.js manifest.json styles.css versions.json package.json
git commit -m "Release 1.2.0"
git push origin main

git tag 1.2.0
git push origin 1.2.0
```

GitHub: **Releases → New release → tag `1.2.0`**, upload the three plugin files.

Community store entry (must match `manifest.json`):

```json
{
  "id": "local-html-browser",
  "name": "Local HTML Browser",
  "author": "pranavshantagiri",
  "description": "A browser pane inside Obsidian for local HTML files, with tabs, history, and optional web URLs.",
  "repo": "pranavshantagiri/Obsidian_browser_plugin"
}
```
