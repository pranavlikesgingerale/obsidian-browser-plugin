import { setIcon } from "obsidian";
import type { HistoryEntry } from "../types";

export interface HistoryPanelCallbacks {
	onOpenEntry: (url: string) => void;
	onDeleteEntry: (id: string) => void;
	onClearAll: () => void;
}

/** Slide-down panel listing navigation history. */
export class HistoryPanel {
	readonly el: HTMLElement;
	private listEl: HTMLElement;
	private searchInput: HTMLInputElement;
	private visible = false;
	private query = "";

	constructor(
		parent: HTMLElement,
		private getEntries: () => HistoryEntry[],
		private callbacks: HistoryPanelCallbacks,
	) {
		this.el = parent.createDiv({ cls: "local-html-browser-history-panel" });

		const header = this.el.createDiv({ cls: "local-html-browser-history-header" });
		header.createSpan({ cls: "local-html-browser-history-title", text: "History" });

		const actions = header.createDiv({ cls: "local-html-browser-history-actions" });

		const clearBtn = actions.createEl("button", {
			cls: "local-html-browser-btn local-html-browser-history-clear",
			attr: { title: "Clear all history" },
		});
		setIcon(clearBtn, "trash-2");
		clearBtn.addEventListener("click", () => this.callbacks.onClearAll());

		const closeBtn = actions.createEl("button", {
			cls: "local-html-browser-btn",
			attr: { title: "Close history" },
		});
		setIcon(closeBtn, "x");
		closeBtn.addEventListener("click", () => this.hide());

		this.searchInput = this.el.createEl("input", {
			type: "search",
			cls: "local-html-browser-history-search",
			attr: { placeholder: "Search history..." },
		});
		this.searchInput.addEventListener("input", () => {
			this.query = this.searchInput.value.trim();
			this.render();
		});

		this.listEl = this.el.createDiv({ cls: "local-html-browser-history-list" });
	}

	isVisible(): boolean {
		return this.visible;
	}

	toggle(): void {
		if (this.visible) this.hide();
		else this.show();
	}

	show(): void {
		this.visible = true;
		this.el.addClass("is-visible");
		this.render();
	}

	hide(): void {
		this.visible = false;
		this.el.removeClass("is-visible");
	}

	render(): void {
		this.listEl.empty();
		const entries = this.query
			? this.getEntries().filter(
					(e) =>
						e.title.toLowerCase().includes(this.query.toLowerCase()) ||
						e.url.toLowerCase().includes(this.query.toLowerCase()),
				)
			: this.getEntries();

		if (entries.length === 0) {
			this.listEl.createDiv({
				cls: "local-html-browser-history-empty",
				text: this.query ? "No matching history entries." : "No history yet.",
			});
			return;
		}

		for (const entry of entries) {
			const row = this.listEl.createDiv({ cls: "local-html-browser-history-item" });

			const main = row.createDiv({ cls: "local-html-browser-history-item-main" });
			main.createDiv({ cls: "local-html-browser-history-item-title", text: entry.title || entry.url });
			main.createDiv({ cls: "local-html-browser-history-item-url", text: entry.url });
			main.createDiv({
				cls: "local-html-browser-history-item-time",
				text: formatHistoryTime(entry.visitedAt),
			});

			main.addEventListener("click", () => {
				this.callbacks.onOpenEntry(entry.url);
				this.hide();
			});

			const deleteBtn = row.createEl("button", {
				cls: "local-html-browser-btn local-html-browser-history-delete",
				attr: { title: "Remove from history" },
			});
			setIcon(deleteBtn, "x");
			deleteBtn.addEventListener("click", (event) => {
				event.stopPropagation();
				this.callbacks.onDeleteEntry(entry.id);
				this.render();
			});
		}
	}
}

function formatHistoryTime(timestamp: number): string {
	const date = new Date(timestamp);
	const now = new Date();
	if (date.toDateString() === now.toDateString()) {
		return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
	}
	return date.toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}
