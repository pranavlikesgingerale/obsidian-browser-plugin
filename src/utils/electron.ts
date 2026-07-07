/**
 * Safe access to Electron APIs from within the desktop renderer process.
 */

import { toFsModule, toPathModule, type FsModule, type PathModule } from "./node-modules";

export type { FsModule, PathModule };

export interface ElectronShell {
	openPath(path: string): Promise<string>;
	openExternal(url: string): Promise<void>;
	showItemInFolder(fullPath: string): void;
}

export interface ElectronDialog {
	showOpenDialog(options: Record<string, unknown>): Promise<{ canceled: boolean; filePaths: string[] }>;
}

export interface ElectronModule {
	shell?: ElectronShell;
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

function callMethod(mod: Record<string, unknown>, key: string, args: unknown[]): unknown {
	const fn = mod[key];
	if (typeof fn !== "function") {
		throw new Error(`Expected ${key} to be a function.`);
	}
	return fn.apply(mod, args) as unknown;
}

function toElectronDialog(record: Record<string, unknown>): ElectronDialog | undefined {
	if (!hasFunction(record, "showOpenDialog")) return undefined;

	return {
		showOpenDialog: async (options: Record<string, unknown>) => {
			const result = await (callMethod(record, "showOpenDialog", [options]) as Promise<unknown>);
			if (!isRecord(result)) {
				return { canceled: true, filePaths: [] };
			}
			const filePaths = Array.isArray(result.filePaths)
				? result.filePaths.filter((path): path is string => typeof path === "string")
				: [];
			return {
				canceled: Boolean(result.canceled),
				filePaths,
			};
		},
	};
}

function toElectronShell(record: Record<string, unknown>): ElectronShell | undefined {
	if (
		!hasFunction(record, "openPath") ||
		!hasFunction(record, "openExternal") ||
		!hasFunction(record, "showItemInFolder")
	) {
		return undefined;
	}

	return {
		openPath: (path: string) => callMethod(record, "openPath", [path]) as Promise<string>,
		openExternal: (url: string) => callMethod(record, "openExternal", [url]) as Promise<void>,
		showItemInFolder: (fullPath: string) => {
			callMethod(record, "showItemInFolder", [fullPath]);
		},
	};
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
		shell: isRecord(mod.shell) ? toElectronShell(mod.shell) : undefined,
		dialog: isRecord(mod.dialog) ? toElectronDialog(mod.dialog) : undefined,
		remote: remote
			? {
					dialog: isRecord(remote.dialog) ? toElectronDialog(remote.dialog) : undefined,
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

/** Check whether the Electron module can be loaded. */
export function hasElectronModule(): boolean {
	return getElectron() !== null;
}

/** Get Node.js fs module when available. */
export function getFs(): FsModule | null {
	return toFsModule(nodeRequire("fs"));
}

/** Get Node.js path module when available. */
export function getPath(): PathModule | null {
	return toPathModule(nodeRequire("path"));
}
