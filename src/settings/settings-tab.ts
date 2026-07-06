import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import type ObsidianBrowserPlugin from "../main";
import type { BrowserPluginSettings } from "../types";
import {
	detectCompatibility,
	formatCompatibilityReport,
} from "../browser/compatibility";

/** Plugin settings tab with security warnings and compatibility report. */
export class BrowserSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: ObsidianBrowserPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Obsidian Browser Settings" });

		containerEl.createEl("h3", { text: "General" });

		new Setting(containerEl)
			.setName("Home URL")
			.setDesc("Default page when clicking Home (file:// path or URL)")
			.addText((text) =>
				text
					.setPlaceholder("file:///C:/Projects/site/index.html")
					.setValue(this.plugin.settings.homeUrl)
					.onChange(async (value) => {
						this.plugin.settings.homeUrl = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Show status bar")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showStatusBar).onChange(async (value) => {
					this.plugin.settings.showStatusBar = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Download directory")
			.setDesc("Default folder for downloads (leave empty for system default)")
			.addText((text) =>
				text.setValue(this.plugin.settings.downloadDirectory).onChange(async (value) => {
					this.plugin.settings.downloadDirectory = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Open vault HTML as page")
			.setDesc("When you open an .html file in the vault, show it as a live page tab")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.openVaultHtmlAsPage).onChange(async (value) => {
					this.plugin.settings.openVaultHtmlAsPage = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Page notes folder")
			.setDesc("Where .webpage notes are saved (vault-relative)")
			.addText((text) =>
				text.setValue(this.plugin.settings.pageNotesFolder).onChange(async (value) => {
					this.plugin.settings.pageNotesFolder = value;
					await this.plugin.saveSettings();
				}),
			);

		containerEl.createEl("h3", { text: "Security" });

		this.addSecurityToggle(
			"Enable JavaScript",
			"Allow JavaScript execution in the browser. Required for interactive pages.",
			"enableJavaScript",
			"Disabling JavaScript will break most modern web pages.",
		);

		this.addSecurityToggle(
			"Allow local file access",
			"Permit loading file:// URLs and local assets. Required for local HTML development.",
			"allowLocalFileAccess",
			"Local file access allows pages to read other files on your system.",
		);

		this.addSecurityToggle(
			"Sandbox mode",
			"Enable Electron sandbox for webview (restricts some APIs).",
			"sandboxMode",
			"Sandbox mode may break pages that rely on certain browser APIs.",
		);

		this.addSecurityToggle(
			"Incognito mode",
			"Use non-persistent session — cookies and storage are not saved.",
			"incognitoMode",
			"",
		);

		this.addSecurityToggle(
			"Block external internet",
			"Prevent navigation to http(s) URLs outside local files.",
			"blockExternalInternet",
			"",
		);

		new Setting(containerEl)
			.setName("Allow mixed content")
			.setDesc("Allow HTTP resources on HTTPS pages")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.allowMixedContent).onChange(async (value) => {
					this.plugin.settings.allowMixedContent = value;
					await this.plugin.saveSettings();
				}),
			);

		containerEl.createEl("h3", { text: "Live Development" });

		new Setting(containerEl)
			.setName("Auto refresh")
			.setDesc("Automatically refresh when files change")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.autoRefresh).onChange(async (value) => {
					this.plugin.settings.autoRefresh = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Watch file changes")
			.setDesc("Monitor loaded files for changes (uses fs.watch)")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.watchFileChanges).onChange(async (value) => {
					this.plugin.settings.watchFileChanges = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Refresh on save")
			.setDesc("Refresh when Obsidian vault files are saved (if URL matches)")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.refreshOnSave).onChange(async (value) => {
					this.plugin.settings.refreshOnSave = value;
					await this.plugin.saveSettings();
				}),
			);

		containerEl.createEl("h3", { text: "Developer Tools" });

		new Setting(containerEl)
			.setName("Forward console logs")
			.setDesc("Forward webview console output to Obsidian developer console")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.forwardConsoleLogs).onChange(async (value) => {
					this.plugin.settings.forwardConsoleLogs = value;
					await this.plugin.saveSettings();
				}),
			);

		containerEl.createEl("h3", { text: "Compatibility" });

		const compat = detectCompatibility();
		const report = formatCompatibilityReport(compat);

		new Setting(containerEl)
			.setName("Environment report")
			.setDesc("Detected runtime capabilities and limitations")
			.addButton((btn) =>
				btn.setButtonText("Refresh").onClick(() => {
					this.display();
				}),
			);

		const pre = containerEl.createEl("pre", {
			cls: "obsidian-browser-compat-report",
			text: report,
		});
		pre.style.whiteSpace = "pre-wrap";
		pre.style.fontSize = "0.85em";
		pre.style.padding = "1rem";
		pre.style.background = "var(--background-secondary)";
		pre.style.borderRadius = "4px";
	}

	private addSecurityToggle(
		name: string,
		desc: string,
		key: keyof BrowserPluginSettings,
		warning: string,
	): void {
		new Setting(this.containerEl)
			.setName(name)
			.setDesc(desc)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings[key] as boolean).onChange(async (value) => {
					if (value && warning && this.plugin.settings.showSecurityWarnings) {
						new Notice(`Warning — ${name}: ${warning}`, 8000);
					}
					(this.plugin.settings[key] as boolean) = value;
					await this.plugin.saveSettings();
				});
			});
	}
}
