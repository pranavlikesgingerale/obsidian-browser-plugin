import { ItemView, Notice, WorkspaceLeaf, type ViewStateResult } from "obsidian";
import type LocalHtmlBrowserPlugin from "../main";
import { BROWSER_VIEW_TYPE, getTabDisplayTitle, parseBrowserViewState, type BrowserViewState } from "../types";
import { isPersistableBrowserUrl } from "../utils/browser-url";
import { BrowserManager } from "../browser/browser-manager";
import { TabManager } from "../tabs/tab-manager";
import { Toolbar } from "./toolbar";
import { TabBar } from "./tab-bar";
import { StatusBar } from "./status-bar";
import { HistoryPanel } from "./history-panel";
import { DevToolsManager } from "../devtools/devtools-manager";
import { FileWatcher } from "../utils/file-watcher";
import { openFileDialog, openFolderDialog } from "./download-manager";
import { normalizeInputToUrl, pathToFileUrl } from "../utils/paths";
import { getViewContentContainer } from "../utils/dom";

/**
 * Main browser view — embeds Chromium webview (or iframe fallback) with full browser UI.
 */
export class BrowserView extends ItemView {
	private browserManager: BrowserManager | null = null;
	private tabManager: TabManager;
	private toolbar: Toolbar | null = null;
	private tabBar: TabBar | null = null;
	private statusBar: StatusBar | null = null;
	private historyPanel: HistoryPanel | null = null;
	private devToolsManager: DevToolsManager;
	private fileWatcher: FileWatcher;
	private webviewContainer: HTMLElement | null = null;
	private rootEl: HTMLElement | null = null;
	private pendingState: BrowserViewState | null = null;
	private persistTimer: number | null = null;
	private suppressHistory = false;
	private pendingLoad: { url: string; recordHistory: boolean } | null = null;

	constructor(leaf: WorkspaceLeaf, private plugin: LocalHtmlBrowserPlugin) {
		super(leaf);
		this.tabManager = new TabManager();
		this.devToolsManager = new DevToolsManager(plugin.settings.forwardConsoleLogs);
		this.fileWatcher = new FileWatcher();

		this.fileWatcher.onChange(() => {
			if (plugin.settings.autoRefresh && plugin.settings.watchFileChanges) {
				this.browserManager?.reload();
			}
		});

		this.tabManager.onTabsChanged = (tabs, activeId) => {
			this.tabBar?.sync(tabs, activeId);
			this.schedulePersist();
		};
	}

	getViewType(): string {
		return BROWSER_VIEW_TYPE;
	}

	getDisplayText(): string {
		const tab = this.tabManager.getActiveTab();
		return tab ? `Browser: ${getTabDisplayTitle(tab)}` : "Browser";
	}

	getIcon(): string {
		return "globe";
	}

	getState(): Record<string, unknown> {
		return this.tabManager.serializeSession();
	}

	async setState(state: Record<string, unknown>, _result: ViewStateResult): Promise<void> {
		this.pendingState = parseBrowserViewState(state);
	}

