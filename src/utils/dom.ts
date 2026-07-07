/** DOM helpers for popout-window compatibility. */
export function getActiveDocument(): Document {
	return typeof activeDocument !== "undefined" ? activeDocument : document;
}

/** Obsidian ItemView content area (second child of containerEl). */
export function getViewContentContainer(containerEl: HTMLElement): HTMLElement {
	const child = containerEl.children[1];
	if (!(child instanceof HTMLElement)) {
		throw new Error("View content container not found.");
	}
	return child;
}
