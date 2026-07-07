import type { HistoryEntry } from "../types";
import { isPersistableBrowserUrl } from "../utils/browser-url";
import { generateId } from "../utils/paths";

const MAX_HISTORY = 500;

/**
 * Navigation history storage with deduplication of consecutive identical URLs.
 */
export class HistoryManager {
	private entries: HistoryEntry[] = [];

	getEntries(): HistoryEntry[] {
		return [...this.entries].sort((a, b) => b.visitedAt - a.visitedAt);
	}

	addEntry(url: string, title: string): void {
		if (!isPersistableBrowserUrl(url)) return;

		const last = this.entries[this.entries.length - 1];
		if (last && last.url === url) {
			last.title = title || last.title;
			last.visitedAt = Date.now();
			return;
		}

		this.entries.push({
			id: generateId(),
			url,
			title: title || url,
			visitedAt: Date.now(),
		});

		if (this.entries.length > MAX_HISTORY) {
			this.entries = this.entries.slice(-MAX_HISTORY);
		}
	}

	removeEntry(id: string): boolean {
		const index = this.entries.findIndex((entry) => entry.id === id);
		if (index === -1) return false;
		this.entries.splice(index, 1);
		return true;
	}

	clear(): void {
		this.entries = [];
	}

	search(query: string): HistoryEntry[] {
		const q = query.toLowerCase();
		return this.getEntries().filter(
			(e) => e.url.toLowerCase().includes(q) || e.title.toLowerCase().includes(q),
		);
	}

	serialize(): HistoryEntry[] {
		return this.entries;
	}

	deserialize(data: HistoryEntry[]): void {
		this.entries = Array.isArray(data) ? data : [];
	}
}
