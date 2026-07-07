import { getFs, getPath } from "./electron";
import { buildDirectoryListingHtml, isSupportedFile, pathToFileUrl } from "./paths";
import { SUPPORTED_EXTENSIONS } from "../types";

/**
 * Read a local file and return content suitable for browser loading.
 * Markdown files are converted to a simple HTML preview.
 */
export function readLocalFile(filePath: string): { content: string; mimeType: string; url: string } | null {
	const fs = getFs();
	const pathMod = getPath();
	if (!fs || !pathMod) return null;

	try {
		const ext = pathMod.extname(filePath).toLowerCase();
		const url = pathToFileUrl(filePath);

		if (ext === ".md" || ext === ".markdown") {
			const md = fs.readFileSync(filePath, "utf-8");
			const html = markdownToHtmlPreview(md, filePath);
			return { content: html, mimeType: "text/html", url };
		}

		const content = fs.readFileSync(filePath, "utf-8");
		const mimeType = mimeForExtension(ext);
		return { content, mimeType, url };
	} catch {
		return null;
	}
}

/** List directory contents and return an HTML index page. */
export function readDirectoryListing(dirPath: string): { content: string; url: string } | null {
	const fs = getFs();
	const pathMod = getPath();
	if (!fs || !pathMod) return null;

	try {
		const entries = fs.readdirSync(dirPath);
		const sorted = entries.sort((a, b) => a.localeCompare(b));
		const content = buildDirectoryListingHtml(dirPath, sorted);
		return { content, url: pathToFileUrl(dirPath) };
	} catch {
		return null;
	}
}

/** Resolve input path to either file content or directory listing. */
export function resolveLocalPath(inputPath: string): {
	type: "file" | "directory" | "error";
	content?: string;
	mimeType?: string;
	url?: string;
	error?: string;
} {
	const fs = getFs();
	const pathMod = getPath();
	if (!fs || !pathMod) {
		return { type: "error", error: "Node.js filesystem APIs are unavailable in this environment." };
	}

	try {
		const stat = fs.statSync(inputPath);
		if (stat.isDirectory()) {
			const listing = readDirectoryListing(inputPath);
			if (!listing) return { type: "error", error: "Failed to read directory." };
			return { type: "directory", content: listing.content, mimeType: "text/html", url: listing.url };
		}

		if (!isSupportedFile(inputPath)) {
			return {
				type: "error",
				error: `Unsupported file type. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`,
			};
		}

		const file = readLocalFile(inputPath);
		if (!file) return { type: "error", error: "Failed to read file." };
		return { type: "file", content: file.content, mimeType: file.mimeType, url: file.url };
	} catch (e) {
		return { type: "error", error: e instanceof Error ? e.message : String(e) };
	}
}

/** Minimal markdown to HTML for preview mode. */
function markdownToHtmlPreview(markdown: string, sourcePath: string): string {
	const escaped = markdown
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");

	const withCode = escaped.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
	const withHeaders = withCode
		.replace(/^### (.*)$/gm, "<h3>$1</h3>")
		.replace(/^## (.*)$/gm, "<h2>$1</h2>")
		.replace(/^# (.*)$/gm, "<h1>$1</h1>");
	const withParagraphs = withHeaders
		.split(/\n\n+/)
		.map((p) => (p.startsWith("<h") || p.startsWith("<pre") ? p : `<p>${p.replace(/\n/g, "<br>")}</p>`))
		.join("\n");

	return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<base href="${pathToFileUrl(sourcePath)}">
<title>Markdown Preview</title>
<style>
body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; line-height: 1.6; padding: 0 1rem; }
pre { background: #f4f4f5; padding: 1rem; overflow-x: auto; border-radius: 4px; }
code { font-family: ui-monospace, monospace; }
</style>
</head>
<body>${withParagraphs}</body>
</html>`;
}

function mimeForExtension(ext: string): string {
	const map: Record<string, string> = {
		".html": "text/html",
		".htm": "text/html",
		".svg": "image/svg+xml",
		".xml": "application/xml",
		".txt": "text/plain",
	};
	return map[ext] ?? "text/plain";
}

/** Create a blob URL from HTML content for iframe fallback loading. */
export function createBlobUrl(html: string, mimeType = "text/html"): string {
	const blob = new Blob([html], { type: mimeType });
	return URL.createObjectURL(blob);
}
