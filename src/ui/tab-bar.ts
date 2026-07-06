import { setIcon } from "obsidian";
import type { BrowserTab } from "../types";

export interface TabBarCallbacks {
	onSelectTab: (tabId: string) => void;
	onCloseTab: (tabId: string) => void;
	onDuplicateTab: (tabId: string) => void;
	onNewTab: () => void;
}

/** Horizontal tab bar with close and duplicate actions. */
export class TabBar {
	readonly el: HTMLElement;
	private tabListEl: HTMLElement;

	constructor(private callbacks: TabBarCallbacks) {
		this.el = document.createElement("div");
		this.el.className = "obsidian-browser-tab-bar";

		this.tabListEl = this.el.createDiv({ cls: "obsidian-browser-tab-list" });

		const newTabBtn = this.el.createEl("button", {
			cls: "obsidian-browser-tab-new",
			attr: { title: "New Tab" },
		});
		setIcon(newTabBtn, "plus");
		newTabBtn.addEventListener("click", () => callbacks.onNewTab());
	}

	render(tabs: BrowserTab[], activeId: string | null): void {
		this.tabListEl.empty();

		for (const tab of tabs) {
			const tabEl = this.tabListEl.createDiv({
				cls: `obsidian-browser-tab${tab.id === activeId ? " is-active" : ""}${tab.isLoading ? " is-loading" : ""}`,
			});

			if (tab.favicon) {
				tabEl.createEl("img", { cls: "obsidian-browser-tab-favicon", attr: { src: tab.favicon } });
			} else {
				const iconEl = tabEl.createSpan({ cls: "obsidian-browser-tab-icon" });
				setIcon(iconEl, "globe");
			}

			tabEl.createSpan({ cls: "obsidian-browser-tab-title", text: tab.title || "New Tab" });

			const closeBtn = tabEl.createEl("button", {
				cls: "obsidian-browser-tab-close",
				attr: { title: "Close Tab" },
			});
			setIcon(closeBtn, "x");
			closeBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				this.callbacks.onCloseTab(tab.id);
			});

			tabEl.addEventListener("click", () => this.callbacks.onSelectTab(tab.id));
			tabEl.addEventListener("contextmenu", (e) => {
				e.preventDefault();
				this.callbacks.onDuplicateTab(tab.id);
			});
		}
	}
}
