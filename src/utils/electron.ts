/**
 * Safe access to Electron APIs from within Obsidian's renderer process.
 */

export interface ElectronShell {
	openPath(path: string): Promise<string>;
	openExternal(url: string): Promise<void>;
	showItemInFolder(fullPath: string): void;
}

export interface ElectronDialog {
	showOpenDialog(options: Record<string, unknown>): Promise<{ canceled: boolean; filePaths: string[] }>;
}

export interface ElectronIpcRenderer {
	send(channel: string, ...args: unknown[]): void;
	invoke(channel: string, ...args: unknown[]): Promise<unknown>;
}

export interface ElectronModule {
	shell?: ElectronShell;
	ipcRenderer?: ElectronIpcRenderer;
	remote?: {
		dialog?: ElectronDialog;
	};
}

/** Attempt to load Electron module via Obsidian's window.require. */
export function getElectron(): ElectronModule | null {
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const win = window as any;
		if (typeof win.require === "function") {
			return win.require("electron") as ElectronModule;
		}
	} catch {
		// Electron not available (mobile or restricted environment)
	}
	return null;
}

/** Check whether Node.js require is available in the plugin context. */
export function hasNodeRequire(): boolean {
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return typeof (window as any).require === "function";
	} catch {
		return false;
	}
}

/** Get Node.js fs module when available. */
export function getFs(): typeof import("fs") | null {
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (window as any).require("fs") as typeof import("fs");
	} catch {
		return null;
	}
}

/** Get Node.js path module when available. */
export function getPath(): typeof import("path") | null {
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (window as any).require("path") as typeof import("path");
	} catch {
		return null;
	}
}
