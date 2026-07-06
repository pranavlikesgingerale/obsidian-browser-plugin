import { Plugin, Notice, TFile, normalizePath } from "obsidian";
import {
	BROWSER_VIEW_TYPE,
	WEB_PAGE_VIEW_TYPE,
	DEFAULT_SETTINGS,
	type BrowserPluginSettings,
	type Bookmark,
	type HistoryEntry,
} from "./types";
import { BrowserView } from "./ui/browser-view";
import { WebPageView } from "./ui/web-page-view";
import { BrowserSettingTab } from "./settings/settings-tab";
import { HistoryManager } from "./history/history-manager";
import { BookmarkManager } from "./bookmarks/bookmark-manager";
import { registerCommands } from "./commands/commands";
import { detectCompatibility } from "./browser/compatibility";
import { mainLogger } from "./utils/logger";
import {
	buildWebpageFileContent,
	pageNoteExtension,
	parsePageNote,
} from "./page-notes/page-notes";

interface PersistedData {
	history: HistoryEntry[];
	bookmarks: Bookmark[];
}

/** Obsidian Browser — full Chromium browser for local HTML development. */
export default class ObsidianBrowserPlugin extends Plugin {
	settings: BrowserPluginSettings = { ...DEFAULT_SETTINGS };
	historyManager = new HistoryManager();
	bookmarkManager = new BookmarkManager();

	async onload(): Promise<void> {
		await this.loadSettings();
		await this.loadPersistedData();

		const compat = detectCompatibility();
		mainLogger.info("Compatibility:", compat);

		if (!compat.webviewAvailable) {
			new Notice(
				"Obsidian Browser: webview unavailable — using iframe fallback. See settings for details.",
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

		this.addRibbonIcon("globe", "Open Obsidian Browser", () => {
			this.activateBrowserView();
		});

		registerCommands(this);
		this.addSettingTab(new BrowserSettingTab(this.app, this));

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

		mainLogger.info("Obsidian Browser plugin loaded.");
	}

	onunload(): void {
		this.app.workspace.getLeavesOfType(BROWSER_VIEW_TYPE).forEach((leaf) => leaf.detach());
		this.app.workspace.getLeavesOfType(WEB_PAGE_VIEW_TYPE).forEach((leaf) => leaf.detach());
	}

	async loadSettings(): Promise<void> {
		const data = await this.loadData();
		this.settings = { ...DEFAULT_SETTINGS, ...data?.settings };
	}

	async saveSettings(): Promise<void> {
		const data = (await this.loadData()) ?? {};
		data.settings = this.settings;
		await this.saveData(data);
	}

	async loadPersistedData(): Promise<void> {
		const data = (await this.loadData()) as PersistedData | null;
		if (data?.history) this.historyManager.deserialize(data.history);
		if (data?.bookmarks) this.bookmarkManager.deserialize(data.bookmarks);
	}

	async savePersistedData(): Promise<void> {
		const data = ((await this.loadData()) ?? {}) as Record<string, unknown>;
		data.history = this.historyManager.serialize();
		data.bookmarks = this.bookmarkManager.serialize();
		await this.saveData(data);
	}

	async activateBrowserView(): Promise<BrowserView | null> {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(BROWSER_VIEW_TYPE)[0];
		if (!leaf) {
			leaf = workspace.getLeaf("tab");
			await leaf.setViewState({ type: BROWSER_VIEW_TYPE, active: true });
		}

		workspace.revealLeaf(leaf);
		return leaf.view as BrowserView;
	}

	async openWebPage(url: string, title?: string, sourcePath?: string): Promise<WebPageView | null> {
		if (!url) return null;

		const leaf = this.app.workspace.getLeaf("tab");
		await leaf.setViewState({
			type: WEB_PAGE_VIEW_TYPE,
			state: { url, title: title ?? "", sourcePath },
			active: true,
		});
		this.app.workspace.revealLeaf(leaf);
		return leaf.view as unknown as WebPageView;
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
		const leaf = this.app.workspace.activeLeaf;
		if (leaf?.view instanceof BrowserView) return leaf.view;

		const leaves = this.app.workspace.getLeavesOfType(BROWSER_VIEW_TYPE);
		if (leaves.length > 0) return leaves[0].view as BrowserView;
		return null;
	}

	getActiveWebPageView(): WebPageView | null {
		const leaf = this.app.workspace.activeLeaf;
		if (leaf?.view instanceof WebPageView) return leaf.view;
		return null;
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

		requestAnimationFrame(() => {
			void (async () => {
				const leaf = this.app.workspace.activeLeaf;
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
