/** Rendering backend used by the browser engine. */
export type BrowserEngineType = "webview" | "iframe-blob" | "iframe-file" | "unavailable";

/** Security and behavior settings persisted by the plugin. */
export interface BrowserPluginSettings {
	/** Default home page URL (file:// or empty). */
	homeUrl: string;
	/** Enable JavaScript execution in the browser. */
	enableJavaScript: boolean;
	/** Allow loading local file:// resources. */
	allowLocalFileAccess: boolean;
	/** Enable Electron webview sandbox (when supported). */
	sandboxMode: boolean;
	/** Use a non-persistent session partition (no saved cookies/storage). */
	incognitoMode: boolean;
	/** Block navigation to external http(s) URLs. */
	blockExternalInternet: boolean;
	/** Allow mixed HTTP content on HTTPS pages. */
	allowMixedContent: boolean;
	/** Automatically refresh when watched files change. */
	autoRefresh: boolean;
	/** Watch file changes for live reload. */
	watchFileChanges: boolean;
	/** Refresh on file save. */
	refreshOnSave: boolean;
	/** Forward webview console output to Obsidian console. */
	forwardConsoleLogs: boolean;
	/** Default download directory (empty = system default). */
	downloadDirectory: string;
	/** Show status bar at bottom of browser view. */
	showStatusBar: boolean;
	/** Confirm before enabling unsafe settings. */
	showSecurityWarnings: boolean;
	/** Open .html files in the vault as a live page tab instead of the editor. */
	openVaultHtmlAsPage: boolean;
	/** Default folder for saved page notes (vault-relative). */
	pageNotesFolder: string;
	/** Restore open tabs when reopening the browser after Obsidian restarts. */
	restoreSessionOnStartup: boolean;
}

export const DEFAULT_SETTINGS: BrowserPluginSettings = {
	homeUrl: "",
	enableJavaScript: true,
	allowLocalFileAccess: true,
	sandboxMode: false,
	incognitoMode: false,
	blockExternalInternet: false,
	allowMixedContent: true,
	autoRefresh: true,
	watchFileChanges: true,
	refreshOnSave: true,
	forwardConsoleLogs: true,
	downloadDirectory: "",
	showStatusBar: true,
	showSecurityWarnings: true,
	openVaultHtmlAsPage: true,
	pageNotesFolder: "Browser Pages",
	restoreSessionOnStartup: true,
};

/** Runtime environment detected at plugin load. */
export interface CompatibilityInfo {
	obsidianVersion: string;
	electronVersion: string;
	chromiumVersion: string;
	nodeVersion: string;
	platform: string;
	webviewAvailable: boolean;
	webviewReason: string;
	engineRecommendation: BrowserEngineType;
	limitations: string[];
}

/** A single browser tab state. */
export interface BrowserTab {
	id: string;
	url: string;
	title: string;
	/** User-defined label shown instead of the page title when set. */
	customTitle?: string;
	/** When true, page title changes do not replace the tab label. */
	titlePinned?: boolean;
	favicon: string;
	isLoading: boolean;
	canGoBack: boolean;
	canGoForward: boolean;
	createdAt: number;
	lastActiveAt: number;
}

/** Label shown on a tab strip item. */
export function getTabDisplayTitle(tab: Pick<BrowserTab, "customTitle" | "title">): string {
	const custom = tab.customTitle?.trim();
	if (custom) return custom;
	const title = tab.title?.trim();
	return title || "New Tab";
}

/** History entry for navigation. */
export interface HistoryEntry {
	id: string;
	url: string;
	title: string;
	visitedAt: number;
}

/** Bookmark entry. */
export interface Bookmark {
	id: string;
	url: string;
	title: string;
	folder: string;
	createdAt: number;
}

/** Closed tab for reopen support. */
export interface ClosedTabSnapshot {
	tab: BrowserTab;
	closedAt: number;
}

/** Download item tracked by the download manager. */
export interface DownloadItem {
	id: string;
	url: string;
	filename: string;
	path: string;
	state: "progressing" | "completed" | "cancelled" | "interrupted";
	receivedBytes: number;
	totalBytes: number;
	startedAt: number;
}

