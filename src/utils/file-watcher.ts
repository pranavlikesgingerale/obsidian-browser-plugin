import { getFs } from "../utils/electron";
import { fileUrlToPath } from "../utils/paths";
import { Logger } from "../utils/logger";

const log = new Logger("file-watcher");

/**
 * Watches local files for changes to support live reload during development.
 * Uses Node.js fs.watch — minimal dependency approach.
 */
export class FileWatcher {
	private watchers: Array<{ close: () => void }> = [];
	private onChangeCallback: (() => void) | null = null;
	private watchedPath: string | null = null;

	/** Start watching a URL/path for changes. */
	watch(urlOrPath: string): void {
		this.stop();

		const fs = getFs();
		if (!fs) {
			log.warn("fs unavailable — file watching disabled.");
			return;
		}

		let filePath = urlOrPath;
		if (urlOrPath.startsWith("file://")) {
			const converted = fileUrlToPath(urlOrPath);
			if (!converted) return;
			filePath = converted;
		}

		if (urlOrPath.startsWith("blob:") || urlOrPath.startsWith("data:")) {
			return;
		}

		try {
			const watcher = fs.watch(filePath, { recursive: true }, (eventType, filename) => {
				log.debug(`File ${eventType}: ${filename ?? filePath}`);
				this.onChangeCallback?.();
			});

			this.watchers.push(watcher);
			this.watchedPath = filePath;
			log.info(`Watching: ${filePath}`);
		} catch (e) {
			// May fail for directories on some platforms without recursive support
			try {
				const watcher = fs.watch(filePath, () => {
					this.onChangeCallback?.();
				});
				this.watchers.push(watcher);
				this.watchedPath = filePath;
			} catch (inner) {
				log.warn(`Could not watch ${filePath}:`, inner);
			}
		}
	}

	onChange(callback: () => void): void {
		this.onChangeCallback = callback;
	}

	stop(): void {
		for (const w of this.watchers) {
			try {
				w.close();
			} catch {
				// ignore
			}
		}
		this.watchers = [];
		this.watchedPath = null;
	}

	getWatchedPath(): string | null {
		return this.watchedPath;
	}
}
