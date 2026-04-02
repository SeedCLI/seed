import type { TerminalSession, TerminalSize } from "../types.js";

/**
 * Standard terminal session backed by process.stdin/stdout.
 * Manages raw mode, alternate screen, cursor, and resize events.
 */
export class StdTerminalSession implements TerminalSession {
	private disposed = false;
	private rawModeActive = false;
	private alternateScreenActive = false;
	private dataListeners = new Set<(input: Uint8Array) => void>();
	private resizeListeners = new Set<(size: TerminalSize) => void>();
	private resizeHandler: (() => void) | null = null;

	constructor(
		private stdin: NodeJS.ReadStream = process.stdin,
		private stdout: NodeJS.WriteStream = process.stdout,
	) {}

	size(): TerminalSize {
		return {
			columns: this.stdout.columns ?? 80,
			rows: this.stdout.rows ?? 24,
		};
	}

	write(data: string): void {
		if (this.disposed) return;
		this.stdout.write(data);
	}

	onData(cb: (input: Uint8Array) => void): () => void {
		const handler = (data: Buffer) => {
			cb(new Uint8Array(data));
		};
		this.dataListeners.add(cb);
		this.stdin.on("data", handler);

		return () => {
			this.dataListeners.delete(cb);
			this.stdin.off("data", handler);
		};
	}

	onResize(cb: (size: TerminalSize) => void): () => void {
		this.resizeListeners.add(cb);

		if (!this.resizeHandler) {
			this.resizeHandler = () => {
				const s = this.size();
				for (const listener of this.resizeListeners) {
					listener(s);
				}
			};
			this.stdout.on("resize", this.resizeHandler);
		}

		return () => {
			this.resizeListeners.delete(cb);
			if (this.resizeListeners.size === 0 && this.resizeHandler) {
				this.stdout.off("resize", this.resizeHandler);
				this.resizeHandler = null;
			}
		};
	}

	setRawMode(enabled: boolean): void {
		if (this.disposed) return;
		if (typeof this.stdin.setRawMode === "function") {
			this.stdin.setRawMode(enabled);
			this.rawModeActive = enabled;

			if (enabled) {
				this.stdin.resume();
			}
		}
	}

	enterAlternateScreen(): void {
		if (this.disposed || this.alternateScreenActive) return;
		this.write("\x1B[?1049h");
		this.alternateScreenActive = true;
	}

	exitAlternateScreen(): void {
		if (this.disposed || !this.alternateScreenActive) return;
		this.write("\x1B[?1049l");
		this.alternateScreenActive = false;
	}

	showCursor(show: boolean): void {
		if (this.disposed) return;
		this.write(show ? "\x1B[?25h" : "\x1B[?25l");
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;

		// Restore terminal state
		if (this.rawModeActive) {
			this.setRawMode(false);
		}
		if (this.alternateScreenActive) {
			this.exitAlternateScreen();
		}
		this.showCursor(true);

		// Remove all listeners
		if (this.resizeHandler) {
			this.stdout.off("resize", this.resizeHandler);
			this.resizeHandler = null;
		}
		this.dataListeners.clear();
		this.resizeListeners.clear();
	}
}
