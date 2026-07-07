/**
 * Safe access to Electron / Node APIs from within the desktop renderer process.
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
	dialog?: ElectronDialog;
	remote?: {
		dialog?: ElectronDialog;
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function hasFunction(obj: Record<string, unknown>, key: string): boolean {
	return typeof obj[key] === "function";
}

/** Load a Node/Electron module via Obsidian's window.require. */
export function nodeRequire(moduleName: string): unknown {
	try {
		if (typeof window.require === "function") {
			return window.require(moduleName);
		}
	} catch {
		// Module unavailable (mobile or restricted environment)
	}
	return undefined;
}

/** Attempt to load Electron module via Obsidian's window.require. */
export function getElectron(): ElectronModule | null {
	const mod = nodeRequire("electron");
	if (!isRecord(mod)) return null;

	const remote = isRecord(mod.remote) ? mod.remote : undefined;
	return {
		shell: isRecord(mod.shell) ? (mod.shell as unknown as ElectronShell) : undefined,
		ipcRenderer: isRecord(mod.ipcRenderer) ? (mod.ipcRenderer as unknown as ElectronIpcRenderer) : undefined,
		dialog: isRecord(mod.dialog) ? (mod.dialog as unknown as ElectronDialog) : undefined,
		remote: remote
			? {
					dialog: isRecord(remote.dialog) ? (remote.dialog as unknown as ElectronDialog) : undefined,
				}
			: undefined,
	};
}

/** Check whether Node.js require is available in the plugin context. */
export function hasNodeRequire(): boolean {
	try {
		return typeof window.require === "function";
	} catch {
		return false;
	}
}

/** Get Node.js fs module when available. */
export function getFs(): typeof import("fs") | null {
	const mod = nodeRequire("fs");
	if (!isRecord(mod)) return null;
	if (!hasFunction(mod, "readFileSync") || !hasFunction(mod, "statSync")) return null;
	return mod as unknown as typeof import("fs");
}

/** Get Node.js path module when available. */
export function getPath(): typeof import("path") | null {
	const mod = nodeRequire("path");
	if (!isRecord(mod)) return null;
	if (!hasFunction(mod, "join") || !hasFunction(mod, "resolve")) return null;
	return mod as unknown as typeof import("path");
}
