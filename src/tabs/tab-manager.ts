import type { BrowserTab, ClosedTabSnapshot } from "../types";
import { generateId } from "../utils/paths";

/**
 * Manages multiple browser tabs including reopen-closed-tab support.
 */
export class TabManager {
	private tabs: BrowserTab[] = [];
	private activeTabId: string | null = null;
	private closedTabs: ClosedTabSnapshot[] = [];
	private readonly maxClosedTabs = 10;

	onTabsChanged?: (tabs: BrowserTab[], activeId: string | null) => void;

	getTabs(): BrowserTab[] {
		return [...this.tabs];
	}

	getActiveTab(): BrowserTab | null {
		return this.tabs.find((t) => t.id === this.activeTabId) ?? null;
	}

	getActiveTabId(): string | null {
		return this.activeTabId;
	}

	createTab(url = "", title = "New Tab"): BrowserTab {
		const tab: BrowserTab = {
			id: generateId(),
			url,
			title,
			favicon: "",
			isLoading: false,
			canGoBack: false,
			canGoForward: false,
			createdAt: Date.now(),
			lastActiveAt: Date.now(),
		};
		this.tabs.push(tab);
		this.activeTabId = tab.id;
		this.notify();
		return tab;
	}

	closeTab(tabId: string): void {
		const index = this.tabs.findIndex((t) => t.id === tabId);
		if (index === -1) return;

		const [removed] = this.tabs.splice(index, 1);
		this.closedTabs.unshift({ tab: { ...removed }, closedAt: Date.now() });
		if (this.closedTabs.length > this.maxClosedTabs) {
			this.closedTabs.pop();
		}

		if (this.activeTabId === tabId) {
			const next = this.tabs[Math.min(index, this.tabs.length - 1)];
			this.activeTabId = next?.id ?? null;
		}

		this.notify();
	}

	reopenClosedTab(): BrowserTab | null {
		const snapshot = this.closedTabs.shift();
		if (!snapshot) return null;

		const tab = { ...snapshot.tab, id: generateId(), lastActiveAt: Date.now() };
		this.tabs.push(tab);
		this.activeTabId = tab.id;
		this.notify();
		return tab;
	}

	duplicateTab(tabId: string): BrowserTab | null {
		const source = this.tabs.find((t) => t.id === tabId);
		if (!source) return null;
		return this.createTab(source.url, source.title);
	}

	setActiveTab(tabId: string): void {
		if (!this.tabs.some((t) => t.id === tabId)) return;
		this.activeTabId = tabId;
		const tab = this.tabs.find((t) => t.id === tabId);
		if (tab) tab.lastActiveAt = Date.now();
		this.notify();
	}

	updateTab(tabId: string, updates: Partial<BrowserTab>): void {
		const tab = this.tabs.find((t) => t.id === tabId);
		if (!tab) return;
		Object.assign(tab, updates);
		this.notify();
	}

	private notify(): void {
		this.onTabsChanged?.(this.tabs, this.activeTabId);
	}
}
