import type {
	BrowserEngineType,
	BrowserPluginSettings,
	CompatibilityInfo,
} from "../types";
import { getElectron, hasNodeRequire } from "../utils/electron";
import { Logger } from "../utils/logger";

const log = new Logger("compatibility");

/**
 * Detect runtime environment and determine the best available browser engine.
 * Never silently fails — always returns explicit capability info.
 */
export function detectCompatibility(): CompatibilityInfo {
	const limitations: string[] = [];

	// Obsidian version from global API
	let obsidianVersion = "unknown";
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const app = (window as any).app;
		if (app?.version) obsidianVersion = app.version as string;
	} catch {
		limitations.push("Could not detect Obsidian version.");
	}

	// Electron / Chromium / Node from process.versions
	let electronVersion = "unknown";
	let chromiumVersion = "unknown";
	let nodeVersion = "unknown";
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const versions = (process as any).versions;
		if (versions) {
			electronVersion = versions.electron ?? "unknown";
			chromiumVersion = versions.chrome ?? "unknown";
			nodeVersion = versions.node ?? "unknown";
		}
	} catch {
		limitations.push("process.versions unavailable — running in restricted context.");
	}

	const platform = navigator.platform || "unknown";
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

/** Test whether <webview> can be created in the current Obsidian window. */
function checkWebviewAvailability(): { available: boolean; reason: string } {
	if (!hasNodeRequire()) {
		return {
			available: false,
			reason:
				"Electron APIs unavailable. Obsidian mobile and restricted contexts do not support <webview>.",
		};
	}

	try {
		const test = document.createElement("webview");
		// In Electron with webviewTag enabled, webview has getWebContents method after attach
		// We check if the element is a valid custom element
		if (test.tagName.toLowerCase() !== "webview") {
			return {
				available: false,
				reason: "Custom element <webview> is not registered in this Electron BrowserWindow.",
			};
		}

		// Additional check: Obsidian may disable webviewTag in webPreferences
		const electron = getElectron();
		if (!electron) {
			return {
				available: false,
				reason: "Could not load electron module to verify webview support.",
			};
		}

		log.info("Webview element creation succeeded — webview engine available.");
		return { available: true, reason: "Electron <webview> tag is available." };
	} catch (e) {
		return {
			available: false,
			reason: `Webview creation failed: ${e instanceof Error ? e.message : String(e)}. ` +
				"Obsidian's BrowserWindow may have webviewTag: false in webPreferences.",
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
		prefs.push("partition=persist:obsidian-browser-incognito");
	}

	return prefs.join(",");
}

/** Format compatibility info for display in settings UI. */
export function formatCompatibilityReport(info: CompatibilityInfo): string {
	const lines = [
		`Obsidian: ${info.obsidianVersion}`,
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
