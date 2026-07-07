import { Menu, setIcon } from "obsidian";
import { createRootDiv } from "../utils/dom";
import type { BrowserTab } from "../types";
import { getTabDisplayTitle } from "../types";

export interface TabBarCallbacks {
	onSelectTab: (tabId: string) => void;
	onCloseTab: (tabId: string) => void;
	onDuplicateTab: (tabId: string) => void;
	onNewTab: () => void;
	onRenameTab: (tabId: string, title: string) => void;
	onResetTabTitle: (tabId: string) => void;
	onMoveTab: (fromIndex: number, toIndex: number) => void;
	onCloseOtherTabs: (tabId: string) => void;
	onCloseTabsToRight: (tabId: string) => void;
}

interface TabElementParts {
	root: HTMLElement;
	titleEl: HTMLElement;
	faviconImg: HTMLImageElement | null;
	iconEl: HTMLElement | null;
	closeBtn: HTMLButtonElement;
}

/** Horizontal tab bar with drag-reorder, rename, and browser-like interactions. */
export class TabBar {
	readonly el: HTMLElement;
	private tabListEl: HTMLElement;
	private tabParts = new Map<string, TabElementParts>();
	private renamingTabId: string | null = null;
	private dragTabId: string | null = null;
	private dropTargetIndex: number | null = null;
	private lastTabs: BrowserTab[] = [];

	constructor(private callbacks: TabBarCallbacks) {
		this.el = createRootDiv();
		this.el.className = "local-html-browser-tab-bar";

		this.tabListEl = this.el.createDiv({ cls: "local-html-browser-tab-list" });
		this.tabListEl.addEventListener(
			"wheel",
			(event) => {
				if (event.deltaY === 0) return;
				event.preventDefault();
				this.tabListEl.scrollLeft += event.deltaY;
			},
			{ passive: false },
		);

		const newTabBtn = this.el.createEl("button", {
			cls: "local-html-browser-tab-new",
			attr: { title: "New tab (Ctrl+T)" },
		});
		setIcon(newTabBtn, "plus");
		newTabBtn.addEventListener("click", () => callbacks.onNewTab());
	}

	/** Sync tab strip with model state without rebuilding every element. */
	sync(tabs: BrowserTab[], activeId: string | null): void {
		this.lastTabs = tabs;
		const liveIds = new Set(tabs.map((tab) => tab.id));

		for (const [tabId, parts] of this.tabParts) {
			if (!liveIds.has(tabId)) {
				parts.root.remove();
				this.tabParts.delete(tabId);
			}
		}

		for (const tab of tabs) {
			let parts = this.tabParts.get(tab.id);
			if (!parts) {
				parts = this.createTabElement(tab);
				this.tabParts.set(tab.id, parts);
			}

			this.updateTabElement(parts, tab, tab.id === activeId);
			this.tabListEl.appendChild(parts.root);
		}

		this.syncDropIndicators();

		if (activeId) {
			const activeEl = this.tabParts.get(activeId)?.root;
			if (activeEl) {
				window.requestAnimationFrame(() => {
					activeEl.scrollIntoView({ inline: "nearest", block: "nearest" });
				});
			}
		}
	}

