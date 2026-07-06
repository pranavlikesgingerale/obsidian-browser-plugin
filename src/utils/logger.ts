/**
 * Lightweight logger with plugin prefix for debugging.
 */
export class Logger {
	constructor(private readonly prefix: string) {}

	debug(message: string, ...args: unknown[]): void {
		console.debug(`[Obsidian Browser:${this.prefix}]`, message, ...args);
	}

	info(message: string, ...args: unknown[]): void {
		console.info(`[Obsidian Browser:${this.prefix}]`, message, ...args);
	}

	warn(message: string, ...args: unknown[]): void {
		console.warn(`[Obsidian Browser:${this.prefix}]`, message, ...args);
	}

	error(message: string, ...args: unknown[]): void {
		console.error(`[Obsidian Browser:${this.prefix}]`, message, ...args);
	}
}

export const mainLogger = new Logger("main");
