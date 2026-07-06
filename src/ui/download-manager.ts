import type { DownloadItem } from "../types";
import { generateId } from "../utils/paths";
import { getPath } from "../utils/electron";

/**
 * Simple download manager tracking browser download events.
 * In webview mode, hooks into will-download via webContents when available.
 */
export class DownloadManager {
	private downloads: DownloadItem[] = [];

	onDownloadsChanged?: (downloads: DownloadItem[]) => void;

	getDownloads(): DownloadItem[] {
		return [...this.downloads];
	}

	/** Register a new download (called from webview download events). */
	addDownload(url: string, filename: string, savePath: string): DownloadItem {
		const item: DownloadItem = {
			id: generateId(),
			url,
			filename,
			path: savePath,
			state: "progressing",
			receivedBytes: 0,
			totalBytes: 0,
			startedAt: Date.now(),
		};
		this.downloads.unshift(item);
		this.notify();
		return item;
	}

	updateProgress(id: string, received: number, total: number): void {
		const item = this.downloads.find((d) => d.id === id);
		if (item) {
			item.receivedBytes = received;
			item.totalBytes = total;
			this.notify();
		}
	}

	completeDownload(id: string): void {
		const item = this.downloads.find((d) => d.id === id);
		if (item) {
			item.state = "completed";
			this.notify();
		}
	}

	cancelDownload(id: string): void {
		const item = this.downloads.find((d) => d.id === id);
		if (item) {
			item.state = "cancelled";
			this.notify();
		}
	}

	clearCompleted(): void {
		this.downloads = this.downloads.filter((d) => d.state === "progressing");
		this.notify();
	}

	/** Suggest download path based on settings. */
	suggestSavePath(filename: string, downloadDir: string): string {
		const pathMod = getPath();
		if (!pathMod) return filename;
		if (downloadDir) {
			return pathMod.join(downloadDir, filename);
		}
		return filename;
	}

	private notify(): void {
		this.onDownloadsChanged?.(this.downloads);
	}
}

/** Show native open file dialog via Electron remote or HTML fallback. */
export async function openFileDialog(extensions?: string[]): Promise<string | null> {
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const win = window as any;
		const electron = win.require?.("electron");
		const dialog = electron?.remote?.dialog ?? electron?.dialog;

		if (dialog?.showOpenDialog) {
			const result = await dialog.showOpenDialog({
				properties: ["openFile"],
				filters: [
					{
						name: "Web Files",
						extensions: extensions ?? ["html", "htm", "svg", "xml", "txt", "md"],
					},
					{ name: "All Files", extensions: ["*"] },
				],
			});
			if (!result.canceled && result.filePaths.length > 0) {
				return result.filePaths[0];
			}
		}
	} catch {
		// fall through to HTML input
	}

	return new Promise((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".html,.htm,.svg,.xml,.txt,.md,.markdown";
		input.onchange = () => {
			const file = input.files?.[0];
			if (file) {
				// HTML file input gives fake path on web; use name only
				resolve((file as File & { path?: string }).path ?? file.name);
			} else {
				resolve(null);
			}
		};
		input.click();
	});
}

/** Show native open folder dialog. */
export async function openFolderDialog(): Promise<string | null> {
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const win = window as any;
		const electron = win.require?.("electron");
		const dialog = electron?.remote?.dialog ?? electron?.dialog;

		if (dialog?.showOpenDialog) {
			const result = await dialog.showOpenDialog({
				properties: ["openDirectory"],
			});
			if (!result.canceled && result.filePaths.length > 0) {
				return result.filePaths[0];
			}
		}
	} catch {
		// unavailable
	}
	return null;
}
