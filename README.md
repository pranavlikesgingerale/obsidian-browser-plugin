# Local HTML Browser

An Obsidian plugin that opens local HTML in a real browser pane — not a preview iframe in a note, but something closer to opening the file in Chrome.

I built it because I run a local HTML app for daily tasks off `file://` on my drive. I wanted it inside Obsidian so I wasn’t switching to a separate browser all day. Most plugins either embed HTML in a note or run it in a sandboxed iframe. I needed relative paths, JavaScript, and storage to work the way they do when you open the file normally.

The plugin uses Electron’s `<webview>` when Obsidian allows it. If webview isn’t available, it falls back to an iframe (SPAs and some local paths won’t work as well there).

**Desktop only.** Mobile Obsidian doesn’t expose webview.

---

## Install

From source:

```bash
npm install
npm run build
```

Copy these into your vault:

```
.obsidian/plugins/local-html-browser/
  main.js
  manifest.json
  styles.css
```

Enable **Local HTML Browser** under Community plugins. The globe icon in the ribbon opens the browser.

Requires **Obsidian 1.12.7+**.

---

## Basic use

Paste a path or URL in the address bar, or use the folder/file buttons on the toolbar:

```
file:///C:/Projects/my-app/index.html
```

You can also type a hostname (`example.com`) and it will open over HTTPS.

Set a **Home URL** in settings if you always open the same page.

### Page tabs

If you want just the page without browser chrome:

1. Open the page in the full browser view
2. Click the layout icon on the toolbar (or run **Browser: Open as page**)

It opens as its own Obsidian tab. Save a `.webpage` note to `Browser Pages/` with the file-plus icon:

```yaml
---
url: file:///C:/Projects/my-app/index.html
title: Daily Tasks
---
```

Open that file later and it loads straight back.

### Tabs and shortcuts

- **Ctrl+T** — new tab  
- **Ctrl+W** — close tab  
- **Ctrl+Shift+T** — reopen closed tab  
- **Ctrl+Tab** — switch tabs  
- **F2** or double-click — rename tab  
- Middle-click a tab to close it  

History is under the clock icon on the toolbar.

---

## Settings worth knowing

| Setting | What it does |
|--------|----------------|
| **Allow local file access** | Required for `file://` and relative assets. Off = stricter web security. |
| **Restore session on startup** | Reopens your last tabs when Obsidian starts. Turn off if reopening too many tabs uses too much memory. |
| **Max tabs to restore** | Caps how many tabs come back (default 5). |
| **Clear saved session** | Forgets saved tabs without wiping history or bookmarks. |
| **Auto refresh** + **Watch file changes** | Reload when you save files on disk. |
| **Block external internet** | Keeps navigation on local files only. |

Full list under **Settings → Local HTML Browser**. The **Compatibility** section shows whether webview is available on your install.

---

## Commands

A few useful ones from the command palette:

- **Browser: Open local HTML browser**
- **Browser: Show history**
- **Browser: Clear history**
- **Browser: Open as page**
- **Browser: Rename tab**

---

## When something breaks

**Status bar says Iframe Fallback** — webview isn’t available on this Obsidian build. Check Settings → Compatibility. Local SPAs usually need webview.

**Blank page, spinner won’t stop** — update to 1.2.0+. If it persists, try **Clear saved session** and reload.

**Relative paths don’t resolve** — enable **Allow local file access**.

**DevTools** — only in webview mode (code icon on toolbar).

**Auto-refresh** — both **Auto refresh** and **Watch file changes** need to be on.

There’s a small test site in `sample-vault/browser-test/` if you want something local to poke at.

---

## Community plugin listing

If you’re submitting or updating the community plugins index, use the same id and author as `manifest.json`:

```json
{
  "id": "local-html-browser",
  "name": "Local HTML Browser",
  "author": "pranavshantagiri",
  "description": "A browser pane inside Obsidian for local HTML files, with tabs, history, and optional web URLs.",
  "repo": "pranavshantagiri/Obsidian_browser_plugin"
}
```

Release tags must match the version in `manifest.json`. Attach `main.js`, `manifest.json`, and `styles.css` to each GitHub release.

Plugin id rules: lowercase and hyphens only, no `obsidian` in the id, don’t end with `plugin`.

---

## License

MIT
