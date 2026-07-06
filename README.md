# Obsidian Browser

I use a local HTML app to manage my daily Notion tasks. It sits on my drive and runs over `file://` — no server, no hosting, just files. I wanted it inside Obsidian so I wasn't alt-tabbing to Chrome all day.

Turns out that's awkward in Obsidian. Most plugins either stick HTML inside a note or run it in a locked-down iframe. I needed it to behave like opening the file in a real browser: JS works, relative paths work, storage works. This plugin does that via Electron's webview when Obsidian allows it, and falls back to an iframe when it doesn't.

Desktop only.

## Install

```bash
npm install
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` into `.obsidian/plugins/obsidian-browser/`, enable it in community plugins, click the globe in the ribbon.

## Using it

Paste a path in the address bar or use the file picker:

```
file:///C:/Projects/notion-tasks/index.html
```

Set it as your home URL in settings if that's what you open every morning.

The bit I actually use day to day: open the app once, hit the layout icon on the toolbar (or **Browser: Open as page**), and it becomes its own tab — just the page, no browser chrome. Feels like a note except it's live. You can also save it with the file-plus icon, which writes a `.webpage` file to `Browser Pages/`:

```yaml
---
url: file:///C:/Projects/notion-tasks/index.html
title: Daily Tasks
---
```

Click that file later and it opens straight back. Or put `browser-page: true` and a `url` in any markdown note's frontmatter.

The full browser view still has tabs, back/forward, bookmarks, DevTools (webview mode only), and optional auto-refresh when you save files. There's a test page in `sample-vault/browser-test/` if you want to sanity-check things first.

## If something's wrong

If the status bar says "Iframe Fallback", webview isn't available on your Obsidian build. It'll still run, just not identically to Chrome — check settings → Compatibility for why.

Relative paths not loading: turn on **Allow local file access**. DevTools not opening: webview mode only, otherwise use Chrome. Auto-refresh needs **Auto refresh** and **Watch file changes** both on, and only works on real file paths.

Obsidian controls whether webview works — plugins can't change that. Iframe fallback also can't do proper DevTools or persistent storage the way a normal `file://` page would. Mobile won't work either.

## License

MIT
