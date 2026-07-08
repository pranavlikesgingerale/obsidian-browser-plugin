# Release title

**Use this as the GitHub release title (must include the version):**

```
Local HTML Browser 1.0.5
```

**Tag:** `1.0.5`  
**Requires Obsidian 1.13.0+** · Desktop only

Attach `main.js`, `manifest.json`, and `styles.css` from this release (run `npm run build` first).

---

## Summary

Version 1.0.5 is a **reliability release**. It fixes blank screens when opening pages or switching tabs, cleans up history behavior, and improves session restore. Also updates the GitHub author to **pranavshantagiri**.

---

## Reliability fixes

### Page loading (blank screen fixes)

- **Deferred loading** — browser and page tabs wait until the content area has real dimensions before navigating (fixes 0-height webview)
- **Layout sync** — webview resizes on workspace layout changes, pane focus, and split resize
- **Smarter webview startup** — loads only after `did-attach`; clears stuck-load timers correctly
- **No iframe fallback for local files** — slow `file://` loads stay on webview (iframe breaks SPAs)
- **Longer stuck timeout** — 8 seconds instead of 2.5 before considering a load stuck
- **Standalone page tabs** — same deferred-load and layout-sync behavior as the main browser

### Tab switching

- **Snapshot URL before switch** — outgoing tab saves the live webview URL before switching away
- **No history spam** — tab switches and session restore no longer add fake history entries
- **Welcome tabs** — blob welcome pages no longer overwrite tab URLs (fixes broken restore/switch)
- **Session active tab** — correct tab restored when the active tab was a welcome/new tab

### Session restore

- **Fresher session data** — prefers plugin-saved session (on quit) over stale workspace state when restore is enabled

### History

- **Correct titles** — history updates when the page title loads (not just at navigate time)
- **Live panel** — history panel refreshes while open as you browse
- **Cleaner entries** — welcome/blob navigations are excluded from history and tab state

### Other

- **Auto-refresh in browser view** — file watcher reload now works in the main browser (was only on page tabs)
- **Iframe back/forward** — fixed history stack in fallback mode
- **Markdown preview** — relative assets resolve from the file’s directory, not the file path itself
- **Author** — `manifest.json` author URL updated to [pranavshantagiri](https://github.com/pranavshantagiri)

---

## Upgrade from 1.0.4

1. Run `npm run build` (or download release artifacts)
2. Replace `main.js`, `manifest.json`, and `styles.css` in `.obsidian/plugins/local-html-browser/`
3. Reload Obsidian

If you submit to the Obsidian community plugin list, update `community-plugins.json` repo to `pranavshantagiri/Obsidian_browser_plugin`.

---

## Quick test checklist

- [ ] Open a local HTML app — page loads (not blank)
- [ ] Switch tabs back and forth — correct pages, no extra history entries
- [ ] Close and reopen Obsidian — tabs restore to the right page
- [ ] Open history while browsing — new entries appear with correct titles
- [ ] **Open as page** — standalone tab loads the same content
- [ ] Resize the Obsidian pane — page stays visible (no blank webview)

---

## Previous releases

### 1.0.4

- History panel and persisted navigation history
- Session restore on startup
- Browser-like tab bar with rename, drag-reorder, shortcuts
- Standalone page tabs with `.webpage` vault notes

### 1.0.3

- Obsidian community plugin review fixes; `minAppVersion` 1.13.0

### 1.0.1

- First publishable release under plugin ID `local-html-browser`
