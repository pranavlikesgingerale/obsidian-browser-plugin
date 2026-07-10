import type { BrowserPluginSettings, Bookmark, BrowserSessionSnapshot, HistoryEntry, PersistedWebPage } from "../types";
import { parseBrowserSession } from "../types";

export interface PluginData {
	settings?: Partial<BrowserPluginSettings>;
	history?: HistoryEntry[];
	bookmarks?: Bookmark[];
	session?: BrowserSessionSnapshot;
	openPages?: PersistedWebPage[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
	return typeof value === "boolean" ? value : undefined;
}

export function parseBrowserSettings(value: unknown): Partial<BrowserPluginSettings> {
	if (!isRecord(value)) return {};

	const settings: Partial<BrowserPluginSettings> = {};
	const homeUrl = readString(value.homeUrl);
	const downloadDirectory = readString(value.downloadDirectory);
	const pageNotesFolder = readString(value.pageNotesFolder);

	if (homeUrl !== undefined) settings.homeUrl = homeUrl;
	if (downloadDirectory !== undefined) settings.downloadDirectory = downloadDirectory;
	if (pageNotesFolder !== undefined) settings.pageNotesFolder = pageNotesFolder;

	const maxRestoredTabs = value.maxRestoredTabs;
	if (typeof maxRestoredTabs === "number" && Number.isFinite(maxRestoredTabs) && maxRestoredTabs > 0) {
		settings.maxRestoredTabs = Math.min(50, Math.floor(maxRestoredTabs));
	}

	const booleanKeys = [
		"enableJavaScript",
		"allowLocalFileAccess",
		"sandboxMode",
		"incognitoMode",
		"blockExternalInternet",
		"allowMixedContent",
		"autoRefresh",
		"watchFileChanges",
		"refreshOnSave",
		"forwardConsoleLogs",
		"showStatusBar",
		"showSecurityWarnings",
		"openVaultHtmlAsPage",
		"restoreSessionOnStartup",
	] as const satisfies ReadonlyArray<keyof BrowserPluginSettings>;

	for (const key of booleanKeys) {
		const parsed = readBoolean(value[key]);
		if (parsed !== undefined) {
			settings[key] = parsed;
		}
	}

	return settings;
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
	return (
		isRecord(value) &&
		typeof value.id === "string" &&
		typeof value.url === "string" &&
		typeof value.title === "string" &&
		typeof value.visitedAt === "number"
	);
}

function isBookmark(value: unknown): value is Bookmark {
	return (
		isRecord(value) &&
		typeof value.id === "string" &&
		typeof value.url === "string" &&
		typeof value.title === "string" &&
		typeof value.folder === "string" &&
		typeof value.createdAt === "number"
	);
}

function isBrowserSession(value: unknown): value is BrowserSessionSnapshot {
	const parsed = parseBrowserSession(value);
	return parsed !== null && parsed.tabs.length > 0;
}

function isPersistedWebPage(value: unknown): value is PersistedWebPage {
	return (
		isRecord(value) &&
		typeof value.url === "string" &&
		value.url.length > 0 &&
		typeof value.title === "string"
	);
}

export function parsePluginData(raw: unknown): PluginData {
	if (!isRecord(raw)) return {};

	const data: PluginData = {};
	if (raw.settings !== undefined) {
		data.settings = parseBrowserSettings(raw.settings);
	}
	if (Array.isArray(raw.history)) {
		data.history = raw.history.filter(isHistoryEntry);
	}
	if (Array.isArray(raw.bookmarks)) {
		data.bookmarks = raw.bookmarks.filter(isBookmark);
	}
	if (raw.session !== undefined && isBrowserSession(raw.session)) {
		data.session = parseBrowserSession(raw.session) ?? undefined;
	}
	if (Array.isArray(raw.openPages)) {
		data.openPages = raw.openPages.filter(isPersistedWebPage);
	}
	return data;
}
