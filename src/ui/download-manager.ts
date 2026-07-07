import { getElectron } from "../utils/electron";
import { createElement } from "../utils/dom";

/**
 * Simple download manager tracking browser download events.
 */
export class DownloadManager {
	// Reserved for future download UI wiring.
}

function getElectronFilePath(file: File): string {
	if ("path" in file) {
		const pathValue = (file as File & { path?: unknown }).path;
		if (typeof pathValue === "string" && pathValue.length > 0) {
			return pathValue;
		}
	}
	return file.name;
}

/** Show native open file dialog via Electron or HTML fallback. */
export async function openFileDialog(extensions?: string[]): Promise<string | null> {
	const electron = getElectron();
	const dialog = electron?.dialog ?? electron?.remote?.dialog;

	if (dialog?.showOpenDialog) {
		try {
			const result = await dialog.showOpenDialog({
				properties: ["openFile"],
				filters: [
					{
						name: "Web Files",
						extensions: extensions ?? ["html", "htm", "svg", "xml", "txt", "md"],
					},
					{ name: "All Files", extensions: ["*"] },
				],
			});
			if (!result.canceled && result.filePaths.length > 0) {
				return result.filePaths[0];
			}
		} catch {
			// fall through to HTML input
		}
	}

	return new Promise((resolve) => {
		const input = createElement("input") as HTMLInputElement;
		input.type = "file";
		input.accept = ".html,.htm,.svg,.xml,.txt,.md,.markdown";
		input.onchange = () => {
			const file = input.files?.[0];
			resolve(file ? getElectronFilePath(file) : null);
		};
		input.click();
	});
}

/** Show native open folder dialog. */
export async function openFolderDialog(): Promise<string | null> {
	const electron = getElectron();
	const dialog = electron?.dialog ?? electron?.remote?.dialog;

	if (dialog?.showOpenDialog) {
		try {
			const result = await dialog.showOpenDialog({
				properties: ["openDirectory"],
			});
			if (!result.canceled && result.filePaths.length > 0) {
				return result.filePaths[0];
			}
		} catch {
			// unavailable
		}
	}
	return null;
}