	async onOpen(): Promise<void> {
		const container = getViewContentContainer(this.containerEl);
		container.empty();
		container.addClass("local-html-browser-view-container");

		const root = container.createDiv({ cls: "local-html-browser-root" });
		this.rootEl = root;

		this.toolbar = new Toolbar({
			onBack: () => this.browserManager?.goBack(),
			onForward: () => this.browserManager?.goForward(),
			onReload: () => this.browserManager?.reload(),
			onHardReload: () => this.browserManager?.hardReload(),
			onStop: () => this.browserManager?.stop(),
			onHome: () => this.navigateHome(),
			onNavigate: (url) => this.navigateTo(url),
			onOpenFile: () => { void this.handleOpenFile(); },
			onOpenFolder: () => { void this.handleOpenFolder(); },
			onToggleBookmark: () => this.toggleBookmark(),
			onToggleHistory: () => this.historyPanel?.toggle(),
			onToggleDevTools: () => this.browserManager?.toggleDevTools(),
			onNewTab: () => this.createNewTab(),
			onOpenAsPage: () => this.openCurrentAsPage(),
			onSaveAsNote: () => this.saveCurrentAsNote(),
		});
		root.appendChild(this.toolbar.el);

		this.historyPanel = new HistoryPanel(
			root,
			() => this.plugin.historyManager.getEntries(),
			{
				onOpenEntry: (url) => this.navigateTo(url),
				onDeleteEntry: (id) => this.deleteHistoryEntry(id),
				onClearAll: () => this.clearHistory(),
			},
		);

		this.tabBar = new TabBar({
			onSelectTab: (id) => this.selectTab(id),
			onCloseTab: (id) => this.closeTab(id),
			onDuplicateTab: (id) => this.duplicateTab(id),
			onNewTab: () => this.createNewTab(),
			onRenameTab: (id, title) => this.renameTab(id, title),
			onResetTabTitle: (id) => this.resetTabTitle(id),
			onMoveTab: (from, to) => this.moveTab(from, to),
			onCloseOtherTabs: (id) => this.closeOtherTabs(id),
			onCloseTabsToRight: (id) => this.closeTabsToRight(id),
		});
		root.appendChild(this.tabBar.el);

		this.plugin.registerDomEvent(container, "keydown", (event: KeyboardEvent) => {
			this.handleTabShortcuts(event);
		});

		this.webviewContainer = root.createDiv({ cls: "local-html-browser-content" });

		this.registerEvent(
			this.app.workspace.on("layout-change", () => {
				this.browserManager?.syncLayout();
			}),
		);

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", (leaf) => {
				if (leaf?.view === this) {
					this.browserManager?.syncLayout();
				}
			}),
		);

		this.registerDomEvent(this.webviewContainer, "transitionend", () => {
			this.browserManager?.syncLayout();
		});

		this.statusBar = new StatusBar();
		this.statusBar.setVisible(this.plugin.settings.showStatusBar);
		root.appendChild(this.statusBar.el);

		this.browserManager = new BrowserManager(this.plugin.settings, {
			onLoadStart: () => this.handleLoadStart(),
			onLoadStop: () => this.handleLoadStop(),
			onNavigate: (url) => this.handleNavigate(url),
			onTitleChange: (title) => this.handleTitleChange(title),
			onFaviconChange: (favicon) => this.handleFaviconChange(favicon),
			onLoadingStateChange: (loading) => this.handleLoadingChange(loading),
			onCanNavigateChange: (back, forward) => this.toolbar?.setNavState(back, forward),
			onConsoleMessage: (msg) => this.devToolsManager.handleConsoleMessage(msg),
			onNewWindow: (url) => this.createNewTab(url),
			onError: (msg) => {
				this.statusBar?.setStatus(msg);
				new Notice(msg, 5000);
			},
		});

		const engineType = this.browserManager.initialize(this.webviewContainer);
		this.statusBar.setEngine(engineType);

		if (engineType === "unavailable") {
			this.webviewContainer.createDiv({
				cls: "local-html-browser-error",
				text: "Browser engine unavailable. Check Settings → Local HTML Browser → Compatibility.",
			});
		}

		if (!this.restoreInitialSession()) {
			this.tabManager.createTab();
			if (this.plugin.settings.homeUrl) {
				this.navigateTo(this.plugin.settings.homeUrl);
			} else {
				this.loadWelcomePage();
			}
		}
	}

	async onClose(): Promise<void> {
		this.clearPersistTimer();
		void this.plugin.saveBrowserSession(this.tabManager.serializeSession());
		this.fileWatcher.stop();
		this.browserManager?.destroy();
		this.browserManager = null;
	}

	/** Save tabs/session before Obsidian shuts down. */
	persistSessionNow(): void {
		void this.plugin.saveBrowserSession(this.tabManager.serializeSession());
	}

	/** Navigate to URL in active tab. */
	navigateTo(url: string): void {
		const normalized = normalizeInputToUrl(url);
		if (!normalized) return;

		this.toolbar?.setUrl(normalized);
		const tab = this.tabManager.getActiveTab();
		if (tab && isPersistableBrowserUrl(normalized)) {
			this.tabManager.updateTab(tab.id, { url: normalized, isLoading: true });
		} else if (tab) {
			this.tabManager.updateTab(tab.id, { isLoading: true });
		}
		this.scheduleEngineLoad(normalized, true);

		if (this.plugin.settings.watchFileChanges && isPersistableBrowserUrl(normalized)) {
			this.fileWatcher.watch(normalized);
		}
	}

	createNewTab(url = ""): void {
		this.tabManager.createTab(url);
		if (url) this.navigateTo(url);
		else this.loadWelcomePage();
	}

	reopenClosedTab(): void {
		const tab = this.tabManager.reopenClosedTab();
		if (tab) this.loadActiveTabContent();
	}

	renameActiveTab(): void {
		const tab = this.tabManager.getActiveTab();
		if (tab) this.tabBar?.startRename(tab.id);
	}

	goBack(): void {
		this.browserManager?.goBack();
	}

	goForward(): void {
		this.browserManager?.goForward();
	}

	reload(): void {
		this.browserManager?.reload();
	}

	hardReload(): void {
		this.browserManager?.hardReload();
	}

	stopLoading(): void {
		this.browserManager?.stop();
	}

	toggleDevTools(): void {
		this.browserManager?.toggleDevTools();
	}

	getCurrentUrl(): string {
		return this.browserManager?.getUrl() ?? "";
	}

	getCurrentTitle(): string {
		return this.browserManager?.getTitle() ?? "";
	}

	showHistoryPanel(): void {
		this.historyPanel?.show();
	}

	private restoreInitialSession(): boolean {
		const state = this.pickRestoreState();
		if (!state || state.tabs.length === 0) return false;

		const maxTabs = Math.max(1, this.plugin.settings.maxRestoredTabs || 5);
		const capped =
			state.tabs.length > maxTabs
				? {
						...state,
						tabs: state.tabs.slice(0, maxTabs),
						activeTabIndex: Math.min(state.activeTabIndex, maxTabs - 1),
					}
				: state;

		if (!this.tabManager.restoreSession(capped.tabs, capped.activeTabIndex)) return false;

		const activeTab = this.tabManager.getActiveTab();
		if (activeTab?.url && isPersistableBrowserUrl(activeTab.url)) {
			this.toolbar?.setUrl(activeTab.url);
			this.scheduleEngineLoad(activeTab.url, false);
			return true;
		}
		return false;
	}

	private pickRestoreState(): BrowserViewState | null {
		// When restore is off, ignore leaf/plugin session so Obsidian reopen does not
		// reload every previous tab (memory / blank-load storms).
		if (!this.plugin.settings.restoreSessionOnStartup) {
			this.pendingState = null;
			return null;
		}

		if (this.pendingState) {
			const state = this.pendingState;
			this.pendingState = null;
			return state;
		}

		const pluginSession = this.plugin.getBrowserSession();
		if (pluginSession && pluginSession.tabs.length > 0) {
			return pluginSession;
		}

		return parseBrowserViewState(this.leaf.getViewState().state);
	}

	private scheduleEngineLoad(url: string, recordHistory: boolean): void {
		this.pendingLoad = { url, recordHistory };
		this.tryFlushLoad(0);
	}

	private tryFlushLoad(attempt: number): void {
		if (!this.pendingLoad || !this.browserManager || !this.webviewContainer) return;

		const height = this.webviewContainer.clientHeight;
		const width = this.webviewContainer.clientWidth;
		// Wait briefly for layout, then load anyway — zero-size panes caused blank pages.
		if ((height <= 0 || width <= 0) && attempt < 30) {
			window.requestAnimationFrame(() => this.tryFlushLoad(attempt + 1));
			return;
		}

		const { url, recordHistory } = this.pendingLoad;
		this.pendingLoad = null;
		this.browserManager.syncLayout();
		this.suppressHistory = !recordHistory;
		this.browserManager.loadUrl(url);
		window.requestAnimationFrame(() => this.browserManager?.syncLayout());
		window.setTimeout(() => this.browserManager?.syncLayout(), 50);
		window.setTimeout(() => this.browserManager?.syncLayout(), 250);
	}

	private snapshotActiveTabFromEngine(): void {
		const tab = this.tabManager.getActiveTab();
		if (!tab) return;

		const engineUrl = this.browserManager?.getUrl() ?? "";
		if (!isPersistableBrowserUrl(engineUrl)) return;

		const engineTitle = this.browserManager?.getTitle() ?? tab.title;
		if (engineUrl !== tab.url || engineTitle !== tab.title) {
			this.tabManager.updateTab(tab.id, { url: engineUrl, title: engineTitle });
		}
	}

	private deleteHistoryEntry(id: string): void {
		if (this.plugin.historyManager.removeEntry(id)) {
			void this.plugin.savePersistedData();
			new Notice("History entry removed");
		}
	}

	private clearHistory(): void {
		this.plugin.historyManager.clear();
		void this.plugin.savePersistedData();
		this.historyPanel?.render();
		new Notice("History cleared");
	}

	private schedulePersist(): void {
		if (this.persistTimer !== null) {
			window.clearTimeout(this.persistTimer);
		}
		this.persistTimer = window.setTimeout(() => {
			this.persistTimer = null;
			void this.plugin.saveBrowserSession(this.tabManager.serializeSession());
		}, 1200);
	}

	private clearPersistTimer(): void {
		if (this.persistTimer !== null) {
			window.clearTimeout(this.persistTimer);
			this.persistTimer = null;
		}
	}

	private openCurrentAsPage(): void {
		const url = this.getCurrentUrl();
		if (!url || url.startsWith("blob:") || url.startsWith("data:")) {
			new Notice("Nothing to open — navigate to a real page first.");
			return;
		}
		const title = this.getCurrentTitle() || "Web Page";
		void this.plugin.openWebPage(url, title).then((view) => {
			if (view) new Notice(`Opened as page tab${this.plugin.settings.pageNotesFolder ? " and saved to vault" : ""}.`);
		});
	}

	private saveCurrentAsNote(): void {
		const url = this.getCurrentUrl();
		if (!url || url.startsWith("blob:")) {
			new Notice("Nothing to save — navigate to a page first.");
			return;
		}
		const title = this.getCurrentTitle() || "Web Page";
		void this.plugin.savePageNote(url, title).then((file) => {
			if (file) new Notice(`Saved page note: ${file.path}`);
		});
	}

	private selectTab(tabId: string): void {
		this.snapshotActiveTabFromEngine();
		this.tabManager.setActiveTab(tabId);
		this.loadActiveTabContent();
	}

	private closeTab(tabId: string): void {
		this.tabManager.closeTab(tabId);
		if (this.tabManager.getTabs().length === 0) {
			this.createNewTab();
			return;
		}
		this.loadActiveTabContent();
	}

	private duplicateTab(tabId: string): void {
		const dup = this.tabManager.duplicateTab(tabId);
		if (dup) this.loadActiveTabContent();
	}

	private renameTab(tabId: string, title: string): void {
		this.tabManager.renameTab(tabId, title);
		this.schedulePersist();
	}

	private resetTabTitle(tabId: string): void {
		this.tabManager.resetTabTitle(tabId);
		this.schedulePersist();
	}

	private moveTab(fromIndex: number, toIndex: number): void {
		this.tabManager.moveTab(fromIndex, toIndex);
	}

	private closeOtherTabs(tabId: string): void {
		this.tabManager.closeOtherTabs(tabId);
		this.loadActiveTabContent();
	}

	private closeTabsToRight(tabId: string): void {
		this.tabManager.closeTabsToRight(tabId);
		this.loadActiveTabContent();
	}

	private loadActiveTabContent(): void {
		const tab = this.tabManager.getActiveTab();
		if (!tab) return;

		if (tab.url && isPersistableBrowserUrl(tab.url)) {
			this.toolbar?.setUrl(tab.url);
			this.toolbar?.setBookmarked(this.plugin.bookmarkManager.isBookmarked(tab.url));
			this.scheduleEngineLoad(tab.url, false);
			return;
		}

		this.toolbar?.setUrl("");
		this.loadWelcomePage();
	}

	private handleTabShortcuts(event: KeyboardEvent): void {
		const target = event.target;
		if (
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			(target instanceof HTMLElement && target.isContentEditable)
		) {
			return;
		}

		if (event.ctrlKey && event.key === "Tab") {
			event.preventDefault();
			this.selectAdjacentTab(event.shiftKey ? -1 : 1);
			return;
		}

		if (event.ctrlKey && (event.key === "t" || event.key === "T")) {
			event.preventDefault();
			this.createNewTab();
			return;
		}

		if (event.ctrlKey && (event.key === "w" || event.key === "W")) {
			event.preventDefault();
			const tab = this.tabManager.getActiveTab();
			if (tab) this.closeTab(tab.id);
			return;
		}

		if (event.ctrlKey && event.shiftKey && (event.key === "T" || event.key === "t")) {
			event.preventDefault();
			this.reopenClosedTab();
			return;
		}

		if (event.key === "F2") {
			event.preventDefault();
			this.renameActiveTab();
		}
	}

	private selectAdjacentTab(direction: 1 | -1): void {
		const tabs = this.tabManager.getTabs();
		const activeId = this.tabManager.getActiveTabId();
		const index = tabs.findIndex((tab) => tab.id === activeId);
		if (index === -1 || tabs.length === 0) return;

		const next = tabs[(index + direction + tabs.length) % tabs.length];
		if (next) this.selectTab(next.id);
	}

	private navigateHome(): void {
		const home = this.plugin.settings.homeUrl;
		if (home) {
			this.navigateTo(home);
		} else {
			this.loadWelcomePage();
		}
	}

	private async handleOpenFile(): Promise<void> {
		const path = await openFileDialog();
		if (path) this.navigateTo(pathToFileUrl(path));
	}

	private async handleOpenFolder(): Promise<void> {
		const path = await openFolderDialog();
		if (path) this.navigateTo(pathToFileUrl(path));
	}

	private toggleBookmark(): void {
		const url = this.browserManager?.getUrl();
		const title = this.browserManager?.getTitle();
		if (!url) return;

		if (this.plugin.bookmarkManager.isBookmarked(url)) {
			const bm = this.plugin.bookmarkManager.getBookmarks().find((b) => b.url === url);
			if (bm) this.plugin.bookmarkManager.removeBookmark(bm.id);
			this.toolbar?.setBookmarked(false);
			new Notice("Bookmark removed");
		} else {
			this.plugin.bookmarkManager.addBookmark(url, title ?? url);
			this.toolbar?.setBookmarked(true);
			new Notice("Bookmark added");
		}
		void this.plugin.savePersistedData();
	}

	private handleLoadStart(): void {
		this.toolbar?.setLoading(true);
		const tab = this.tabManager.getActiveTab();
		if (tab) this.tabManager.updateTab(tab.id, { isLoading: true });
	}

	private handleLoadStop(): void {
		this.toolbar?.setLoading(false);
		const tab = this.tabManager.getActiveTab();
		if (tab) this.tabManager.updateTab(tab.id, { isLoading: false });
	}

	private handleNavigate(url: string): void {
		if (!isPersistableBrowserUrl(url)) {
			this.suppressHistory = false;
			return;
		}

		this.toolbar?.setUrl(url);
		const tab = this.tabManager.getActiveTab();
		if (tab) {
			const urlChanged = tab.url !== url;
			this.tabManager.updateTab(tab.id, {
				url,
				...(urlChanged && !tab.titlePinned
					? { customTitle: undefined, titlePinned: false }
					: {}),
			});
		}

		if (!this.suppressHistory) {
			this.plugin.historyManager.addEntry(url, this.browserManager?.getTitle() ?? url);
		}
		this.suppressHistory = false;

		this.toolbar?.setBookmarked(this.plugin.bookmarkManager.isBookmarked(url));
		this.schedulePersist();

		if (this.historyPanel?.isVisible()) {
			this.historyPanel.render();
		}

		if (this.plugin.settings.watchFileChanges) {
			this.fileWatcher.watch(url);
		}
	}

	private handleTitleChange(title: string): void {
		const tab = this.tabManager.getActiveTab();
		if (tab) {
			this.tabManager.updateTab(tab.id, { title });
		}
		this.statusBar?.setStatus(tab?.titlePinned && tab.customTitle ? tab.customTitle : title);

		const url = this.browserManager?.getUrl() ?? "";
		if (isPersistableBrowserUrl(url)) {
			this.plugin.historyManager.updateTitleForUrl(url, title);
			if (this.historyPanel?.isVisible()) {
				this.historyPanel.render();
			}
		}
	}

	private handleFaviconChange(favicon: string): void {
		const tab = this.tabManager.getActiveTab();
		if (tab) this.tabManager.updateTab(tab.id, { favicon });
	}

	private handleLoadingChange(loading: boolean): void {
		this.toolbar?.setLoading(loading);
		const tab = this.tabManager.getActiveTab();
		if (tab) this.tabManager.updateTab(tab.id, { isLoading: loading });
	}

	private loadWelcomePage(): void {
		const welcomeHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Local HTML Browser</title>
<style>
body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center;
min-height: 100vh; margin: 0; background: #1e1e1e; color: #ccc; }
.card { text-align: center; max-width: 480px; padding: 2rem; }
h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
p { color: #888; line-height: 1.6; }
</style></head><body><div class="card">
<h1>Local HTML Browser</h1>
<p>Open local HTML files with full Chromium rendering.<br>
Use the toolbar to open files, folders, or enter a <code>file://</code> URL.</p>
</div></body></html>`;
		const blob = new Blob([welcomeHtml], { type: "text/html" });
		const url = URL.createObjectURL(blob);
		this.suppressHistory = true;
		this.scheduleEngineLoad(url, false);
	}
}
