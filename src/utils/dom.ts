/** DOM helpers for popout-window compatibility. */
export function getActiveDocument(): Document {
	if (typeof activeDocument === "undefined") {
		throw new Error("activeDocument is unavailable in this context.");
	}
	return activeDocument;
}

/** Obsidian ItemView content area (second child of containerEl). */
export function getViewContentContainer(containerEl: HTMLElement): HTMLElement {
	const child = containerEl.children[1];
	if (!child?.instanceOf(HTMLElement)) {
		throw new Error("View content container not found.");
	}
	return child;
}
