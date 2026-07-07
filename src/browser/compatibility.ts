import { Platform, type App } from "obsidian";
import type {
	BrowserEngineType,
	BrowserPluginSettings,
	CompatibilityInfo,
} from "../types";
import { hasNodeRequire, hasElectronModule } from "../utils/electron";
import { getActiveDocument, createElement } from "../utils/dom";
import { readProcessVersion } from "../utils/node-modules";
import { Logger } from "../utils/logger";

const log = new Logger("compatibility");

function getPlatformName(): string {
	if (Platform.isWin) return "windows";
	if (Platform.isMacOS) return "macos";
	if (Platform.isLinux) return "linux";
	if (Platform.isIosApp) return "ios";
	if (Platform.isAndroidApp) return "android";
	return "unknown";
}

/**
 * Detect runtime environment and determine the best available browser engine.
 */
export function detectCompatibility(app?: App): CompatibilityInfo {
	const limitations: string[] = [];
	const obsidianVersion = app?.version ?? "unknown";

	let electronVersion = "unknown";
	let chromiumVersion = "unknown";
	let nodeVersion = "unknown";
	try {
		electronVersion = readProcessVersion("electron");
		chromiumVersion = readProcessVersion("chrome");
		nodeVersion = readProcessVersion("node");
	} catch {
		limitations.push("process.versions unavailable — running in restricted context.");
	}

	const platform = getPlatformName();
	const webviewCheck = checkWebviewAvailability();

	if (!webviewCheck.available) {
		limitations.push(webviewCheck.reason);
		limitations.push(
			"Fallback iframe mode cannot fully replicate file:// relative path resolution for arbitrary disk paths.",
		);
		limitations.push(
			"IndexedDB, cookies, and session persistence are limited in sandboxed iframe fallback.",
		);
	}

	if (!hasNodeRequire()) {
		limitations.push("Node.js require unavailable — local file dialogs and fs access may be limited.");
	}

	const engineRecommendation: BrowserEngineType = webviewCheck.available
		? "webview"
		: hasNodeRequire()
			? "iframe-blob"
			: "unavailable";

	return {
		obsidianVersion,
		electronVersion,
		chromiumVersion,
		nodeVersion,
		platform,
		webviewAvailable: webviewCheck.available,
		webviewReason: webviewCheck.reason,
		engineRecommendation,
		limitations,
	};
}

/** Test whether <webview> can be created in the current window. */
function checkWebviewAvailability(): { available: boolean; reason: string } {
	if (!hasNodeRequire()) {
		return {
			available: false,
			reason:
				"Electron APIs unavailable. Mobile and restricted contexts do not support <webview>.",
		};
	}

	try {
		getActiveDocument();
		const test = createElement("webview");
		if (test.tagName.toLowerCase() !== "webview") {
			return {
				available: false,
				reason: "Custom element <webview> is not registered in this Electron BrowserWindow.",
			};
		}

		const electron = hasElectronModule();
		if (!electron) {
			return {
				available: false,
				reason: "Could not load electron module to verify webview support.",
			};
		}

		log.warn("Webview element creation succeeded — webview engine available.");
		return { available: true, reason: "Electron <webview> tag is available." };
	} catch (e) {
		return {
			available: false,
			reason: `Webview creation failed: ${e instanceof Error ? e.message : String(e)}. ` +
				"The host window may have webviewTag: false in webPreferences.",
		};
	}
}

/** Build webpreferences string for webview based on settings. */
export function buildWebPreferences(settings: BrowserPluginSettings, incognito: boolean): string {
	const prefs: string[] = [];

	prefs.push(`javascript=${settings.enableJavaScript ? "yes" : "no"}`);
	prefs.push(`webSecurity=${settings.allowLocalFileAccess ? "no" : "yes"}`);
	prefs.push(`allowRunningInsecureContent=${settings.allowMixedContent ? "yes" : "no"}`);
	prefs.push(`contextIsolation=yes`);
	prefs.push(`nodeIntegration=no`);
	prefs.push(`sandbox=${settings.sandboxMode ? "yes" : "no"}`);

	if (incognito || settings.incognitoMode) {
		prefs.push("partition=persist:local-html-browser-incognito");
	}

	return prefs.join(",");
}

/** Format compatibility info for display in settings UI. */
export function formatCompatibilityReport(info: CompatibilityInfo): string {
	const lines = [
		`App: ${info.obsidianVersion}`,
		`Electron: ${info.electronVersion}`,
		`Chromium: ${info.chromiumVersion}`,
		`Node.js: ${info.nodeVersion}`,
		`Platform: ${info.platform}`,
		`Webview: ${info.webviewAvailable ? "Available" : "Unavailable"}`,
		`Reason: ${info.webviewReason}`,
		`Recommended engine: ${info.engineRecommendation}`,
	];

	if (info.limitations.length > 0) {
		lines.push("", "Known limitations:");
		info.limitations.forEach((l) => lines.push(`• ${l}`));
	}

	return lines.join("\n");
}
