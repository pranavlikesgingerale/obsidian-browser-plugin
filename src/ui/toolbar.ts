import { setIcon } from "obsidian";
import { getActiveDocument } from "../utils/dom";

/** Toolbar button definitions and factory. */
export interface ToolbarCallbacks {
	onBack: () => void;
	onForward: () => void;
	onReload: () => void;
	onHardReload: () => void;
	onStop: () => void;
	onHome: () => void;
	onNavigate: (url: string) => void;
	onOpenFile: () => void;
	onOpenFolder: () => void;
	onToggleBookmark: () => void;
	onToggleDevTools: () => void;
	onNewTab: () => void;
	onOpenAsPage: () => void;
	onSaveAsNote: () => void;
}

export class Toolbar {
	readonly el: HTMLElement;
	private urlInput: HTMLInputElement;
	private loadingIndicator: HTMLElement;
	private bookmarkBtn: HTMLButtonElement;

	constructor(callbacks: ToolbarCallbacks) {
		const doc = getActiveDocument();
		this.el = doc.createElement("div");
		this.el.className = "local-html-browser-toolbar";

		const navGroup = this.el.createDiv({ cls: "local-html-browser-nav-group" });

		this.createNavButton(navGroup, "arrow-left", "Back", callbacks.onBack);
		this.createNavButton(navGroup, "arrow-right", "Forward", callbacks.onForward);
		this.createNavButton(navGroup, "rotate-cw", "Reload", callbacks.onReload);
		this.createNavButton(navGroup, "refresh-cw", "Hard Reload", callbacks.onHardReload);
		this.createNavButton(navGroup, "square", "Stop", callbacks.onStop);
		this.createNavButton(navGroup, "home", "Home", callbacks.onHome);

		const urlBar = this.el.createDiv({ cls: "local-html-browser-url-bar" });
		this.loadingIndicator = urlBar.createDiv({ cls: "local-html-browser-loading-indicator" });

		this.urlInput = urlBar.createEl("input", {
			type: "text",
			cls: "local-html-browser-url-input",
			attr: { placeholder: "Enter file:// path or URL..." },
		});

		this.urlInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				callbacks.onNavigate(this.urlInput.value);
			}
		});

		const actionGroup = this.el.createDiv({ cls: "local-html-browser-action-group" });
		this.createNavButton(actionGroup, "folder-open", "Open File", callbacks.onOpenFile);
		this.createNavButton(actionGroup, "folder", "Open Folder", callbacks.onOpenFolder);
		this.bookmarkBtn = this.createNavButton(actionGroup, "bookmark", "Bookmark", callbacks.onToggleBookmark);
		this.createNavButton(actionGroup, "layout", "Open as page", callbacks.onOpenAsPage);
		this.createNavButton(actionGroup, "file-plus", "Save as note", callbacks.onSaveAsNote);
		this.createNavButton(actionGroup, "code", "DevTools", callbacks.onToggleDevTools);
		this.createNavButton(actionGroup, "plus", "New Tab", callbacks.onNewTab);
	}

	setUrl(url: string): void {
		this.urlInput.value = url;
	}

	setLoading(loading: boolean): void {
		this.el.toggleClass("is-loading", loading);
	}

	setBookmarked(bookmarked: boolean): void {
		this.bookmarkBtn.toggleClass("is-active", bookmarked);
	}

	setNavState(canBack: boolean, canForward: boolean): void {
		const buttons = this.el.querySelectorAll(".local-html-browser-nav-group button");
		const backBtn = buttons[0];
		const forwardBtn = buttons[1];
		if (backBtn?.instanceOf(HTMLButtonElement)) backBtn.disabled = !canBack;
		if (forwardBtn?.instanceOf(HTMLButtonElement)) forwardBtn.disabled = !canForward;
	}

	private createNavButton(
		parent: HTMLElement,
		icon: string,
		title: string,
		onClick: () => void,
	): HTMLButtonElement {
		const btn = parent.createEl("button", { cls: "local-html-browser-btn", attr: { title } });
		setIcon(btn, icon);
		btn.addEventListener("click", onClick);
		return btn;
	}
}
