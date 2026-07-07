/** Minimal Node.js `fs` surface used by this plugin. */
export interface FsStat {
	isDirectory(): boolean;
}

export interface FsWatcher {
	close(): void;
}

type WatchListener = (eventType: string, filename: string | null) => void;

export interface FsModule {
	readFileSync(path: string, encoding: "utf-8"): string;
	readFileSync(path: string): string;
	statSync(path: string): FsStat;
	readdirSync(path: string): string[];
	watch(path: string, options: { recursive?: boolean }, listener: WatchListener): FsWatcher;
	watch(path: string, listener: WatchListener): FsWatcher;
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
	const result: unknown = Reflect.apply(fn, mod, args);
	return result;
}

function toUtf8String(value: unknown): string {
	if (typeof value === "string") {
		return value;
	}
	if (value instanceof Uint8Array) {
		return new TextDecoder().decode(value);
	}
	throw new Error("Expected string or Uint8Array from fs.readFileSync.");
}

function toWatchFilename(value: unknown): string | null {
	if (value === null || value === undefined) {
		return null;
	}
	if (typeof value === "string") {
		return value;
	}
	if (value instanceof Uint8Array) {
		return new TextDecoder().decode(value);
	}
	return null;
}

function toWatcher(value: unknown): FsWatcher {
	if (!isRecord(value) || typeof value.close !== "function") {
		throw new Error("Invalid fs.watch result.");
	}
	const closeFn = value.close;
	return {
		close: (): void => {
			if (typeof closeFn !== "function") {
				throw new Error("Invalid fs.watch close handler.");
			}
			Reflect.apply(closeFn, value, []);
		},
	};
}

function toStat(value: unknown): FsStat {
	if (!isRecord(value) || typeof value.isDirectory !== "function") {
		throw new Error("Invalid fs.statSync result.");
	}
	const isDirectoryFn = value.isDirectory;
	return {
		isDirectory(): boolean {
			if (typeof isDirectoryFn !== "function") {
				return false;
			}
			const result: unknown = Reflect.apply(isDirectoryFn, value, []);
			return Boolean(result);
		},
	};
}

function wrapWatchListener(listener: WatchListener): (eventType: unknown, filename: unknown) => void {
	return (eventType: unknown, filename: unknown) => {
		const event = typeof eventType === "string" ? eventType : String(eventType);
		listener(event, toWatchFilename(filename));
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
	function readFileSync(path: string): string;
	function readFileSync(path: string, encoding?: "utf-8"): string {
		if (encoding) {
			const result = callMethod(fsRecord, "readFileSync", [path, encoding]);
			if (typeof result !== "string") {
				throw new Error("Expected string from fs.readFileSync.");
			}
			return result;
		}
		return toUtf8String(callMethod(fsRecord, "readFileSync", [path]));
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
			optionsOrListener: { recursive?: boolean } | WatchListener,
			listener?: WatchListener,
		): FsWatcher {
			const result =
				typeof optionsOrListener === "function"
					? callMethod(fsRecord, "watch", [path, wrapWatchListener(optionsOrListener)])
					: callMethod(fsRecord, "watch", [
							path,
							optionsOrListener,
							wrapWatchListener(listener ?? (() => undefined)),
						]);
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

	const pathRecord: Record<string, unknown> = mod;

	return {
		extname(path: string): string {
			const result = callMethod(pathRecord, "extname", [path]);
			return typeof result === "string" ? result : "";
		},
		join(...paths: string[]): string {
			const result = callMethod(pathRecord, "join", paths);
			return typeof result === "string" ? result : paths.join("/");
		},
		resolve(...paths: string[]): string {
			const result = callMethod(pathRecord, "resolve", paths);
			return typeof result === "string" ? result : paths.join("/");
		},
		dirname(path: string): string {
			const result = callMethod(pathRecord, "dirname", [path]);
			return typeof result === "string" ? result : path;
		},
		sep: readString(pathRecord.sep) ?? "/",
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

export function formatWatchFilename(filename: string | Uint8Array | null | undefined, fallback: string): string {
	if (typeof filename === "string") return filename;
	if (filename instanceof Uint8Array) return new TextDecoder().decode(filename);
	return fallback;
}
