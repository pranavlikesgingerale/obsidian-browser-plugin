export {};

declare global {
	interface Window {
		require?: (moduleName: string) => unknown;
	}

	/** Obsidian global for popout window compatibility. */
	var activeDocument: Document | undefined;
}

declare module "obsidian" {
	interface App {
		/** Present at runtime; not in official typings. */
		version?: string;
	}
}
