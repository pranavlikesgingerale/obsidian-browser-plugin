import { nodeInstanceOf } from "./obsidian-compat";

interface ObsidianWindowHost {
	createDiv(): HTMLElement;
	createEl(tag: string, o?: Record<string, string | number | boolean | undefined>): HTMLElement;
}

function getObsidianWin(doc: Document): ObsidianWindowHost {
	return (doc as Document & { win: ObsidianWindowHost }).win;
}

/** DOM helpers for popout-window compatibility. */
export function getActiveDocument(): Document {
	if (typeof activeDocument !== "undefined") {
		return activeDocument;
	}
	return document;
}

/** Obsidian ItemView content area (second child of containerEl). */
export function getViewContentContainer(containerEl: HTMLElement): HTMLElement {
	const child = containerEl.children[1];
	if (!nodeInstanceOf(child, HTMLElement)) {
		throw new Error("View content container not found.");
	}
	return child;
}

/** Create a root container element via Obsidian's DOM helpers. */
export function createRootDiv(): HTMLElement {
	return getObsidianWin(getActiveDocument()).createDiv();
}

/** Create a custom or standard element via Obsidian's DOM helpers. */
export function createElement(tag: string): HTMLElement {
	return getObsidianWin(getActiveDocument()).createEl(tag);
}
