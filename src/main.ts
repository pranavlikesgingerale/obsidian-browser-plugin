import { Plugin, Notice, TFile, normalizePath } from "obsidian";
import {
	BROWSER_VIEW_TYPE,
	WEB_PAGE_VIEW_TYPE,
	DEFAULT_SETTINGS,
	parseWebPageState,
	type BrowserPluginSettings,
} from "./types";
import { BrowserView } from "./ui/browser-view";
import { WebPageView } from "./ui/web-page-view";
import { BrowserSettingTab } from "./settings/settings-tab";
import { HistoryManager } from "./history/history-manager";
import { BookmarkManager } from "./bookmarks/bookmark-manager";
import { registerCommands } from "./commands/commands";
import { detectCompatibility } from "./browser/compatibility";
import { parsePluginData, type PluginData } from "./utils/plugin-data";
import type { BrowserSessionSnapshot, PersistedWebPage } from "./types";
import {
	buildWebpageFileContent,
	pageNoteExtension,
	parsePageNote,
} from "./page-notes/page-notes";

async function readPluginData(plugin: Plugin): Promise<PluginData> {
	return parsePluginData(await plugin.loadData());
}

/** Local HTML Browser — Chromium browser for local file:// HTML apps. */
export default class LocalHtmlBrowserPlugin extends Plugin {
	settings: BrowserPluginSettings = { ...DEFAULT_SETTINGS };
	historyManager = new HistoryManager();
	bookmarkManager = new BookmarkManager();
	private browserSession: BrowserSessionSnapshot | null = null;
	private openPages: PersistedWebPage[] = [];

