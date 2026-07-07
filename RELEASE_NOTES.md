# Release title

**Use this as the GitHub release title (must include the version):**

```
Local HTML Browser 1.0.2
```

**Tag:** `1.0.2`  
**Requires Obsidian 1.7.2+** · Desktop only

Attach `main.js`, `manifest.json`, and `styles.css` from this release.

---

## Changes in 1.0.2

This release addresses Obsidian community plugin review feedback from 1.0.1. No new user-facing features — mostly compliance, stability, and code quality.

### Requirements

- Raised `minAppVersion` from **1.5.0** to **1.7.2** (uses `getActiveViewOfType`, `getLeaf(false)`, and related workspace APIs)

### Obsidian API compliance

- Replaced `navigator.platform` OS detection with Obsidian's **`Platform`** API
- Replaced deprecated **`activeLeaf`** usage with **`getActiveViewOfType`** and **`getLeaf(false)`**
- Settings section titles now use **`Setting().setHeading()`** instead of raw `<h2>` elements
- Removed inline **`element.style`** assignments; UI state is driven by CSS classes (`is-loading`, `is-visible`, `is-hidden`, engine container classes)
- Switched to **`window.requestAnimationFrame()`** for popout-window compatibility
- Switched DOM creation to **`activeDocument`** (via a shared `getActiveDocument()` helper) instead of bare `document`
- Floating promises are explicitly handled with **`void`** where fire-and-forget is intentional

### Source code / lint fixes

- Removed all **`eslint-disable @typescript-eslint/no-explicit-any`** directives
- Rewrote Electron/Node access (`electron.ts`) with **`nodeRequire()`** and runtime validation instead of unchecked `window.require()` casts
- Added **`parsePluginData()`** so plugin saved data is parsed safely from `loadData()`
- Added **`parseWebPageState()`** for web page tab state instead of unchecked type assertions
- Safer frontmatter and vault adapter parsing in page notes
- Webview event listeners no longer use unnecessary **`as EventListener`** casts
- Settings boolean toggles use a typed **`BooleanSettingKey`** instead of `as boolean` casts
- **`FileReader.result`** is checked with `typeof` before use
- Compatibility report **Refresh** button updates the report in place instead of re-running full `display()`

### CSS

- Removed **`!important`** overrides on view containers
- Removed **`scrollbar-width`** (partially unsupported on older Obsidian builds)
- Loading indicator, page error banner, and status bar visibility handled entirely in CSS

### Build tooling

- Removed deprecated **`builtin-modules`** npm package
- Esbuild externals now use Node's built-in **`builtinModules`** from `node:module`

### Unchanged (expected review warnings)

- Direct **`fs`** access remains intentional — required for loading local `file://` HTML apps outside the vault
- GitHub artifact attestations not included in this release

---

## Upgrade from 1.0.1

1. Download the three files from this release
2. Replace everything in `.obsidian/plugins/local-html-browser/`
3. Reload Obsidian (or disable/re-enable the plugin)

If you were on Obsidian **1.5.x–1.7.1**, update Obsidian to **1.7.2+** before installing.

---

## Previous releases

### 1.0.1

- First publishable release under plugin ID `local-html-browser`
- Full browser view + standalone page tabs
- `.webpage` vault notes and save-as-note
- Webview engine with automatic iframe fallback
- Live reload on file watch and vault save
- Compatibility report in settings
