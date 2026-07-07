import {
	App,
	Notice,
	PluginSettingTab,
	type SettingDefinition,
	type SettingDefinitionControl,
	type SettingDefinitionGroup,
	type SettingDefinitionItem,
} from "obsidian";
import type LocalHtmlBrowserPlugin from "../main";
import type { BrowserPluginSettings } from "../types";
import {
	detectCompatibility,
	formatCompatibilityReport,
} from "../browser/compatibility";

type BooleanSettingKey = {
	[K in keyof BrowserPluginSettings]: BrowserPluginSettings[K] extends boolean ? K : never;
}[keyof BrowserPluginSettings];

type SettingsKey = keyof BrowserPluginSettings;

const SECURITY_WARNINGS: Partial<Record<BooleanSettingKey, string>> = {
	enableJavaScript: "Disabling JavaScript will break most modern web pages.",
	allowLocalFileAccess: "Local file access allows pages to read other files on your system.",
	sandboxMode: "Sandbox mode may break pages that rely on certain browser APIs.",
};

function textSetting(
	name: string,
	desc: string,
	key: SettingsKey,
	placeholder?: string,
): SettingDefinitionControl<SettingsKey> {
	return {
		name,
		desc,
		control: {
			type: "text",
			key,
			defaultValue: "",
			placeholder,
		},
	};
}

function toggleSetting(
	name: string,
	desc: string,
	key: BooleanSettingKey,
): SettingDefinitionControl<SettingsKey> {
	return {
		name,
		desc,
		control: {
		 type: "toggle",
		 key,
		 defaultValue: false,
		},
	};
}

function settingsGroup(heading: string, items: SettingDefinition[]): SettingDefinitionGroup {
	return {
		type: "group",
		heading,
		items,
	};
}

/** Plugin settings tab with security warnings and compatibility report. */
export class BrowserSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: LocalHtmlBrowserPlugin) {
		super(app, plugin);
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			textSetting(
				"Home URL",
				"Default page when clicking home (file:// path or URL)",
				"homeUrl",
				"file:///C:/Projects/site/index.html",
			),
			toggleSetting("Show status bar", "Show the engine and page status bar in the browser view", "showStatusBar"),
			textSetting(
				"Download directory",
				"Default folder for downloads (leave empty for system default)",
				"downloadDirectory",
			),
			toggleSetting(
				"Open vault HTML as page",
				"When you open an .html file in the vault, show it as a live page tab",
				"openVaultHtmlAsPage",
			),
			textSetting(
				"Page notes folder",
				"Where .webpage notes are saved (vault-relative)",
				"pageNotesFolder",
			),
			toggleSetting(
				"Restore session on startup",
				"Reopen your last browser tabs when you launch Obsidian or open the browser",
				"restoreSessionOnStartup",
			),
			settingsGroup("Security", [
				toggleSetting(
					"Enable JavaScript",
					"Allow JavaScript execution in the browser. Required for interactive pages.",
					"enableJavaScript",
				),
				toggleSetting(
					"Allow local file access",
					"Permit loading file:// URLs and local assets. Required for local HTML development.",
					"allowLocalFileAccess",
				),
				toggleSetting(
					"Sandbox mode",
					"Enable Electron sandbox for webview (restricts some APIs).",
					"sandboxMode",
				),
				toggleSetting(
					"Incognito mode",
					"Use non-persistent session — cookies and storage are not saved.",
					"incognitoMode",
				),
				toggleSetting(
					"Block external internet",
					"Prevent navigation to http(s) URLs outside local files.",
					"blockExternalInternet",
				),
				toggleSetting(
					"Allow mixed content",
					"Allow HTTP resources on HTTPS pages",
					"allowMixedContent",
				),
			]),
			settingsGroup("Live development", [
				toggleSetting("Auto refresh", "Automatically refresh when files change", "autoRefresh"),
				toggleSetting(
					"Watch file changes",
					"Monitor loaded files for changes (uses fs.watch)",
					"watchFileChanges",
				),
				toggleSetting(
					"Refresh on save",
					"Refresh when vault files are saved (if URL matches)",
					"refreshOnSave",
				),
			]),
			settingsGroup("Developer tools", [
				toggleSetting(
					"Forward console logs",
					"Forward webview warn/error output to the developer console",
					"forwardConsoleLogs",
				),
			]),
			settingsGroup("Compatibility", [
				{
					name: "Environment report",
					desc: "Detected runtime capabilities and limitations",
					render: (setting) => {
						setting.addButton((btn) =>
							btn.setButtonText("Refresh").onClick(() => {
								this.refreshCompatibilityReport(setting.settingEl);
							}),
						);
						setting.settingEl.createEl("pre", {
							cls: "local-html-browser-compat-report",
							text: formatCompatibilityReport(detectCompatibility(this.app)),
						});
					},
				},
			]),
		];
	}

	override setControlValue(key: string, value: unknown): void {
		const settingKey = key as BooleanSettingKey;
		const warning = SECURITY_WARNINGS[settingKey];
		if (value === true && warning && this.plugin.settings.showSecurityWarnings) {
			new Notice(`Warning — ${key}: ${warning}`, 8000);
		}
		const result = super.setControlValue(key, value);
		void Promise.resolve(result).then(() => this.plugin.saveSettings());
	}

	private refreshCompatibilityReport(container: HTMLElement): void {
		const reportEl = container.querySelector(".local-html-browser-compat-report");
		if (reportEl?.instanceOf(HTMLElement)) {
			reportEl.setText(formatCompatibilityReport(detectCompatibility(this.app)));
		}
	}
}
