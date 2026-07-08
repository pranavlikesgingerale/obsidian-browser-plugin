import { ItemView, Notice, WorkspaceLeaf, setIcon, type ViewStateResult } from "obsidian";
import type LocalHtmlBrowserPlugin from "../main";
import { WEB_PAGE_VIEW_TYPE, parseWebPageState } from "../types";
import { BrowserManager } from "../browser/browser-manager";
import { FileWatcher } from "../utils/file-watcher";
import { parsePageNote } from "../page-notes/page-notes";
import { getViewContentContainer } from "../utils/dom";
import { isPersistableBrowserUrl } from "../utils/browser-url";

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
	private pendingLoad: { url: string; title?: string } | null = null;

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
		if (!parsed?.url) return;

		this.sourcePath = parsed.sourcePath ?? "";
		if (this.browserManager && this.contentEl_) {
			this.scheduleLoad(parsed.url, parsed.title);
		} else {
			this.pendingLoad = { url: parsed.url, title: parsed.title };
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

		const saveBtn = actions.createEl("button", {
			cls: "local-html-browser-btn",
			attr: { title: "Save page note" },
		});
		setIcon(saveBtn, "save");
		saveBtn.addEventListener("click", () => {
			void this.savePageNote();
		});

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

		this.browserManager = new BrowserManager(
			this.plugin.settings,
			{
				onLoadStart: () => {
					this.titleEl?.addClass("is-loading");
					this.clearError();
				},
				onLoadStop: () => {
					this.titleEl?.removeClass("is-loading");
					this.browserManager?.syncLayout();
				},
				onNavigate: (url) => {
					this.currentUrl = url;
					this.persistPageState();
				},
				onTitleChange: (title) => {
					this.currentTitle = title;
					if (this.titleEl) this.titleEl.setText(title);
					this.persistPageState();
				},
				onFaviconChange: () => {},
				onLoadingStateChange: () => {},
				onCanNavigateChange: () => {},
				onConsoleMessage: (msg) => {
					if (!this.plugin.settings.forwardConsoleLogs) return;
					const prefix = `[Web Page:${msg.level}] ${msg.message}`;
					if (msg.level === "error") {
						console.error(prefix);
					} else if (msg.level === "warn") {
						console.warn(prefix);
					}
				},
				onNewWindow: (url) => this.scheduleLoad(url),
				onError: (msg) => this.showError(msg),
			},
			{ allowIframeFallback: false },
		);

		const engine = this.browserManager.initialize(this.contentEl_);
		if (engine === "unavailable") {
			this.showError("Browser engine unavailable. Check Settings → Local HTML Browser → Compatibility.");
		} else if (engine === "iframe-blob") {
			this.showError(
				"Page tabs require webview mode for local apps. Iframe fallback cannot run SPAs reliably.",
			);
		}

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

		this.registerDomEvent(this.contentEl_, "transitionend", () => {
			this.browserManager?.syncLayout();
		});

		const parsed = parseWebPageState(this.leaf.getViewState().state);
		if (parsed?.url) {
			this.sourcePath = parsed.sourcePath ?? "";
			this.scheduleLoad(parsed.url, parsed.title);
		} else if (this.pendingLoad) {
			this.scheduleLoad(this.pendingLoad.url, this.pendingLoad.title);
			this.pendingLoad = null;
		} else {
			const file = this.app.workspace.getActiveFile();
			if (file) {
				const data = await parsePageNote(this.plugin.app, file);
				if (data) {
					this.sourcePath = file.path;
					this.scheduleLoad(data.url, data.title);
				}
			}
		}
	}

	async onClose(): Promise<void> {
		this.plugin.unregisterOpenPage(this.currentUrl, this.sourcePath);
		this.fileWatcher.stop();
		this.browserManager?.destroy();
		this.browserManager = null;
	}

	/** Load or reload a page after the view is ready. */
	openPage(url: string, title?: string, sourcePath?: string): void {
		if (sourcePath) this.sourcePath = sourcePath;
		if (this.browserManager && this.contentEl_) {
			this.scheduleLoad(url, title);
		} else {
			this.pendingLoad = { url, title };
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

	private scheduleLoad(url: string, title?: string): void {
		if (!url) return;
		if (url.startsWith("blob:") || url.startsWith("data:")) {
			this.showError("This page cannot be opened as a standalone tab. Navigate to a file:// or http(s) URL first.");
			return;
		}

		this.pendingLoad = { url, title };
		this.tryFlushLoad(0);
	}

	private tryFlushLoad(attempt: number): void {
		if (!this.pendingLoad || !this.browserManager || !this.contentEl_) return;

		const height = this.contentEl_.clientHeight;
		if (height <= 0 && attempt < 40) {
			window.requestAnimationFrame(() => this.tryFlushLoad(attempt + 1));
			return;
		}

		this.browserManager.syncLayout();
		const { url, title } = this.pendingLoad;
		this.pendingLoad = null;
		this.applyLoad(url, title);
	}

	private applyLoad(url: string, title?: string): void {
		this.currentUrl = url;
		if (title) {
			this.currentTitle = title;
			this.titleEl?.setText(title);
		}

		this.browserManager?.syncLayout();
		this.browserManager?.loadUrl(url);
		this.persistPageState();

		if (this.plugin.settings.watchFileChanges && isPersistableBrowserUrl(url)) {
			this.fileWatcher.watch(url);
		}

		window.requestAnimationFrame(() => {
			this.browserManager?.syncLayout();
		});
	}

	private async savePageNote(): Promise<void> {
		if (!this.currentUrl || this.currentUrl.startsWith("blob:")) {
			new Notice("Nothing to save.");
			return;
		}
		const title = this.currentTitle || "Web Page";
		const file = await this.plugin.savePageNote(this.currentUrl, title);
		if (file) {
			this.sourcePath = file.path;
			this.persistPageState();
			new Notice(`Saved page note: ${file.path}`);
		}
	}

	private persistPageState(): void {
		if (!this.currentUrl) return;
		this.plugin.registerOpenPage({
			url: this.currentUrl,
			title: this.currentTitle || this.currentUrl,
			sourcePath: this.sourcePath || undefined,
		});
	}

	private clearError(): void {
		this.statusEl?.removeClass("is-visible");
		this.statusEl?.setText("");
	}

	private showError(msg: string): void {
		if (this.statusEl) {
			this.statusEl.addClass("is-visible");
			this.statusEl.setText(msg);
		}
		if (this.titleEl && !this.currentTitle) {
			this.titleEl.setText("Failed to load");
		}
		new Notice(msg, 5000);
	}
}
