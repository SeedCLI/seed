import type { TerminalSession, TerminalSize } from "../types.js";

/**
 * In-memory terminal session for deterministic testing.
 * Captures all output and allows simulating input/resize events.
 */
export class MemoryTerminalSession implements TerminalSession {
	private disposed = false;
	private _size: TerminalSize;
	private _rawMode = false;
	private _alternateScreen = false;
	private _cursorVisible = true;
	private dataHandlers = new Set<(input: Uint8Array) => void>();
	private resizeHandlers = new Set<(size: TerminalSize) => void>();

	/** All data written to the terminal stream. */
	readonly output: string[] = [];

	/** Full concatenated output. */
	get outputText(): string {
		return this.output.join("");
	}

	get rawMode(): boolean {
		return this._rawMode;
	}

	get alternateScreen(): boolean {
		return this._alternateScreen;
	}

	get cursorVisible(): boolean {
		return this._cursorVisible;
	}

	constructor(columns = 80, rows = 24) {
		this._size = { columns, rows };
	}

	size(): TerminalSize {
		return { ...this._size };
	}

	write(data: string): void {
		if (this.disposed) return;
		this.output.push(data);
	}

	onData(cb: (input: Uint8Array) => void): () => void {
		this.dataHandlers.add(cb);
		return () => {
			this.dataHandlers.delete(cb);
		};
	}

	onResize(cb: (size: TerminalSize) => void): () => void {
		this.resizeHandlers.add(cb);
		return () => {
			this.resizeHandlers.delete(cb);
		};
	}

	setRawMode(enabled: boolean): void {
		this._rawMode = enabled;
	}

	enterAlternateScreen(): void {
		if (this._alternateScreen) return;
		this._alternateScreen = true;
		this.write("\x1B[?1049h");
	}

	exitAlternateScreen(): void {
		if (!this._alternateScreen) return;
		this._alternateScreen = false;
		this.write("\x1B[?1049l");
	}

	showCursor(show: boolean): void {
		this._cursorVisible = show;
		this.write(show ? "\x1B[?25h" : "\x1B[?25l");
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.dataHandlers.clear();
		this.resizeHandlers.clear();
	}

	// ─── Test Simulation Methods ───

	/** Simulate keyboard input. */
	simulateInput(data: Uint8Array | string): void {
		const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
		for (const handler of this.dataHandlers) {
			handler(bytes);
		}
	}

	/** Simulate terminal resize. */
	simulateResize(columns: number, rows: number): void {
		const _previous = { ...this._size };
		this._size = { columns, rows };
		for (const handler of this.resizeHandlers) {
			handler(this._size);
		}
	}

	/** Clear captured output. */
	clearOutput(): void {
		this.output.length = 0;
	}
}
