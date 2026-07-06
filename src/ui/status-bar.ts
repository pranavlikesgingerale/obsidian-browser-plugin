import type { BrowserEngineType } from "../types";

/** Bottom status bar showing page info and engine type. */
export class StatusBar {
	readonly el: HTMLElement;
	private statusText: HTMLElement;
	private engineBadge: HTMLElement;

	constructor() {
		this.el = document.createElement("div");
		this.el.className = "local-html-browser-status-bar";
		this.statusText = this.el.createSpan({ cls: "local-html-browser-status-text", text: "Ready" });
		this.engineBadge = this.el.createSpan({ cls: "local-html-browser-engine-badge" });
	}

	setStatus(text: string): void {
		this.statusText.setText(text);
	}

	setEngine(type: BrowserEngineType): void {
		const labels: Record<BrowserEngineType, string> = {
			webview: "Chromium Webview",
			"iframe-blob": "Iframe Fallback",
			"iframe-file": "Iframe File",
			unavailable: "Unavailable",
		};
		this.engineBadge.setText(labels[type]);
		this.engineBadge.className = `local-html-browser-engine-badge engine-${type}`;
	}

	setVisible(visible: boolean): void {
		this.el.style.display = visible ? "flex" : "none";
	}
}
