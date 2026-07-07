import { Plugin, Notice, TFile, normalizePath } from "obsidian";
import {
	BROWSER_VIEW_TYPE,
	WEB_PAGE_VIEW_TYPE,
	DEFAULT_SETTINGS,
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
import type { BrowserSessionSnapshot } from "./types";
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
			if (!session || session.tabs.length === 0) return;
			if (this.app.workspace.getLeavesOfType(BROWSER_VIEW_TYPE).length === 0) {
				void this.activateBrowserView();
			}
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
	}

	async savePersistedData(): Promise<void> {
		const data = await readPluginData(this);
		data.history = this.historyManager.serialize();
		data.bookmarks = this.bookmarkManager.serialize();
		if (this.browserSession) {
			data.session = this.browserSession;
		}
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
		await this.saveData(data);
	}

	getBrowserSession(): BrowserSessionSnapshot | null {
		return this.browserSession;
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

	async openWebPage(url: string, title?: string, sourcePath?: string): Promise<WebPageView | null> {
		if (!url) return null;

		const leaf = this.app.workspace.getLeaf(false);
		await leaf.setViewState({
			type: WEB_PAGE_VIEW_TYPE,
			state: { url, title: title ?? "", sourcePath },
			active: true,
		});
		await this.app.workspace.revealLeaf(leaf);
		return leaf.view instanceof WebPageView ? leaf.view : null;
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
			})();
		});
	}
}
