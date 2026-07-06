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
	favicon: string;
	isLoading: boolean;
	canGoBack: boolean;
	canGoForward: boolean;
	createdAt: number;
	lastActiveAt: number;
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
