/**
 * Lightweight logger for warnings and errors only.
 */
export class Logger {
	constructor(private readonly prefix: string) {}

	warn(message: string, ...args: unknown[]): void {
		console.warn(`[Local HTML Browser:${this.prefix}]`, message, ...args);
	}

	error(message: string, ...args: unknown[]): void {
		console.error(`[Local HTML Browser:${this.prefix}]`, message, ...args);
	}
}
