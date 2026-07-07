import type LocalHtmlBrowserPlugin from "../main";
import { openFileDialog, openFolderDialog } from "../ui/download-manager";
import { pathToFileUrl } from "../utils/paths";

/** Register all plugin commands. */
export function registerCommands(plugin: LocalHtmlBrowserPlugin): void {
	plugin.addCommand({
		id: "open-browser",
		name: "Open browser",
		callback: () => {
			void plugin.activateBrowserView();
		},
	});

	plugin.addCommand({
		id: "new-browser-tab",
		name: "New browser tab",
		callback: async () => {
			const view = await plugin.activateBrowserView();
			view?.createNewTab();
		},
	});

	plugin.addCommand({
		id: "reopen-closed-tab",
		name: "Reopen closed browser tab",
		callback: async () => {
			const view = await plugin.activateBrowserView();
			view?.reopenClosedTab();
		},
	});

	plugin.addCommand({
		id: "duplicate-tab",
		name: "Duplicate browser tab",
		checkCallback: (checking) => {
			const view = plugin.getActiveBrowserView();
			if (!view) return false;
			if (!checking) view.createNewTab(view.getCurrentUrl());
			return true;
		},
	});

	plugin.addCommand({
		id: "browser-back",
		name: "Browser: Go back",
		checkCallback: (checking) => {
			const view = plugin.getActiveBrowserView();
			if (!view) return false;
			if (!checking) view.goBack();
			return true;
		},
	});

	plugin.addCommand({
		id: "browser-forward",
		name: "Browser: Go forward",
		checkCallback: (checking) => {
			const view = plugin.getActiveBrowserView();
			if (!view) return false;
			if (!checking) view.goForward();
			return true;
		},
	});

	plugin.addCommand({
		id: "browser-reload",
		name: "Browser: Reload",
		checkCallback: (checking) => {
			const view = plugin.getActiveBrowserView();
			if (!view) return false;
			if (!checking) view.reload();
			return true;
		},
	});

	plugin.addCommand({
		id: "browser-hard-reload",
		name: "Browser: Hard reload",
		checkCallback: (checking) => {
			const view = plugin.getActiveBrowserView();
			if (!view) return false;
			if (!checking) view.hardReload();
			return true;
		},
	});

	plugin.addCommand({
		id: "browser-stop",
		name: "Browser: Stop loading",
		checkCallback: (checking) => {
			const view = plugin.getActiveBrowserView();
			if (!view) return false;
			if (!checking) view.stopLoading();
			return true;
		},
	});

	plugin.addCommand({
		id: "toggle-devtools",
		name: "Browser: Toggle devtools",
		checkCallback: (checking) => {
			const view = plugin.getActiveBrowserView();
			if (!view) return false;
			if (!checking) view.toggleDevTools();
			return true;
		},
	});

	plugin.addCommand({
		id: "open-file",
		name: "Browser: Open file",
		callback: async () => {
			const path = await openFileDialog();
			if (path) {
				const view = await plugin.activateBrowserView();
				view?.navigateTo(pathToFileUrl(path));
			}
		},
	});

	plugin.addCommand({
		id: "open-folder",
		name: "Browser: Open folder",
		callback: async () => {
			const path = await openFolderDialog();
			if (path) {
				const view = await plugin.activateBrowserView();
				view?.navigateTo(pathToFileUrl(path));
			}
		},
	});

	plugin.addCommand({
		id: "add-bookmark",
		name: "Browser: Bookmark current page",
		checkCallback: (checking) => {
			const view = plugin.getActiveBrowserView();
			if (!view) return false;
			if (!checking) {
				const url = view.getCurrentUrl();
				const title = view.getCurrentTitle();
				if (url) {
					plugin.bookmarkManager.addBookmark(url, title || url);
					void plugin.savePersistedData();
				}
			}
			return true;
		},
	});

	plugin.addCommand({
		id: "toggle-auto-refresh",
		name: "Browser: Toggle auto-refresh",
		callback: async () => {
			plugin.settings.autoRefresh = !plugin.settings.autoRefresh;
			await plugin.saveSettings();
		},
	});

	plugin.addCommand({
		id: "open-as-page",
		name: "Browser: Open as page",
		checkCallback: (checking) => {
			const view = plugin.getActiveBrowserView();
			if (!view) return false;
			if (!checking) {
				const url = view.getCurrentUrl();
				if (url && !url.startsWith("blob:")) {
					void plugin.openWebPage(url, view.getCurrentTitle() || "Web Page");
				}
			}
			return true;
		},
	});

	plugin.addCommand({
		id: "save-page-note",
		name: "Browser: Save page as note",
		checkCallback: (checking) => {
			const browser = plugin.getActiveBrowserView();
			const page = plugin.getActiveWebPageView();
			const url = browser?.getCurrentUrl() ?? page?.getUrl() ?? "";
			const title = browser?.getCurrentTitle() ?? page?.getTitle() ?? "Web Page";
			if (!url || url.startsWith("blob:")) return false;
			if (!checking) void plugin.savePageNote(url, title);
			return true;
		},
	});
}