	startRename(tabId: string): void {
		const parts = this.tabParts.get(tabId);
		if (!parts || this.renamingTabId === tabId) return;

		const tab = this.lastTabs.find((item) => item.id === tabId);
		this.renamingTabId = tabId;
		parts.root.addClass("is-renaming");

		const input = parts.root.createEl("input", {
			type: "text",
			cls: "local-html-browser-tab-rename-input",
		});
		input.value = tab ? getTabDisplayTitle(tab) : parts.titleEl.textContent ?? "";
		parts.titleEl.hide();

		const finish = (save: boolean): void => {
			if (this.renamingTabId !== tabId) return;
			const value = input.value.trim();
			input.remove();
			parts.titleEl.show();
			parts.root.removeClass("is-renaming");
			this.renamingTabId = null;
			if (save) this.callbacks.onRenameTab(tabId, value);
		};

		input.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault();
				finish(true);
			} else if (event.key === "Escape") {
				event.preventDefault();
				finish(false);
			}
		});
		input.addEventListener("blur", () => finish(true));

		window.requestAnimationFrame(() => {
			input.focus();
			input.select();
		});
	}

	private createTabElement(tab: BrowserTab): TabElementParts {
		const root = this.tabListEl.createDiv({
			cls: "local-html-browser-tab",
			attr: { draggable: "true", "data-tab-id": tab.id },
		});

		let faviconImg: HTMLImageElement | null = null;
		let iconEl: HTMLElement | null = null;

		if (tab.favicon) {
			faviconImg = root.createEl("img", { cls: "local-html-browser-tab-favicon", attr: { src: tab.favicon } });
		} else {
			iconEl = root.createSpan({ cls: "local-html-browser-tab-icon" });
			setIcon(iconEl, "globe");
		}

		const titleEl = root.createSpan({ cls: "local-html-browser-tab-title", text: getTabDisplayTitle(tab) });

		const closeBtn = root.createEl("button", {
			cls: "local-html-browser-tab-close",
			attr: { title: "Close tab" },
		});
		setIcon(closeBtn, "x");
		closeBtn.addEventListener("click", (event) => {
			event.stopPropagation();
			this.callbacks.onCloseTab(tab.id);
		});

		root.addEventListener("click", (event) => {
			if ((event.target as HTMLElement).closest(".local-html-browser-tab-close")) return;
			this.callbacks.onSelectTab(tab.id);
		});

		root.addEventListener("auxclick", (event) => {
			if (event.button === 1) {
				event.preventDefault();
				this.callbacks.onCloseTab(tab.id);
			}
		});

		root.addEventListener("dblclick", (event) => {
			if ((event.target as HTMLElement).closest(".local-html-browser-tab-close")) return;
			event.preventDefault();
			this.startRename(tab.id);
		});

		root.addEventListener("contextmenu", (event) => {
			event.preventDefault();
			this.showContextMenu(event, tab.id);
		});

		root.addEventListener("dragstart", (event) => {
			this.dragTabId = tab.id;
			root.addClass("is-dragging");
			if (event.dataTransfer) {
				event.dataTransfer.effectAllowed = "move";
				event.dataTransfer.setData("text/plain", tab.id);
			}
		});

		root.addEventListener("dragend", () => {
			root.removeClass("is-dragging");
			this.dragTabId = null;
			this.dropTargetIndex = null;
			this.syncDropIndicators();
		});

		root.addEventListener("dragover", (event) => {
			if (!this.dragTabId || this.dragTabId === tab.id) return;
			event.preventDefault();

			const tabIds = this.lastTabs.map((item) => item.id);
			const targetIndex = tabIds.indexOf(tab.id);
			if (targetIndex === -1) return;

			const rect = root.getBoundingClientRect();
			const before = event.clientX < rect.left + rect.width / 2;
			this.dropTargetIndex = before ? targetIndex : targetIndex + 1;
			this.syncDropIndicators();
		});

		root.addEventListener("drop", (event) => {
			event.preventDefault();
			if (!this.dragTabId || this.dropTargetIndex === null) return;

			const fromIndex = this.lastTabs.findIndex((item) => item.id === this.dragTabId);
			let toIndex = this.dropTargetIndex;
			if (fromIndex < toIndex) toIndex -= 1;

			if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
				this.callbacks.onMoveTab(fromIndex, toIndex);
			}

			this.dragTabId = null;
			this.dropTargetIndex = null;
			this.syncDropIndicators();
		});

		return { root, titleEl, faviconImg, iconEl, closeBtn };
	}

	private updateTabElement(parts: TabElementParts, tab: BrowserTab, isActive: boolean): void {
		parts.root.toggleClass("is-active", isActive);
		parts.root.toggleClass("is-loading", tab.isLoading);
		parts.root.toggleClass("is-custom-title", Boolean(tab.titlePinned && tab.customTitle));
		parts.root.dataset.tabId = tab.id;

		if (this.renamingTabId !== tab.id) {
			parts.titleEl.setText(getTabDisplayTitle(tab));
		}

		if (tab.favicon) {
			if (!parts.faviconImg) {
				parts.iconEl?.remove();
				parts.iconEl = null;
				parts.faviconImg = parts.root.createEl("img", {
					cls: "local-html-browser-tab-favicon",
					attr: { src: tab.favicon },
				});
				parts.root.insertBefore(parts.faviconImg, parts.titleEl);
			} else if (parts.faviconImg.src !== tab.favicon) {
				parts.faviconImg.src = tab.favicon;
			}
		} else if (!parts.iconEl) {
			parts.faviconImg?.remove();
			parts.faviconImg = null;
			parts.iconEl = parts.root.createSpan({ cls: "local-html-browser-tab-icon" });
			setIcon(parts.iconEl, "globe");
			parts.root.insertBefore(parts.iconEl, parts.titleEl);
		}
	}

	private syncDropIndicators(): void {
		const tabIds = this.lastTabs.map((tab) => tab.id);
		for (const [tabId, parts] of this.tabParts) {
			const index = tabIds.indexOf(tabId);
			parts.root.toggleClass("is-drop-target", this.dropTargetIndex === index);
		}
	}

	private showContextMenu(event: MouseEvent, tabId: string): void {
		const menu = new Menu();

		menu.addItem((item) =>
			item
				.setTitle("Rename tab")
				.setIcon("pencil")
				.onClick(() => this.startRename(tabId)),
		);
		menu.addItem((item) =>
			item
				.setTitle("Reset title")
				.setIcon("rotate-ccw")
				.onClick(() => this.callbacks.onResetTabTitle(tabId)),
		);
		menu.addSeparator();
		menu.addItem((item) =>
			item
				.setTitle("Duplicate tab")
				.setIcon("copy")
				.onClick(() => this.callbacks.onDuplicateTab(tabId)),
		);
		menu.addSeparator();
		menu.addItem((item) =>
			item
				.setTitle("Close tab")
				.setIcon("x")
				.onClick(() => this.callbacks.onCloseTab(tabId)),
		);
		menu.addItem((item) =>
			item.setTitle("Close other tabs").onClick(() => this.callbacks.onCloseOtherTabs(tabId)),
		);
		menu.addItem((item) =>
			item
				.setTitle("Close tabs to the right")
				.onClick(() => this.callbacks.onCloseTabsToRight(tabId)),
		);

		menu.showAtMouseEvent(event);
	}
}
