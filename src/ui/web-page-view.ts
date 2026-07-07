import { ItemView, WorkspaceLeaf, setIcon, type ViewStateResult } from "obsidian";
import type LocalHtmlBrowserPlugin from "../main";
import { WEB_PAGE_VIEW_TYPE, parseWebPageState } from "../types";
import { BrowserManager } from "../browser/browser-manager";
import { FileWatcher } from "../utils/file-watcher";
import { parsePageNote } from "../page-notes/page-notes";
import { getViewContentContainer } from "../utils/dom";

/**
 * A single webpage as its own Obsidian tab — no browser chrome, just the page.
 */
export class WebPageView extends ItemView {
	private browserManager: BrowserManager | null = null;
	private fileWatcher = new FileWatcher();
	private contentEl_: HTMLElement | null = null;
	private titleEl: HTMLElement | null = null;
	private statusEl: HTMLElement | null = null;
	private currentUrl = "";
	private currentTitle = "";
	private sourcePath = "";
	private pendingUrl: string | null = null;
	private pendingTitle: string | undefined;

	constructor(leaf: WorkspaceLeaf, private plugin: LocalHtmlBrowserPlugin) {
		super(leaf);

		this.fileWatcher.onChange(() => {
			if (plugin.settings.autoRefresh && plugin.settings.watchFileChanges) {
				this.browserManager?.reload();
			}
		});
	}

	getViewType(): string {
		return WEB_PAGE_VIEW_TYPE;
	}

	getDisplayText(): string {
		return this.currentTitle || "Web Page";
	}

	getIcon(): string {
		return "globe";
	}

	getState(): Record<string, unknown> {
		return {
			url: this.currentUrl,
			title: this.currentTitle,
			sourcePath: this.sourcePath || undefined,
		};
	}

	async setState(state: Record<string, unknown>, _result: ViewStateResult): Promise<void> {
		const parsed = parseWebPageState(state);
		if (parsed?.url && this.browserManager) {
			this.sourcePath = parsed.sourcePath ?? "";
			this.loadPage(parsed.url, parsed.title);
		} else if (parsed?.url) {
			this.pendingUrl = parsed.url;
			this.pendingTitle = parsed.title;
			this.sourcePath = parsed.sourcePath ?? "";
		}
	}

	async onOpen(): Promise<void> {
		const container = getViewContentContainer(this.containerEl);
		container.empty();
		container.addClass("local-html-browser-page-view");

		const header = container.createDiv({ cls: "local-html-browser-page-header" });
		this.titleEl = header.createSpan({ cls: "local-html-browser-page-title", text: "Loading..." });

		const actions = header.createDiv({ cls: "local-html-browser-page-actions" });

		const reloadBtn = actions.createEl("button", { cls: "local-html-browser-btn", attr: { title: "Reload" } });
		setIcon(reloadBtn, "rotate-cw");
		reloadBtn.addEventListener("click", () => this.browserManager?.reload());

		const browserBtn = actions.createEl("button", {
			cls: "local-html-browser-btn",
			attr: { title: "Open in full browser" },
		});
		setIcon(browserBtn, "external-link");
		browserBtn.addEventListener("click", () => {
			void this.plugin.activateBrowserView().then((view) => {
				view?.navigateTo(this.currentUrl);
			});
		});

		this.contentEl_ = container.createDiv({ cls: "local-html-browser-page-content" });
		this.statusEl = container.createDiv({ cls: "local-html-browser-page-status" });

		this.browserManager = new BrowserManager(this.plugin.settings, {
			onLoadStart: () => this.titleEl?.addClass("is-loading"),
			onLoadStop: () => this.titleEl?.removeClass("is-loading"),
			onNavigate: (url) => {
				this.currentUrl = url;
			},
			onTitleChange: (title) => {
				this.currentTitle = title;
				if (this.titleEl) this.titleEl.setText(title);
			},
			onFaviconChange: () => {},
			onLoadingStateChange: () => {},
			onCanNavigateChange: () => {},
			onConsoleMessage: (msg) => {
				if (this.plugin.settings.forwardConsoleLogs) {
					console.log(`[Web Page:${msg.level}]`, msg.message);
				}
			},
			onNewWindow: (url) => this.loadPage(url),
			onError: (msg) => this.showError(msg),
		});

		if (this.contentEl_) {
			const engine = this.browserManager.initialize(this.contentEl_);
			if (engine === "iframe-blob") {
				this.showError(
					"Using iframe fallback — local SPAs (like your L app) need webview mode. Check Settings → Compatibility.",
				);
			}
		}

		const parsed = parseWebPageState(this.leaf.getViewState().state);
		if (parsed?.url) {
			this.sourcePath = parsed.sourcePath ?? "";
			this.loadPage(parsed.url, parsed.title);
		} else if (this.pendingUrl) {
			this.loadPage(this.pendingUrl, this.pendingTitle);
			this.pendingUrl = null;
			this.pendingTitle = undefined;
		} else {
			const file = this.app.workspace.getActiveFile();
			if (file) {
				const data = await parsePageNote(this.plugin.app, file);
				if (data) {
					this.sourcePath = file.path;
					this.loadPage(data.url, data.title);
				}
			}
		}
	}

	async onClose(): Promise<void> {
		this.fileWatcher.stop();
		this.browserManager?.destroy();
		this.browserManager = null;
	}

	loadPage(url: string, title?: string): void {
		if (!url) return;
		this.currentUrl = url;
		if (title) {
			this.currentTitle = title;
			if (this.titleEl) this.titleEl.setText(title);
		}
		this.browserManager?.loadUrl(url);

		if (this.plugin.settings.watchFileChanges) {
			this.fileWatcher.watch(url);
		}
	}

	reload(): void {
		this.browserManager?.reload();
	}

	getUrl(): string {
		return this.currentUrl;
	}

	getTitle(): string {
		return this.currentTitle;
	}

	private showError(msg: string): void {
		if (this.statusEl) {
			this.statusEl.addClass("is-visible");
			this.statusEl.setText(msg);
		}
		if (this.titleEl) this.titleEl.setText(msg);
	}
}
