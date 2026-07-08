/** Cross-version `instanceOf` — Obsidian 1.13+ API with instanceof fallback. */
export function nodeInstanceOf<T extends abstract new (...args: never[]) => object>(
	node: unknown,
	type: T,
): node is InstanceType<T> {
	if (node && typeof node === "object" && "instanceOf" in node) {
		const check = (node as { instanceOf?: (ctor: unknown) => boolean }).instanceOf;
		if (typeof check === "function") {
			return Boolean(check.call(node, type));
		}
	}
	return node instanceof type;
}

/** Apply dynamic CSS props when setCssProps is available. */
export function setElementCssProps(
	el: HTMLElement,
	props: Record<string, string>,
): void {
	if (typeof el.setCssProps === "function") {
		el.setCssProps(props);
	}
}
