# Release title

**Use this as the GitHub release title (must include the version):**

```
Local HTML Browser 1.0.3
```

**Tag:** `1.0.3`  
**Requires Obsidian 1.13.0+** · Desktop only

Attach `main.js`, `manifest.json`, and `styles.css` from this release.

---

## Changes in 1.0.3

Second pass of Obsidian community plugin review fixes. No new features — compliance, lint cleanliness, and settings modernization.

### Requirements

- Raised `minAppVersion` from **1.7.2** to **1.13.0** (declarative settings API)

### Settings

- Migrated to **`getSettingDefinitions()`** — settings appear in Obsidian’s global settings search
- Removed deprecated **`display()`** method
- Removed plugin name and **“General”** headings (review policy)
- Security toggle warnings still show when enabling risky options

### Obsidian API compliance

- DOM elements created via **`doc.win.createDiv()` / `createEl()`** instead of `document.createElement()`
- Cross-window type checks use **`.instanceOf()`** instead of `instanceof`
- **`await revealLeaf()`** — `revealLeaf` returns a Promise in current Obsidian
- **`activeDocument` only** — no bare `document` fallback
- Sentence-case fixes for ribbon text, notices, and command labels

### Source code / lint

- Added **`npm run lint`** with `eslint-plugin-obsidianmd` + `typescript-eslint` (matches community scanner)
- Typed **`FsModule` / `PathModule`** wrappers with runtime validation — no unsafe `fs`/`path` member access
- **`parseBrowserSettings()`** / **`parsePluginData()`** for safe settings and persisted data loading
- Removed **`ipcRenderer`** from Electron module loading (unused; triggered IPC behavior warning)
- **`FileSystemAdapter`** for vault HTML file paths instead of manual adapter casts
- Logger limited to **warn/error**; console forwarding only outputs warn/error when enabled
- Removed debug/info console noise across browser engines and file watcher

### Unchanged (expected)

- Direct **`fs`** access remains intentional for local `file://` apps outside the vault

### Release checklist

When publishing on GitHub, attach these three files **from this repo after `npm run build`**:

- `main.js`
- `manifest.json` (must match repo — currently **`minAppVersion`: `1.13.0`**, **`version`: `1.0.3`**)
- `styles.css`

Release title: **`Local HTML Browser 1.0.3`**

If review reports “release manifest differs from repository manifest”, the attached `manifest.json` is stale — replace it with the repo copy and re-run review.

---

## Upgrade from 1.0.2

1. Download `main.js`, `manifest.json`, and `styles.css`
2. Replace files in `.obsidian/plugins/local-html-browser/`
3. Reload Obsidian

You need **Obsidian 1.13.0+** (was 1.7.2 in 1.0.2).

---

## Previous releases

### 1.0.2

- First review pass: Platform API, CSS classes, typed Electron helpers, `activeDocument`, promise handling
- Removed `builtin-modules`; esbuild uses Node `builtinModules`
- Settings headings via `Setting().setHeading()`

### 1.0.1

- First publishable release under plugin ID `local-html-browser`
- Full browser view + standalone page tabs
- `.webpage` vault notes, webview with iframe fallback, live reload