/** Console message forwarded from webview. */
export interface ConsoleMessage {
	level: "log" | "warn" | "error" | "info" | "debug";
	message: string;
	source: string;
	line: number;
	timestamp: number;
}

/** Events emitted by the browser engine. */
export interface BrowserEngineEvents {
	onLoadStart: () => void;
	onLoadStop: () => void;
	onNavigate: (url: string) => void;
	onTitleChange: (title: string) => void;
	onFaviconChange: (favicon: string) => void;
	onLoadingStateChange: (isLoading: boolean) => void;
	onCanNavigateChange: (canGoBack: boolean, canGoForward: boolean) => void;
	onConsoleMessage: (msg: ConsoleMessage) => void;
	onNewWindow: (url: string) => void;
	onError: (message: string) => void;
}

/** Supported file extensions for opening. */
export const SUPPORTED_EXTENSIONS = [
	".html",
	".htm",
	".svg",
	".xml",
	".txt",
	".md",
	".markdown",
] as const;

export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

/** View type constant for the browser ItemView. */
export const BROWSER_VIEW_TYPE = "local-html-browser-view";

/** View type for a single webpage opened as its own tab/note. */
export const WEB_PAGE_VIEW_TYPE = "local-html-browser-web-page";

/** State persisted for a web page tab. */
export interface WebPageState {
	url: string;
	title: string;
	sourcePath?: string;
}

/** Parsed content of a .webpage vault note. */
export interface PageNoteData {
	url: string;
	title: string;
}

/** A standalone page tab saved for restore. */
export interface PersistedWebPage {
	url: string;
	title: string;
	sourcePath?: string;
}

/** Tab data saved for session restore. */
export interface PersistedTab {
	url: string;
	title: string;
	favicon?: string;
	customTitle?: string;
	titlePinned?: boolean;
}

/** Workspace / plugin session snapshot for the browser view. */
export interface BrowserSessionSnapshot {
	tabs: PersistedTab[];
	activeTabIndex: number;
	savedAt?: number;
}

/** State persisted on the browser workspace leaf. */
export interface BrowserViewState {
	tabs: PersistedTab[];
	activeTabIndex: number;
}

/** Parse browser view workspace state. */
export function parseBrowserViewState(state: unknown): BrowserViewState | null {
	if (!state || typeof state !== "object") return null;
	const record = state as Record<string, unknown>;
	if (!Array.isArray(record.tabs) || record.tabs.length === 0) return null;

	const tabs: PersistedTab[] = [];
	for (const item of record.tabs) {
		if (!item || typeof item !== "object") continue;
		const tab = item as Record<string, unknown>;
		if (typeof tab.url !== "string" || !tab.url) continue;
		tabs.push({
			url: tab.url,
			title: typeof tab.title === "string" ? tab.title : tab.url,
			favicon: typeof tab.favicon === "string" ? tab.favicon : undefined,
			customTitle: typeof tab.customTitle === "string" ? tab.customTitle : undefined,
			titlePinned: tab.titlePinned === true,
		});
	}
	if (tabs.length === 0) return null;

	const activeTabIndex =
		typeof record.activeTabIndex === "number" && record.activeTabIndex >= 0
			? Math.min(record.activeTabIndex, tabs.length - 1)
			: 0;

	return { tabs, activeTabIndex };
}

/** Parse plugin-level session snapshot. */
export function parseBrowserSession(value: unknown): BrowserSessionSnapshot | null {
	return parseBrowserViewState(value);
}

/** Parse persisted or in-flight web page view state. */
export function parseWebPageState(state: unknown): WebPageState | null {
	if (!state || typeof state !== "object") return null;
	const record = state as Record<string, unknown>;
	if (typeof record.url !== "string" || !record.url) return null;
	return {
		url: record.url,
		title: typeof record.title === "string" ? record.title : "",
		sourcePath: typeof record.sourcePath === "string" ? record.sourcePath : undefined,
	};
}
