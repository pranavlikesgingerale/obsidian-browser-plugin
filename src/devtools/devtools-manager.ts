import type { ConsoleMessage } from "../types";
import { Logger } from "../utils/logger";

const log = new Logger("devtools");

/**
 * Manages DevTools integration and console log forwarding.
 */
export class DevToolsManager {
	private consoleMessages: ConsoleMessage[] = [];
	private readonly maxMessages = 200;

	constructor(private forwardToObsidian: boolean) {}

	handleConsoleMessage(msg: ConsoleMessage): void {
		this.consoleMessages.unshift(msg);
		if (this.consoleMessages.length > this.maxMessages) {
			this.consoleMessages.pop();
		}

		if (this.forwardToObsidian) {
			const prefix = `[Browser Console:${msg.level}] ${msg.source}:${msg.line}`;
			switch (msg.level) {
				case "error":
					log.error(prefix, msg.message);
					break;
				case "warn":
					log.warn(prefix, msg.message);
					break;
				default:
					break;
			}
		}
	}

	getConsoleMessages(): ConsoleMessage[] {
		return [...this.consoleMessages];
	}

	clearConsole(): void {
		this.consoleMessages = [];
	}

	setForwardLogs(enabled: boolean): void {
		this.forwardToObsidian = enabled;
	}
}
