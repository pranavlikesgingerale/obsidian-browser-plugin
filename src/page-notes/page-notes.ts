import { App, TFile, parseYaml } from "obsidian";
import type { PageNoteData } from "../types";
import { pathToFileUrl } from "../utils/paths";
import { getPath } from "../utils/electron";

const PAGE_NOTE_EXTENSION = "webpage";

/** Whether a vault file should open as a live web page tab. */
export function isPageNoteFile(file: TFile): boolean {
	if (file.extension === PAGE_NOTE_EXTENSION) return true;
	if (file.extension === "md" || file.extension === "markdown") return true;
	if (file.extension === "html" || file.extension === "htm") return true;
	return false;
}

/** Parse a .webpage file or markdown frontmatter into url + title. */
export async function parsePageNote(app: App, file: TFile): Promise<PageNoteData | null> {
	if (file.extension === PAGE_NOTE_EXTENSION) {
		const content = await app.vault.read(file);
		return parseWebpageFile(content, file.basename);
	}

	if (file.extension === "md" || file.extension === "markdown") {
		const cache = app.metadataCache.getFileCache(file);
		const fm = cache?.frontmatter;
		if (!fm?.["browser-page"] && !fm?.browser_page) return null;
		const url = fm.url as string | undefined;
		if (!url) return null;
		return {
			url,
			title: (fm.title as string) || file.basename,
		};
	}

	if (file.extension === "html" || file.extension === "htm") {
		const url = vaultFileToUrl(app, file);
		if (!url) return null;
		return { url, title: file.basename };
	}

	return null;
}

/** Read a .webpage file body (YAML or plain url on first line). */
export function parseWebpageFile(content: string, fallbackTitle: string): PageNoteData | null {
	const trimmed = content.trim();
	if (!trimmed) return null;

	if (trimmed.startsWith("---")) {
		const end = trimmed.indexOf("---", 3);
		if (end !== -1) {
			const yaml = trimmed.slice(3, end).trim();
			try {
				const parsed = parseYaml(yaml) as { url?: string; title?: string };
				if (parsed.url) {
					return { url: parsed.url, title: parsed.title || fallbackTitle };
				}
			} catch {
				// fall through
			}
		}
	}

	const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
	if (lines.length === 0) return null;

	return {
		url: lines[0],
		title: lines[1] || fallbackTitle,
	};
}

/** Build content for a new .webpage vault note. */
export function buildWebpageFileContent(url: string, title: string): string {
	return `---\nurl: ${url}\ntitle: ${title}\n---\n`;
}

/** Resolve a vault HTML file to a loadable URL. */
export function vaultFileToUrl(app: App, file: TFile): string | null {
	const adapter = app.vault.adapter as { getFullPath?: (path: string) => string; getResourcePath?: (path: string) => string };

	if (adapter.getFullPath) {
		try {
			const fullPath = adapter.getFullPath(file.path);
			if (fullPath) return pathToFileUrl(fullPath);
		} catch {
			// continue
		}
	}

	if (adapter.getResourcePath) {
		try {
			return adapter.getResourcePath(file.path);
		} catch {
			// continue
		}
	}

	const pathMod = getPath();
	const base = adapter as { basePath?: string };
	if (pathMod && base.basePath) {
		return pathToFileUrl(pathMod.join(base.basePath, file.path));
	}

	return null;
}

export function pageNoteExtension(): string {
	return PAGE_NOTE_EXTENSION;
}
