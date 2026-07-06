import type { Bookmark } from "../types";
import { generateId } from "../utils/paths";

/**
 * Bookmark storage organized by optional folder names.
 */
export class BookmarkManager {
	private bookmarks: Bookmark[] = [];

	getBookmarks(): Bookmark[] {
		return [...this.bookmarks].sort((a, b) => a.title.localeCompare(b.title));
	}

	getFolders(): string[] {
		const folders = new Set(this.bookmarks.map((b) => b.folder || "Bookmarks"));
		return Array.from(folders).sort();
	}

	addBookmark(url: string, title: string, folder = "Bookmarks"): Bookmark {
		const existing = this.bookmarks.find((b) => b.url === url);
		if (existing) {
			existing.title = title;
			existing.folder = folder;
			return existing;
		}

		const bookmark: Bookmark = {
			id: generateId(),
			url,
			title: title || url,
			folder,
			createdAt: Date.now(),
		};
		this.bookmarks.push(bookmark);
		return bookmark;
	}

	removeBookmark(id: string): void {
		this.bookmarks = this.bookmarks.filter((b) => b.id !== id);
	}

	isBookmarked(url: string): boolean {
		return this.bookmarks.some((b) => b.url === url);
	}

	serialize(): Bookmark[] {
		return this.bookmarks;
	}

	deserialize(data: Bookmark[]): void {
		this.bookmarks = Array.isArray(data) ? data : [];
	}
}
