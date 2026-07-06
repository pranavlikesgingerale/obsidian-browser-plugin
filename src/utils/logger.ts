/**
 * Lightweight logger with plugin prefix for debugging.
 */
export class Logger {
	constructor(private readonly prefix: string) {}

	debug(message: string, ...args: unknown[]): void {
		console.debug(`[Local HTML Browser:${this.prefix}]`, message, ...args);
	}

	info(message: string, ...args: unknown[]): void {
		console.info(`[Local HTML Browser:${this.prefix}]`, message, ...args);
	}

	warn(message: string, ...args: unknown[]): void {
		console.warn(`[Local HTML Browser:${this.prefix}]`, message, ...args);
	}

	error(message: string, ...args: unknown[]): void {
		console.error(`[Local HTML Browser:${this.prefix}]`, message, ...args);
	}
}

export const mainLogger = new Logger("main");
