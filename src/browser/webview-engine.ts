import type { BrowserEngineEvents, BrowserPluginSettings } from "../types";
import { buildWebPreferences } from "./compatibility";
import { Logger } from "../utils/logger";
import { getActiveDocument } from "../utils/dom";

const log = new Logger("webview");

/** Electron webview element with typed methods. */
export interface WebviewElement extends HTMLElement {
	src: string;
	canGoBack(): boolean;
	canGoForward(): boolean;
	goBack(): void;
	goForward(): void;
	reload(): void;
	reloadIgnoringCache(): void;
	stop(): void;
	getTitle(): string;
	getURL(): string;
	openDevTools(): void;
	closeDevTools(): void;
	isDevToolsOpened(): boolean;
	executeJavaScript(code: string): Promise<unknown>;
	insertCSS(css: string): void;
	setUserAgent(userAgent: string): void;
}

/**
 * Chromium webview-based browser engine.
 */
export class WebviewEngine {
	private webview: WebviewElement | null = null;
	private container: HTMLElement | null = null;
	private partition: string;
	private resizeObserver: ResizeObserver | null = null;
	private boundHandlers: Array<{ event: string; handler: EventListener }> = [];
	private hasStartedLoad = false;
	onStuck?: () => void;

	constructor(
		private settings: BrowserPluginSettings,
		private events: BrowserEngineEvents,
	) {
		this.partition = settings.incognitoMode
			? `persist:local-html-browser-incognito-${Date.now()}`
			: "persist:local-html-browser";
	}

	mount(container: HTMLElement): boolean {
		try {
			this.container = container;
			container.addClass("local-html-browser-engine-container");

			const doc = getActiveDocument();
			const webview = doc.createElement("webview") as WebviewElement;
			webview.className = "local-html-browser-webview";
			webview.setAttribute("allowpopups", "");
			webview.setAttribute("partition", this.partition);
			webview.setAttribute("webpreferences", buildWebPreferences(this.settings, false));

			this.attachEventListeners(webview);
			container.appendChild(webview);
			this.webview = webview;

			this.resizeObserver = new ResizeObserver(() => this.syncWebviewSize());
			this.resizeObserver.observe(container);

			window.requestAnimationFrame(() => this.syncWebviewSize());

			log.info("Webview mounted.");
			return true;
		} catch (e) {
			log.error("Failed to mount webview", e);
			this.events.onError(`Webview mount failed: ${e instanceof Error ? e.message : String(e)}`);
			return false;
		}
	}

	loadUrl(url: string): void {
		if (!this.webview) return;

		if (this.settings.blockExternalInternet && /^https?:\/\//i.test(url)) {
			this.events.onError("External internet access is blocked by settings.");
			return;
		}

		this.hasStartedLoad = false;
		this.webview.src = url;
		this.syncWebviewSize();

		// If webview never fires load events, signal parent to try iframe
		window.setTimeout(() => {
			if (!this.hasStartedLoad) {
				log.warn("Webview did not start loading:", url);
				this.onStuck?.();
			}
		}, 2500);
	}

	private syncWebviewSize(): void {
		if (!this.webview || !this.container) return;
		const height = this.container.clientHeight;
		if (height > 0) {
			this.webview.setCssProps({ height: `${height}px` });
		}
	}

	goBack(): void {
		if (this.webview?.canGoBack()) this.webview.goBack();
	}

	goForward(): void {
		if (this.webview?.canGoForward()) this.webview.goForward();
	}

	reload(): void {
		this.webview?.reload();
	}

	hardReload(): void {
		this.webview?.reloadIgnoringCache();
	}

	stop(): void {
		this.webview?.stop();
	}

	getUrl(): string {
		try {
			return this.webview?.getURL() ?? "";
		} catch {
			return "";
		}
	}

	getTitle(): string {
		try {
			return this.webview?.getTitle() ?? "";
		} catch {
			return "";
		}
	}

	canGoBack(): boolean {
		try {
			return this.webview?.canGoBack() ?? false;
		} catch {
			return false;
		}
	}

	canGoForward(): boolean {
		try {
			return this.webview?.canGoForward() ?? false;
		} catch {
			return false;
		}
	}

