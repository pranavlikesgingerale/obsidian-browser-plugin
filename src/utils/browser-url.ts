/** URLs worth storing in history or session restore. */
export function isPersistableBrowserUrl(url: string): boolean {
	if (!url || url === "about:blank") return false;
	if (url.startsWith("blob:") || url.startsWith("data:")) return false;
	return true;
}
