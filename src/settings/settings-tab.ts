import {
	App,
	Notice,
	PluginSettingTab,
	Setting,
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
import { nodeInstanceOf } from "../utils/obsidian-compat";

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

	/** Legacy settings UI for Obsidian 1.12.x (before declarative settings). */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		this.addTextSetting(
			containerEl,
			"Home URL",
			"Default page when clicking home (file:// path or URL)",
			"homeUrl",
			"file:///C:/Projects/site/index.html",
		);
		this.addToggleSetting(containerEl, "Show status bar", "Show the engine and page status bar in the browser view", "showStatusBar");
		this.addTextSetting(containerEl, "Download directory", "Default folder for downloads (leave empty for system default)", "downloadDirectory");
		this.addToggleSetting(
			containerEl,
			"Open vault HTML as page",
			"When you open an .html file in the vault, show it as a live page tab",
			"openVaultHtmlAsPage",
		);
		this.addTextSetting(containerEl, "Page notes folder", "Where .webpage notes are saved (vault-relative)", "pageNotesFolder");
		this.addToggleSetting(
			containerEl,
			"Restore session on startup",
			"Reopen your last browser tabs when you launch Obsidian or open the browser",
			"restoreSessionOnStartup",
		);

		new Setting(containerEl).setName("Security").setHeading();
		this.addToggleSetting(containerEl, "Enable JavaScript", "Allow JavaScript execution in the browser. Required for interactive pages.", "enableJavaScript");
		this.addToggleSetting(containerEl, "Allow local file access", "Permit loading file:// URLs and local assets. Required for local HTML development.", "allowLocalFileAccess");
		this.addToggleSetting(containerEl, "Sandbox mode", "Enable Electron sandbox for webview (restricts some APIs).", "sandboxMode");
		this.addToggleSetting(containerEl, "Incognito mode", "Use non-persistent session — cookies and storage are not saved.", "incognitoMode");
		this.addToggleSetting(containerEl, "Block external internet", "Prevent navigation to http(s) URLs outside local files.", "blockExternalInternet");
		this.addToggleSetting(containerEl, "Allow mixed content", "Allow HTTP resources on HTTPS pages", "allowMixedContent");

		new Setting(containerEl).setName("Live development").setHeading();
		this.addToggleSetting(containerEl, "Auto refresh", "Automatically refresh when files change", "autoRefresh");
		this.addToggleSetting(containerEl, "Watch file changes", "Monitor loaded files for changes (uses fs.watch)", "watchFileChanges");
		this.addToggleSetting(containerEl, "Refresh on save", "Refresh when vault files are saved (if URL matches)", "refreshOnSave");

		new Setting(containerEl).setName("Developer tools").setHeading();
		this.addToggleSetting(containerEl, "Forward console logs", "Forward webview warn/error output to the developer console", "forwardConsoleLogs");

		new Setting(containerEl).setName("Compatibility").setHeading();
		const compatSetting = new Setting(containerEl)
			.setName("Environment report")
			.setDesc("Detected runtime capabilities and limitations");
		compatSetting.addButton((btn) =>
			btn.setButtonText("Refresh").onClick(() => {
				this.refreshCompatibilityReport(compatSetting.settingEl);
			}),
		);
		compatSetting.settingEl.createEl("pre", {
			cls: "local-html-browser-compat-report",
			text: formatCompatibilityReport(detectCompatibility(this.app)),
		});
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

	private refreshCompatibilityReport(container: HTMLElement): void {
		const reportEl = container.querySelector(".local-html-browser-compat-report");
		if (nodeInstanceOf(reportEl, HTMLElement)) {
			reportEl.setText(formatCompatibilityReport(detectCompatibility(this.app)));
		}
	}

	private addTextSetting(
		container: HTMLElement,
		name: string,
		desc: string,
		key: Extract<SettingsKey, "homeUrl" | "downloadDirectory" | "pageNotesFolder">,
		placeholder?: string,
	): void {
		new Setting(container)
			.setName(name)
			.setDesc(desc)
			.addText((text) => {
				text.setValue(String(this.plugin.settings[key] ?? ""));
				if (placeholder) text.setPlaceholder(placeholder);
				text.onChange(async (value) => {
					this.plugin.settings[key] = value;
					await this.plugin.saveSettings();
				});
			});
	}

	private addToggleSetting(
		container: HTMLElement,
		name: string,
		desc: string,
		key: BooleanSettingKey,
	): void {
		new Setting(container)
			.setName(name)
			.setDesc(desc)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings[key]);
				toggle.onChange(async (value) => {
					if (value && SECURITY_WARNINGS[key] && this.plugin.settings.showSecurityWarnings) {
						new Notice(`Warning — ${key}: ${SECURITY_WARNINGS[key]}`, 8000);
					}
					this.plugin.settings[key] = value;
					await this.plugin.saveSettings();
				});
			});
	}
}
