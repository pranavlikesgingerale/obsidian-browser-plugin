import type { BrowserEngineEvents, BrowserEngineType, BrowserPluginSettings } from "../types";
import { detectCompatibility } from "./compatibility";
import { IframeFallbackEngine } from "./iframe-fallback";
import { WebviewEngine } from "./webview-engine";
import { Logger } from "../utils/logger";
import { resolveLocalPath } from "../utils/file-protocol";
import { normalizeInputToUrl } from "../utils/paths";

const log = new Logger("browser-manager");

export interface BrowserEngine {
	mount(container: HTMLElement): boolean;
	loadUrl(url: string): void;
	goBack(): void;
	goForward(): void;
	reload(): void;
	hardReload(): void;
	stop(): void;
	getUrl(): string;
	getTitle(): string;
	canGoBack(): boolean;
	canGoForward(): boolean;
	openDevTools(): void;
	closeDevTools(): void;
	isDevToolsOpened(): boolean;
	toggleDevTools(): void;
	updateSettings(settings: BrowserPluginSettings): void;
	destroy(): void;
	getEngineType(): BrowserEngineType;
	syncLayout?(): void;
}

export interface BrowserManagerOptions {
	/** When false, never fall back to iframe (needed for local SPAs in page tabs). */
	allowIframeFallback?: boolean;
}

export class BrowserManager {
	private engine: BrowserEngine | null = null;
	private engineType: BrowserEngineType = "unavailable";
	private container: HTMLElement | null = null;
	private lastUrl = "";
	private triedIframeFallback = false;

	constructor(
		private settings: BrowserPluginSettings,
		private events: BrowserEngineEvents,
		private options: BrowserManagerOptions = {},
	) {}

	initialize(container: HTMLElement): BrowserEngineType {
		this.container = container;
		const compat = detectCompatibility();

		if (compat.engineRecommendation === "webview") {
			const webview = new WebviewEngine(this.settings, this.events);
			if (this.options.allowIframeFallback !== false) {
				webview.onStuck = () => this.fallbackToIframe(this.lastUrl);
			}
			if (webview.mount(container)) {
				this.engine = webview;
				this.engineType = "webview";
				return "webview";
			}
		}

		return this.mountIframe(container);
	}

	loadUrl(input: string): void {
		if (!this.engine) {
			this.events.onError("Browser engine not initialized.");
			return;
		}

		const url = normalizeInputToUrl(input);
		if (!url) return;

		this.lastUrl = url;

		if (this.engineType === "webview" && !/^https?:\/\//i.test(url)) {
			const urlWithoutHash = url.split("#")[0];
			const filePath = urlWithoutHash.startsWith("file://")
				? decodeURIComponent(
						urlWithoutHash.replace(/^file:\/\//, "").replace(/^\/([A-Za-z]:)/, "$1"),
					)
				: input.split("#")[0];

			const resolved = resolveLocalPath(filePath);
			if (resolved.type === "file") {
				const ext = filePath.toLowerCase();
				if (ext.endsWith(".md") || ext.endsWith(".markdown")) {
					const blob = new Blob([resolved.content ?? ""], { type: "text/html" });
					const reader = new FileReader();
					reader.onload = () => {
						if (typeof reader.result === "string") {
							this.engine?.loadUrl(reader.result);
						}
					};
					reader.readAsDataURL(blob);
					return;
				}
			}
		}

		this.engine.loadUrl(url);
	}

	private fallbackToIframe(url: string): void {
		if (this.triedIframeFallback || !this.container) return;
		this.triedIframeFallback = true;

		log.warn("Webview stuck — falling back to iframe.");
		this.events.onError(
			"Webview did not respond. Switching to iframe mode. SPAs may not work fully.",
		);

		this.engine?.destroy();
		this.mountIframe(this.container);
		if (url) this.engine?.loadUrl(url);
	}

	private mountIframe(container: HTMLElement): BrowserEngineType {
		const iframe = new IframeFallbackEngine(this.settings, this.events);
		if (iframe.mount(container)) {
			this.engine = iframe;
			this.engineType = "iframe-blob";
			return "iframe-blob";
		}

		this.engineType = "unavailable";
		this.events.onError("No browser engine available.");
		return "unavailable";
	}

	goBack(): void {
		this.engine?.goBack();
	}

	goForward(): void {
		this.engine?.goForward();
	}

	reload(): void {
		this.engine?.reload();
	}

	hardReload(): void {
		this.engine?.hardReload();
	}

	stop(): void {
		this.engine?.stop();
	}

	getUrl(): string {
		return this.engine?.getUrl() ?? "";
	}

	getTitle(): string {
		return this.engine?.getTitle() ?? "";
	}

	canGoBack(): boolean {
		return this.engine?.canGoBack() ?? false;
	}

	canGoForward(): boolean {
		return this.engine?.canGoForward() ?? false;
	}

	openDevTools(): void {
		this.engine?.openDevTools();
	}

	toggleDevTools(): void {
		this.engine?.toggleDevTools();
	}

	updateSettings(settings: BrowserPluginSettings): void {
		this.settings = settings;
		this.engine?.updateSettings(settings);
	}

	destroy(): void {
		this.engine?.destroy();
		this.engine = null;
		this.container = null;
	}

	getEngineType(): BrowserEngineType {
		return this.engineType;
	}

	syncLayout(): void {
		this.engine?.syncLayout?.();
	}
}
