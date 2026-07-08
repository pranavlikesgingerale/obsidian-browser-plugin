# Local HTML Browser

I use a local HTML app to manage my daily Notion tasks. It sits on my drive and runs over `file://` — no server, no hosting, just files. I wanted it inside Obsidian so I wasn't alt-tabbing to Chrome all day.

Most plugins either stick HTML inside a note or run it in a locked-down iframe. I needed it to behave like opening the file in a real browser: JS works, relative paths work, storage works. This plugin uses Electron's webview when the app allows it, and falls back to an iframe when it doesn't.

Desktop only.

## Install

```bash
npm install
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` into:

```
.obsidian/plugins/local-html-browser/
```

Enable **Local HTML Browser** in Community plugins. Click the globe in the ribbon.

## Using it

Paste a path in the address bar or use the file picker:

```
file:///C:/Projects/notion-tasks/index.html
```

Set it as your home URL in settings if that's what you open every morning.

The bit I use day to day: open the app once, hit the layout icon on the toolbar (or **Browser: Open as page**), and it becomes its own tab — just the page, no browser chrome. Save it with the file-plus icon to write a `.webpage` file in `Browser Pages/`:

```yaml
---
url: file:///C:/Projects/notion-tasks/index.html
title: Daily Tasks
---
```

Click that file later and it opens straight back. Or put `browser-page: true` and a `url` in any markdown note's frontmatter.

Full browser view: tabs, back/forward, bookmarks, DevTools (webview only), auto-refresh on save. Test page in `sample-vault/browser-test/`.

## Publishing / community plugin submission

Use these values in `community-plugins.json` — they must match `manifest.json`:

```json
{
  "id": "local-html-browser",
  "name": "Local HTML Browser",
  "author": "pranavshantagiri",
  "description": "Run local file:// HTML apps with full browser behavior — SPAs, hash routes, and live page tabs.",
  "repo": "pranavshantagiri/Obsidian_browser_plugin"
}
```

Release tag must match `manifest.json` version (e.g. `1.0.1`). Attach `main.js`, `manifest.json`, and `styles.css` to the GitHub release.

Plugin ID rules: lowercase + hyphens only, no `obsidian` in the id, must not end with `plugin`.

## If something's wrong

**Iframe Fallback** in the status bar — webview isn't available on your build. Check Settings → Local HTML Browser → Compatibility.

Relative paths: turn on **Allow local file access**. DevTools: webview mode only. Auto-refresh: enable both **Auto refresh** and **Watch file changes**.

## License

MIT
