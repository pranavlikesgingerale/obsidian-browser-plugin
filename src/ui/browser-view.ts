import { ItemView, WorkspaceLeaf } from "obsidian";
import type ObsidianBrowserPlugin from "../main";
import { BROWSER_VIEW_TYPE } from "../types";
import { BrowserManager } from "../browser/browser-manager";
import { TabManager } from "../tabs/tab-manager";
import { Toolbar } from "./toolbar";
import { TabBar } from "./tab-bar";
import { StatusBar } from "./status-bar";
import { DevToolsManager } from "../devtools/devtools-manager";
import { FileWatcher } from "../utils/file-watcher";
import { openFileDialog, openFolderDialog } from "./download-manager";
import { pathToFileUrl } from "../utils/paths";
import { Notice } from "obsidian";

/**
 * Main browser view — embeds Chromium webview (or iframe fallback) with full browser UI.
 */
export class BrowserView extends ItemView {
	private browserManager: BrowserManager | null = null;
	private tabManager: TabManager;
	private toolbar: Toolbar | null = null;
	private tabBar: TabBar | null = null;
	private statusBar: StatusBar | null = null;
	private devToolsManager: DevToolsManager;
	private fileWatcher: FileWatcher;
	private webviewContainer: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf, private plugin: ObsidianBrowserPlugin) {
		super(leaf);
		this.tabManager = new TabManager();
		this.devToolsManager = new DevToolsManager(plugin.settings.forwardConsoleLogs);
		this.fileWatcher = new FileWatcher();

		this.tabManager.onTabsChanged = (tabs, activeId) => {
			this.tabBar?.render(tabs, activeId);
		};

		this.fileWatcher.onChange(() => {
			if (plugin.settings.autoRefresh && plugin.settings.watchFileChanges) {
				this.browserManager?.reload();
				this.statusBar?.setStatus("Auto-refreshed on file change");
			}
		});
	}

	getViewType(): string {
		return BROWSER_VIEW_TYPE;
	}

	getDisplayText(): string {
		const tab = this.tabManager.getActiveTab();
		return tab?.title ? `Browser: ${tab.title}` : "Browser";
	}

	getIcon(): string {
		return "globe";
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass("obsidian-browser-view-container");

		const root = container.createDiv({ cls: "obsidian-browser-root" });

		this.toolbar = new Toolbar({
			onBack: () => this.browserManager?.goBack(),
			onForward: () => this.browserManager?.goForward(),
			onReload: () => this.browserManager?.reload(),
			onHardReload: () => this.browserManager?.hardReload(),
			onStop: () => this.browserManager?.stop(),
			onHome: () => this.navigateHome(),
			onNavigate: (url) => this.navigateTo(url),
			onOpenFile: () => this.handleOpenFile(),
			onOpenFolder: () => this.handleOpenFolder(),
			onToggleBookmark: () => this.toggleBookmark(),
			onToggleDevTools: () => this.browserManager?.toggleDevTools(),
			onNewTab: () => this.createNewTab(),
			onOpenAsPage: () => this.openCurrentAsPage(),
			onSaveAsNote: () => this.saveCurrentAsNote(),
		});
		root.appendChild(this.toolbar.el);

		this.tabBar = new TabBar({
			onSelectTab: (id) => this.selectTab(id),
			onCloseTab: (id) => this.closeTab(id),
			onDuplicateTab: (id) => this.duplicateTab(id),
			onNewTab: () => this.createNewTab(),
		});
		root.appendChild(this.tabBar.el);

		this.webviewContainer = root.createDiv({ cls: "obsidian-browser-content" });

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
			onNewWindow: (url) => this.navigateTo(url),
			onError: (msg) => {
				this.statusBar?.setStatus(msg);
				new Notice(msg, 5000);
			},
		});

		const engineType = this.browserManager.initialize(this.webviewContainer);
		this.statusBar.setEngine(engineType);

		if (engineType === "unavailable") {
			this.webviewContainer.createDiv({
				cls: "obsidian-browser-error",
				text: "Browser engine unavailable. Check Settings → Obsidian Browser → Compatibility.",
			});
		}

		// Create initial tab
		const tab = this.tabManager.createTab();
		if (this.plugin.settings.homeUrl) {
			this.navigateTo(this.plugin.settings.homeUrl);
		} else {
			this.loadWelcomePage();
		}
	}

	async onClose(): Promise<void> {
		this.fileWatcher.stop();
		this.browserManager?.destroy();
		this.browserManager = null;
	}

	/** Navigate to URL in active tab. */
	navigateTo(url: string): void {
		if (!url) return;
		this.browserManager?.loadUrl(url);
		this.toolbar?.setUrl(url);
		const tab = this.tabManager.getActiveTab();
		if (tab) {
			this.tabManager.updateTab(tab.id, { url, isLoading: true });
		}

		if (this.plugin.settings.watchFileChanges) {
			this.fileWatcher.watch(url);
		}
	}

	createNewTab(url = ""): void {
		this.tabManager.createTab(url);
		if (url) this.navigateTo(url);
		else this.loadWelcomePage();
	}

	reopenClosedTab(): void {
		const tab = this.tabManager.reopenClosedTab();
		if (tab?.url) this.navigateTo(tab.url);
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

	private openCurrentAsPage(): void {
		const url = this.getCurrentUrl();
		if (!url || url.startsWith("blob:")) {
			new Notice("Nothing to open — navigate to a page first.");
			return;
		}
		const title = this.getCurrentTitle() || "Web Page";
		void this.plugin.openWebPage(url, title);
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
		this.tabManager.setActiveTab(tabId);
		const tab = this.tabManager.getActiveTab();
		if (tab?.url) {
			this.browserManager?.loadUrl(tab.url);
			this.toolbar?.setUrl(tab.url);
		}
	}

	private closeTab(tabId: string): void {
		this.tabManager.closeTab(tabId);
		const tab = this.tabManager.getActiveTab();
		if (tab?.url) {
			this.browserManager?.loadUrl(tab.url);
			this.toolbar?.setUrl(tab.url);
		}
	}

	private duplicateTab(tabId: string): void {
		const dup = this.tabManager.duplicateTab(tabId);
		if (dup?.url) this.navigateTo(dup.url);
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
		this.plugin.savePersistedData();
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
		this.toolbar?.setUrl(url);
		const tab = this.tabManager.getActiveTab();
		if (tab) {
			this.tabManager.updateTab(tab.id, { url });
		}
		this.plugin.historyManager.addEntry(url, this.browserManager?.getTitle() ?? url);
		this.toolbar?.setBookmarked(this.plugin.bookmarkManager.isBookmarked(url));

		if (this.plugin.settings.watchFileChanges) {
			this.fileWatcher.watch(url);
		}
	}

	private handleTitleChange(title: string): void {
		const tab = this.tabManager.getActiveTab();
		if (tab) {
			this.tabManager.updateTab(tab.id, { title });
		}
		this.statusBar?.setStatus(title);
	}

	private handleFaviconChange(favicon: string): void {
		const tab = this.tabManager.getActiveTab();
		if (tab) this.tabManager.updateTab(tab.id, { favicon });
	}

	private handleLoadingChange(loading: boolean): void {
		this.toolbar?.setLoading(loading);
	}

	private loadWelcomePage(): void {
		const welcomeHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Obsidian Browser</title>
<style>
body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center;
min-height: 100vh; margin: 0; background: #1e1e1e; color: #ccc; }
.card { text-align: center; max-width: 480px; padding: 2rem; }
h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
p { color: #888; line-height: 1.6; }
</style></head><body><div class="card">
<h1>Obsidian Browser</h1>
<p>Open local HTML files with full Chromium rendering.<br>
Use the toolbar to open files, folders, or enter a <code>file://</code> URL.</p>
</div></body></html>`;
		const blob = new Blob([welcomeHtml], { type: "text/html" });
		const url = URL.createObjectURL(blob);
		this.browserManager?.loadUrl(url);
	}
}
