# Release title

**Use this as the GitHub release title (must include the version):**

```
Local HTML Browser 1.0.4
```

**Tag:** `1.0.4`  
**Requires Obsidian 1.13.0+** · Desktop only

Attach `main.js`, `manifest.json`, and `styles.css` from this release.

---

## Changes in 1.0.4

### History

- Navigation history is **saved to disk** (persistable URLs only — not blob/data/about:blank)
- **History panel** — click the clock icon in the toolbar, or run **Browser: Show history**
- Search history, open a past page, delete individual entries, or clear all
- Command: **Browser: Clear history**

### Session restore

- **Restore session on startup** (Settings → Local HTML Browser) — reopen your last tabs when you launch Obsidian or open the browser
- Tabs and active page are saved automatically as you browse
- Works with Obsidian workspace layout restore (`getState` / `setState` on the browser view)
- If the browser pane was closed before quitting, it reopens on startup when session restore is enabled

---

## Upgrade from 1.0.3

1. Run `npm run build` (or download release artifacts)
2. Replace `main.js`, `manifest.json`, and `styles.css` in `.obsidian/plugins/local-html-browser/`
3. Reload Obsidian

---

## Previous releases

### 1.0.3

- Obsidian community plugin review fixes (declarative settings, lint, API compliance)
- Raised `minAppVersion` to **1.13.0**

### 1.0.2

- First review pass: Platform API, CSS classes, typed Electron helpers

### 1.0.1

- First publishable release under plugin ID `local-html-browser`
