/** Minimal Node.js `fs` surface used by this plugin. */
export interface FsStat {
	isDirectory(): boolean;
}

export interface FsWatcher {
	close(): void;
}

export interface FsModule {
	readFileSync(path: string, encoding: "utf-8"): string;
	readFileSync(path: string): Buffer;
	statSync(path: string): FsStat;
	readdirSync(path: string): string[];
	watch(
		path: string,
		options: { recursive?: boolean },
		listener: (eventType: string, filename: string | Buffer | null) => void,
	): FsWatcher;
	watch(path: string, listener: (eventType: string, filename: string | Buffer | null) => void): FsWatcher;
}

/** Minimal Node.js `path` surface used by this plugin. */
export interface PathModule {
	extname(path: string): string;
	join(...paths: string[]): string;
	resolve(...paths: string[]): string;
	dirname(path: string): string;
	sep: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function hasFunction(obj: Record<string, unknown>, key: string): boolean {
	return typeof obj[key] === "function";
}

function readString(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

export function toFsModule(mod: unknown): FsModule | null {
	if (!isRecord(mod)) return null;
	if (!hasFunction(mod, "readFileSync") || !hasFunction(mod, "statSync")) return null;

	const readFileSync = mod.readFileSync as FsModule["readFileSync"];
	const statSync = mod.statSync as FsModule["statSync"];
	const readdirSync = mod.readdirSync as FsModule["readdirSync"];
	const watch = mod.watch as FsModule["watch"];

	if (!hasFunction(mod, "readdirSync") || !hasFunction(mod, "watch")) return null;

	return { readFileSync, statSync, readdirSync, watch };
}

export function toPathModule(mod: unknown): PathModule | null {
	if (!isRecord(mod)) return null;
	if (!hasFunction(mod, "join") || !hasFunction(mod, "resolve")) return null;

	const join = mod.join as PathModule["join"];
	const resolve = mod.resolve as PathModule["resolve"];
	const extname = mod.extname as PathModule["extname"];
	const dirname = mod.dirname as PathModule["dirname"];
	const sep = readString(mod.sep) ?? "/";

	if (!hasFunction(mod, "extname") || !hasFunction(mod, "dirname")) return null;

	return { join, resolve, extname, dirname, sep };
}

export function readProcessVersion(key: "electron" | "chrome" | "node"): string {
	try {
		const versions: unknown = process.versions;
		if (!isRecord(versions)) return "unknown";
		return readString(versions[key]) ?? "unknown";
	} catch {
		return "unknown";
	}
}
