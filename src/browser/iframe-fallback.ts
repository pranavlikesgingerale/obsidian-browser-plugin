import type { BrowserEngineEvents, BrowserPluginSettings } from "../types";
import { createBlobUrl, resolveLocalPath } from "../utils/file-protocol";
import { normalizeInputToUrl } from "../utils/paths";
import { Logger } from "../utils/logger";

const log = new Logger("iframe-fallback");

/**
 * Iframe-based fallback engine when <webview> is unavailable.
 *
 * Limitations (Electron/Obsidian):
 * - Cannot load arbitrary file:// URLs with full relative path resolution
 * - Uses blob URLs for processed content; base href helps but not identical to Chrome
 * - localStorage/sessionStorage are per-origin blob, not persistent across sessions
 * - DevTools cannot attach to iframe internals from outside
 */
export class IframeFallbackEngine {
	private iframe: HTMLIFrameElement | null = null;
	private container: HTMLElement | null = null;
	private currentBlobUrl: string | null = null;
	private currentLogicalUrl = "";
	private historyStack: string[] = [];
	private historyIndex = -1;

	constructor(
		private settings: BrowserPluginSettings,
		private events: BrowserEngineEvents,
	) {}

	mount(container: HTMLElement): boolean {
		try {
			this.container = container;
			const iframe = document.createElement("iframe");
			iframe.className = "obsidian-browser-iframe";
			iframe.style.width = "100%";
			iframe.style.height = "100%";
			iframe.style.border = "none";
			iframe.style.flex = "1";

			const sandbox = ["allow-scripts", "allow-same-origin", "allow-forms", "allow-popups", "allow-downloads"];
			if (!this.settings.sandboxMode) {
				sandbox.push("allow-modals");
			}
			iframe.setAttribute("sandbox", sandbox.join(" "));

			iframe.addEventListener("load", () => {
				this.events.onLoadStop();
				this.events.onLoadingStateChange(false);
				this.updateTitleFromIframe();
				this.events.onCanNavigateChange(this.canGoBack(), this.canGoForward());
			});

			iframe.addEventListener("error", () => {
				this.events.onError("Iframe failed to load. file:// may be blocked in this context.");
				this.events.onLoadingStateChange(false);
			});

			container.appendChild(iframe);
			this.iframe = iframe;
			log.warn("Using iframe fallback — see README for limitations.");
			return true;
		} catch (e) {
			this.events.onError(`Iframe mount failed: ${e instanceof Error ? e.message : String(e)}`);
			return false;
		}
	}

	loadUrl(url: string): void {
		if (!this.iframe) return;

		if (this.settings.blockExternalInternet && /^https?:\/\//i.test(url)) {
			this.events.onError("External internet access is blocked by settings.");
			return;
		}

		this.events.onLoadStart();
		this.events.onLoadingStateChange(true);

		const normalized = normalizeInputToUrl(url);

		// For http(s), load directly
		if (/^https?:\/\//i.test(normalized)) {
			this.loadDirect(normalized);
			return;
		}

		// Try loading file:// directly first — needed for SPAs with bundled assets
		if (/^file:\/\//i.test(normalized)) {
			this.loadDirect(normalized);
			return;
		}

		// For file paths, read and inject via blob
		const filePath = normalized.startsWith("file://")
			? decodeURIComponent(normalized.replace(/^file:\/\//, "").replace(/^\/([A-Z]:)/, "$1"))
			: url;

		const resolved = resolveLocalPath(filePath);
		if (resolved.type === "error") {
			this.events.onError(resolved.error ?? "Unknown error");
			this.events.onLoadingStateChange(false);
			return;
		}

		this.revokeBlob();
		const content = resolved.content ?? "";
		this.currentBlobUrl = createBlobUrl(content, resolved.mimeType ?? "text/html");
		this.currentLogicalUrl = resolved.url ?? normalized;

		this.iframe.src = this.currentBlobUrl;
		this.pushHistory(this.currentLogicalUrl);
		this.events.onNavigate(this.currentLogicalUrl);
	}

	private loadDirect(url: string): void {
		if (!this.iframe) return;
		this.revokeBlob();
		this.iframe.src = url;
		this.currentLogicalUrl = url;
		this.pushHistory(url);
		this.events.onNavigate(url);
	}

	goBack(): void {
		if (!this.canGoBack()) return;
		this.historyIndex--;
		this.navigateToHistoryIndex();
	}

	goForward(): void {
		if (!this.canGoForward()) return;
		this.historyIndex++;
		this.navigateToHistoryIndex();
	}

	reload(): void {
		if (this.currentLogicalUrl) this.loadUrl(this.currentLogicalUrl);
	}

	hardReload(): void {
		this.reload();
	}

	stop(): void {
		if (this.iframe) this.iframe.src = "about:blank";
		this.events.onLoadingStateChange(false);
	}

	getUrl(): string {
		return this.currentLogicalUrl;
	}

	getTitle(): string {
		try {
			return this.iframe?.contentDocument?.title ?? "";
		} catch {
			return "";
		}
	}

	canGoBack(): boolean {
		return this.historyIndex > 0;
	}

	canGoForward(): boolean {
		return this.historyIndex < this.historyStack.length - 1;
	}

	openDevTools(): void {
		this.events.onError(
			"DevTools cannot attach to iframe content in fallback mode. " +
				"Use webview engine when available, or open the file directly in Chrome/Edge.",
		);
	}

	closeDevTools(): void {
		// no-op
	}

	isDevToolsOpened(): boolean {
		return false;
	}

	toggleDevTools(): void {
		this.openDevTools();
	}

	updateSettings(settings: BrowserPluginSettings): void {
		this.settings = settings;
	}

	getEngineType(): "iframe-blob" {
		return "iframe-blob";
	}

	destroy(): void {
		this.revokeBlob();
		this.iframe?.remove();
		this.iframe = null;
		this.container = null;
	}

	private pushHistory(url: string): void {
		if (this.historyIndex < this.historyStack.length - 1) {
			this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
		}
		this.historyStack.push(url);
		this.historyIndex = this.historyStack.length - 1;
	}

	private navigateToHistoryIndex(): void {
		const url = this.historyStack[this.historyIndex];
		if (url) this.loadUrl(url);
	}

	private revokeBlob(): void {
		if (this.currentBlobUrl) {
			URL.revokeObjectURL(this.currentBlobUrl);
			this.currentBlobUrl = null;
		}
	}

	private updateTitleFromIframe(): void {
		try {
			const title = this.iframe?.contentDocument?.title;
			if (title) this.events.onTitleChange(title);
		} catch {
			// cross-origin
		}
	}
}
