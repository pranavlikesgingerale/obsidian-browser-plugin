import { SUPPORTED_EXTENSIONS } from "../types";
import { getPath } from "./electron";

/**
 * Convert a filesystem path to a file:// URL compatible with Chromium.
 * Handles Windows drive letters and UNC paths.
 */
export function pathToFileUrl(filePath: string): string {
	const normalized = filePath.replace(/\\/g, "/");

	if (/^[a-zA-Z]:\//.test(normalized)) {
		return `file:///${normalized}`;
	}

	if (normalized.startsWith("//")) {
		return `file:${normalized}`;
	}

	if (normalized.startsWith("/")) {
		return `file://${normalized}`;
	}

	return `file:///${normalized}`;
}

/**
 * Extract filesystem path from a file:// URL.
 */
export function fileUrlToPath(url: string): string | null {
	if (!url.startsWith("file://")) return null;

	let path = url.slice("file://".length);

	// file:///C:/... on Windows
	if (/^\/[a-zA-Z]:\//.test(path)) {
		path = path.slice(1);
	}

	return decodeURIComponent(path.replace(/\//g, getPathSeparator()));
}

/** Get platform-specific path separator. */
export function getPathSeparator(): string {
	const pathMod = getPath();
	return pathMod?.sep ?? "/";
}

/** Resolve a relative URL against a base file:// URL. */
export function resolveRelativeUrl(baseUrl: string, relative: string): string {
	if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(relative)) {
		return relative;
	}

	const basePath = fileUrlToPath(baseUrl);
	if (!basePath) return relative;

	const pathMod = getPath();
	if (!pathMod) return relative;

	const baseDir = pathMod.dirname(basePath);
	const resolved = pathMod.resolve(baseDir, relative);
	return pathToFileUrl(resolved);
}

/** Check if a path has a supported browser extension. */
export function isSupportedFile(filePath: string): boolean {
	const lower = filePath.toLowerCase();
	return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** Check if path points to a directory (heuristic without fs). */
export function looksLikeDirectory(filePath: string): boolean {
	const lower = filePath.toLowerCase();
	return !SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** Generate a unique ID for tabs, bookmarks, etc. */
export function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Normalize user-entered URL or path into a loadable URL. */
export function normalizeInputToUrl(input: string): string {
	const trimmed = input.trim();
	if (!trimmed) return "";

	if (/^file:\/\//i.test(trimmed)) {
		return trimmed;
	}

	if (/^https?:\/\//i.test(trimmed)) {
		return trimmed;
	}

	// Windows/UNC paths
	if (/^[a-zA-Z]:[\\/]/.test(trimmed) || trimmed.startsWith("\\\\")) {
		return pathToFileUrl(trimmed);
	}

	// Domain-like input: google.com, google.com.in, www.example.com/path
	if (looksLikeWebHost(trimmed)) {
		return `https://${trimmed}`;
	}

	// Treat as filesystem path
	return pathToFileUrl(trimmed);
}

/** Heuristic: hostname vs local file like index.html / photo.png. */
function looksLikeWebHost(input: string): boolean {
	if (input.includes("\\") || input.includes(" ") || input.startsWith(".")) return false;
	if (/^[a-zA-Z]:/.test(input)) return false;

	const hostPart = input.split(/[/?#]/)[0];
	if (!hostPart.includes(".")) return false;

	// Single-dot file names (index.html, logo.png) are local files, not hosts.
	if (isSupportedFile(hostPart) && hostPart.split(".").length === 2) {
		return false;
	}

	return /^(?:[\w-]+\.)+[a-zA-Z]{2,}$/.test(hostPart) || /^www\./i.test(hostPart);
}

/** Get directory listing HTML for a local folder (simple index). */
export function buildDirectoryListingHtml(dirPath: string, entries: string[]): string {
	const links = entries
		.map((entry) => {
			const full = `${dirPath.replace(/\\/g, "/")}/${entry}`.replace(/\/+/g, "/");
			const href = pathToFileUrl(full);
			return `<li><a href="${href}">${entry}</a></li>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Index of ${dirPath}</title>
<style>
body { font-family: system-ui, sans-serif; margin: 2rem; }
h1 { font-size: 1.25rem; }
ul { list-style: none; padding: 0; }
li { padding: 0.25rem 0; }
a { color: var(--text-accent, #7c3aed); text-decoration: none; }
a:hover { text-decoration: underline; }
</style>
</head>
<body>
<h1>Index of ${dirPath}</h1>
<ul>${links}</ul>
</body>
</html>`;
}
