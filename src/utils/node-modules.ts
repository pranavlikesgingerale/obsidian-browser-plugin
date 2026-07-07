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

function callMethod(mod: Record<string, unknown>, key: string, args: unknown[]): unknown {
	const fn = mod[key];
	if (typeof fn !== "function") {
		throw new Error(`Expected ${key} to be a function.`);
	}
	return fn.apply(mod, args) as unknown;
}

function toWatcher(value: unknown): FsWatcher {
	if (!isRecord(value) || typeof value.close !== "function") {
		throw new Error("Invalid fs.watch result.");
	}
	return {
		close: (): void => {
			(value.close as () => void).call(value);
		},
	};
}

function toStat(value: unknown): FsStat {
	if (!isRecord(value) || typeof value.isDirectory !== "function") {
		throw new Error("Invalid fs.statSync result.");
	}
	const isDirectoryFn = value.isDirectory as () => unknown;
	return {
		isDirectory(): boolean {
			return Boolean(isDirectoryFn.call(value));
		},
	};
}

export function toFsModule(mod: unknown): FsModule | null {
	if (!isRecord(mod)) return null;
	if (
		!hasFunction(mod, "readFileSync") ||
		!hasFunction(mod, "statSync") ||
		!hasFunction(mod, "readdirSync") ||
		!hasFunction(mod, "watch")
	) {
		return null;
	}

	const fsRecord: Record<string, unknown> = mod;

	function readFileSync(path: string, encoding: "utf-8"): string;
	function readFileSync(path: string): Buffer;
	function readFileSync(path: string, encoding?: "utf-8"): string | Buffer {
		if (encoding) {
			const result = callMethod(fsRecord, "readFileSync", [path, encoding]);
			if (typeof result !== "string") {
				throw new Error("Expected string from fs.readFileSync.");
			}
			return result;
		}
		const result = callMethod(fsRecord, "readFileSync", [path]);
		if (typeof result !== "object" || result === null || !Buffer.isBuffer(result)) {
			throw new Error("Expected Buffer from fs.readFileSync.");
		}
		return result;
	}

	return {
		readFileSync,
		statSync(path: string): FsStat {
			return toStat(callMethod(fsRecord, "statSync", [path]));
		},
		readdirSync(path: string): string[] {
			const result = callMethod(fsRecord, "readdirSync", [path]);
			if (!Array.isArray(result)) return [];
			return result.filter((entry): entry is string => typeof entry === "string");
		},
		watch(
			path: string,
			optionsOrListener:
				| { recursive?: boolean }
				| ((eventType: string, filename: string | Buffer | null) => void),
			listener?: (eventType: string, filename: string | Buffer | null) => void,
		): FsWatcher {
			const result =
				typeof optionsOrListener === "function"
					? callMethod(fsRecord, "watch", [path, optionsOrListener])
					: callMethod(fsRecord, "watch", [path, optionsOrListener, listener]);
			return toWatcher(result);
		},
	};
}

export function toPathModule(mod: unknown): PathModule | null {
	if (!isRecord(mod)) return null;
	if (
		!hasFunction(mod, "join") ||
		!hasFunction(mod, "resolve") ||
		!hasFunction(mod, "extname") ||
		!hasFunction(mod, "dirname")
	) {
		return null;
	}

	return {
		extname(path: string): string {
			const result = callMethod(mod, "extname", [path]);
			return typeof result === "string" ? result : "";
		},
		join(...paths: string[]): string {
			const result = callMethod(mod, "join", paths);
			return typeof result === "string" ? result : paths.join("/");
		},
		resolve(...paths: string[]): string {
			const result = callMethod(mod, "resolve", paths);
			return typeof result === "string" ? result : paths.join("/");
		},
		dirname(path: string): string {
			const result = callMethod(mod, "dirname", [path]);
			return typeof result === "string" ? result : path;
		},
		sep: readString(mod.sep) ?? "/",
	};
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

export function formatWatchFilename(filename: string | Buffer | null | undefined, fallback: string): string {
	if (typeof filename === "string") return filename;
	if (Buffer.isBuffer(filename)) return filename.toString("utf-8");
	return fallback;
}