	openDevTools(): void {
		try {
			this.webview?.openDevTools();
		} catch (e) {
			this.events.onError(`DevTools unavailable: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	closeDevTools(): void {
		this.webview?.closeDevTools();
	}

	isDevToolsOpened(): boolean {
		return this.webview?.isDevToolsOpened() ?? false;
	}

	toggleDevTools(): void {
		if (this.isDevToolsOpened()) this.closeDevTools();
		else this.openDevTools();
	}

	updateSettings(settings: BrowserPluginSettings): void {
		this.settings = settings;
		if (this.webview) {
			this.webview.setAttribute("webpreferences", buildWebPreferences(settings, false));
		}
	}

	getEngineType(): "webview" {
		return "webview";
	}

	destroy(): void {
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		if (this.webview) {
			for (const { event, handler } of this.boundHandlers) {
				this.webview.removeEventListener(event, handler);
			}
			this.webview.remove();
			this.webview = null;
		}
		this.container = null;
	}

	private attachEventListeners(webview: WebviewElement): void {
		const add = (event: string, handler: (e: Event) => void) => {
			webview.addEventListener(event, handler);
			this.boundHandlers.push({ event, handler });
		};

		add("did-attach", () => {
			this.syncWebviewSize();
		});

		add("dom-ready", () => {
			this.syncWebviewSize();
		});

		add("did-start-loading", () => {
			this.hasStartedLoad = true;
			this.events.onLoadStart();
			this.events.onLoadingStateChange(true);
		});

		add("did-stop-loading", () => {
			this.hasStartedLoad = true;
			this.events.onLoadStop();
			this.events.onLoadingStateChange(false);
			this.syncWebviewSize();
			this.emitNavigationState();
		});

		add("did-navigate", (e: Event) => {
			const url = getWebviewEventString(e, "url") ?? webview.getURL();
			this.events.onNavigate(url);
			this.emitNavigationState();
		});

		add("did-navigate-in-page", (e: Event) => {
			const url = getWebviewEventString(e, "url") ?? webview.getURL();
			this.events.onNavigate(url);
			this.emitNavigationState();
		});

		add("page-title-updated", (e: Event) => {
			const title = getWebviewEventString(e, "title") ?? webview.getTitle();
			this.events.onTitleChange(title);
		});

		add("page-favicon-updated", (e: Event) => {
			const favicons = getWebviewEventStringArray(e, "favicons");
			if (favicons.length > 0) {
				this.events.onFaviconChange(favicons[0]);
			}
		});

		add("new-window", (e: Event) => {
			e.preventDefault();
			const url = getWebviewEventString(e, "url");
			if (url) this.events.onNewWindow(url);
		});

		add("console-message", (e: Event) => {
			const level = getWebviewEventNumber(e, "level") ?? 0;
			const levelMap: Record<number, "log" | "warn" | "error" | "info" | "debug"> = {
				0: "debug",
				1: "info",
				2: "warn",
				3: "error",
			};
			this.events.onConsoleMessage({
				level: levelMap[level] ?? "log",
				message: getWebviewEventString(e, "message") ?? "",
				source: getWebviewEventString(e, "sourceId") ?? "",
				line: getWebviewEventNumber(e, "line") ?? 0,
				timestamp: Date.now(),
			});
		});

		add("did-fail-load", (e: Event) => {
			const errorCode = getWebviewEventNumber(e, "errorCode");
			if (errorCode === -3) return;
			const validatedURL = getWebviewEventString(e, "validatedURL") ?? "page";
			const errorDescription = getWebviewEventString(e, "errorDescription") ?? "unknown error";
			this.events.onError(`Failed to load ${validatedURL}: ${errorDescription}`);
		});
	}

	private emitNavigationState(): void {
		this.events.onCanNavigateChange(this.canGoBack(), this.canGoForward());
	}
}

function getWebviewEventValue(event: Event, key: string): unknown {
	if (key in event) {
		return (event as unknown as Record<string, unknown>)[key];
	}
	return undefined;
}

function getWebviewEventString(event: Event, key: string): string | undefined {
	const value = getWebviewEventValue(event, key);
	return typeof value === "string" ? value : undefined;
}

function getWebviewEventNumber(event: Event, key: string): number | undefined {
	const value = getWebviewEventValue(event, key);
	return typeof value === "number" ? value : undefined;
}

function getWebviewEventStringArray(event: Event, key: string): string[] {
	const value = getWebviewEventValue(event, key);
	if (!Array.isArray(value)) return [];
	return value.filter((item): item is string => typeof item === "string");
}