	async onload(): Promise<void> {
		await this.loadSettings();
		await this.loadPersistedData();

		const compat = detectCompatibility(this.app);

		if (!compat.webviewAvailable) {
			new Notice(
				"Local HTML browser: webview unavailable — using iframe fallback. See settings for details.",
				10000,
			);
		}

		this.registerView(BROWSER_VIEW_TYPE, (leaf) => new BrowserView(leaf, this));
		this.registerView(WEB_PAGE_VIEW_TYPE, (leaf) => new WebPageView(leaf, this));
		this.registerExtensions([pageNoteExtension()], WEB_PAGE_VIEW_TYPE);

		this.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				if (file) void this.handleFileOpen(file);
			}),
		);

		this.addRibbonIcon("globe", "Open local HTML browser", () => {
			void this.activateBrowserView();
		});

		registerCommands(this);
		this.addSettingTab(new BrowserSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(() => {
			if (!this.settings.restoreSessionOnStartup) return;

			const session = this.getBrowserSession();
			if (session && session.tabs.length > 0) {
				if (this.app.workspace.getLeavesOfType(BROWSER_VIEW_TYPE).length === 0) {
					void this.activateBrowserView();
				}
			}
			void this.restoreOpenPages();
		});

		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (!this.settings.refreshOnSave) return;

				const pageView = this.getActiveWebPageView();
				if (pageView) {
					const url = pageView.getUrl();
					if (url.includes(file.path) || url.includes(file.name)) {
						pageView.reload();
						return;
					}
				}

				const view = this.getActiveBrowserView();
				if (!view) return;
				const url = view.getCurrentUrl();
				if (url.includes(file.path) || url.includes(file.name)) {
					view.reload();
				}
			}),
		);

	}

	onunload(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(BROWSER_VIEW_TYPE)) {
			if (leaf.view instanceof BrowserView) {
				leaf.view.persistSessionNow();
			}
		}
		void this.savePersistedData();
		this.app.workspace.getLeavesOfType(BROWSER_VIEW_TYPE).forEach((leaf) => leaf.detach());
		this.app.workspace.getLeavesOfType(WEB_PAGE_VIEW_TYPE).forEach((leaf) => leaf.detach());
	}

	async loadSettings(): Promise<void> {
		const data = await readPluginData(this);
		this.settings = { ...DEFAULT_SETTINGS, ...data.settings };
	}

	async saveSettings(): Promise<void> {
		const data = await readPluginData(this);
		data.settings = this.settings;
		await this.saveData(data);
	}

	async loadPersistedData(): Promise<void> {
		const data = await readPluginData(this);
		if (data.history) this.historyManager.deserialize(data.history);
		if (data.bookmarks) this.bookmarkManager.deserialize(data.bookmarks);
		this.browserSession = data.session ?? null;
		this.openPages = data.openPages ?? [];
	}

	async savePersistedData(): Promise<void> {
		const data = await readPluginData(this);
		data.history = this.historyManager.serialize();
		data.bookmarks = this.bookmarkManager.serialize();
		if (this.browserSession) {
			data.session = this.browserSession;
		}
		data.openPages = this.openPages;
		await this.saveData(data);
	}

	async saveBrowserSession(snapshot: BrowserSessionSnapshot): Promise<void> {
		this.browserSession = {
			...snapshot,
			savedAt: Date.now(),
		};
		const data = await readPluginData(this);
		data.session = this.browserSession;
		data.history = this.historyManager.serialize();
		data.bookmarks = this.bookmarkManager.serialize();
		data.openPages = this.openPages;
		await this.saveData(data);
	}

	registerOpenPage(page: PersistedWebPage): void {
		if (!page.url) return;

		const bySource = page.sourcePath
			? this.openPages.findIndex((entry) => entry.sourcePath === page.sourcePath)
			: -1;
		if (bySource >= 0) {
			this.openPages[bySource] = page;
		} else {
			const byUrl = this.openPages.findIndex((entry) => entry.url === page.url);
			if (byUrl >= 0) this.openPages[byUrl] = page;
			else this.openPages.push(page);
		}

		void this.saveOpenPages();
	}

	unregisterOpenPage(url: string, sourcePath?: string): void {
		if (!url) return;
		const before = this.openPages.length;
		this.openPages = this.openPages.filter((entry) => {
			if (sourcePath && entry.sourcePath === sourcePath) return false;
			return entry.url !== url;
		});
		if (this.openPages.length !== before) {
			void this.saveOpenPages();
		}
	}

	private async saveOpenPages(): Promise<void> {
		const data = await readPluginData(this);
		data.openPages = this.openPages;
		await this.saveData(data);
	}

	private async restoreOpenPages(): Promise<void> {
		if (!this.settings.restoreSessionOnStartup || this.openPages.length === 0) return;

		const maxTabs = Math.max(1, this.settings.maxRestoredTabs || 5);
		const pages = this.openPages.slice(0, maxTabs);

		const openUrls = new Set(
			this.app.workspace
				.getLeavesOfType(WEB_PAGE_VIEW_TYPE)
				.map((leaf) => parseWebPageState(leaf.getViewState().state)?.url)
				.filter((url): url is string => Boolean(url)),
		);

		for (const page of pages) {
			if (openUrls.has(page.url)) continue;
			await this.openWebPage(page.url, page.title, page.sourcePath, false);
		}
	}

	getBrowserSession(): BrowserSessionSnapshot | null {
		return this.browserSession;
	}

	/** Drop persisted tabs/pages so the next launch does not restore them. */
	async clearSavedSession(): Promise<void> {
		this.browserSession = null;
		this.openPages = [];
		const data = await readPluginData(this);
		data.session = undefined;
		data.openPages = [];
		data.history = this.historyManager.serialize();
		data.bookmarks = this.bookmarkManager.serialize();
		data.settings = this.settings;
		await this.saveData(data);
	}

	async activateBrowserView(): Promise<BrowserView | null> {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(BROWSER_VIEW_TYPE)[0];
		if (!leaf) {
			leaf = workspace.getLeaf(false);
			await leaf.setViewState({ type: BROWSER_VIEW_TYPE, active: true });
		}

		await workspace.revealLeaf(leaf);
		return leaf.view instanceof BrowserView ? leaf.view : null;
	}

	async openWebPage(
		url: string,
		title?: string,
		sourcePath?: string,
		saveNote = true,
	): Promise<WebPageView | null> {
		if (!url || url.startsWith("blob:") || url.startsWith("data:")) {
			new Notice("This page cannot be opened as a standalone tab.");
			return null;
		}

		let notePath = sourcePath;
		if (saveNote && !notePath) {
			const file = await this.savePageNote(url, title || "Web Page");
			notePath = file?.path;
		}

		const leaf = this.app.workspace.getLeaf(false);
		await leaf.setViewState({
			type: WEB_PAGE_VIEW_TYPE,
			state: { url, title: title ?? "", sourcePath: notePath },
			active: true,
		});
		await this.app.workspace.revealLeaf(leaf);

		const view = leaf.view instanceof WebPageView ? leaf.view : null;
		view?.openPage(url, title, notePath);
		return view;
	}

	async savePageNote(url: string, title: string, folder?: string): Promise<TFile | null> {
		const dir = normalizePath(folder || this.settings.pageNotesFolder);
		const safeName = title.replace(/[\\/:*?"<>|]/g, "-").trim() || "Web Page";
		const filePath = normalizePath(`${dir}/${safeName}.${pageNoteExtension()}`);

		try {
			if (!this.app.vault.getAbstractFileByPath(dir)) {
				await this.app.vault.createFolder(dir);
			}

			const content = buildWebpageFileContent(url, title);
			const existing = this.app.vault.getAbstractFileByPath(filePath);
			if (existing instanceof TFile) {
				await this.app.vault.modify(existing, content);
				return existing;
			}

			return await this.app.vault.create(filePath, content);
		} catch (e) {
			new Notice(`Could not save page note: ${e instanceof Error ? e.message : String(e)}`);
			return null;
		}
	}

	getActiveBrowserView(): BrowserView | null {
		const active = this.app.workspace.getActiveViewOfType(BrowserView);
		if (active) return active;

		const leaves = this.app.workspace.getLeavesOfType(BROWSER_VIEW_TYPE);
		if (leaves.length > 0 && leaves[0].view instanceof BrowserView) {
			return leaves[0].view;
		}
		return null;
	}

	getActiveWebPageView(): WebPageView | null {
		return this.app.workspace.getActiveViewOfType(WebPageView);
	}

	private async handleFileOpen(file: TFile): Promise<void> {
		if (file.extension === pageNoteExtension()) return;

		if ((file.extension === "html" || file.extension === "htm") && !this.settings.openVaultHtmlAsPage) {
			return;
		}

		if (
			file.extension !== "md" &&
			file.extension !== "markdown" &&
			file.extension !== "html" &&
			file.extension !== "htm"
		) {
			return;
		}

		const data = await parsePageNote(this.app, file);
		if (!data) return;

		window.requestAnimationFrame(() => {
			void (async () => {
				const leaf = this.app.workspace.getMostRecentLeaf();
				if (!leaf) return;
				await leaf.setViewState({
					type: WEB_PAGE_VIEW_TYPE,
					state: { url: data.url, title: data.title, sourcePath: file.path },
					active: true,
				});
				if (leaf.view instanceof WebPageView) {
					leaf.view.openPage(data.url, data.title, file.path);
				}
			})();
		});
	}
}
