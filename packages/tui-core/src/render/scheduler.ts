import type { Frame, RenderMode } from "../types.js";

export interface SchedulerOptions {
	renderMode: RenderMode;
	fpsCap: number;
}

/**
 * Render scheduler.
 * Coalesces state updates and enforces frame budget.
 *
 * In "auto" mode, uses microtask batching + FPS cap.
 * In "manual" mode, only renders on explicit `requestRender()`.
 */
export class RenderScheduler {
	private dirty = false;
	private rendering = false;
	private frameTimer: ReturnType<typeof setTimeout> | null = null;
	private revision = 0;
	private lastFrameTime = 0;
	private renderCallback: (() => Frame | null) | null = null;
	private flushCallback: ((frame: Frame) => void) | null = null;
	private mode: RenderMode;
	private minFrameInterval: number;
	private stopped = false;

	constructor(options: SchedulerOptions) {
		this.mode = options.renderMode;
		this.minFrameInterval = Math.floor(1000 / options.fpsCap);
	}

	/**
	 * Set the render function that produces a new frame.
	 */
	onRender(cb: () => Frame | null): void {
		this.renderCallback = cb;
	}

	/**
	 * Set the flush function that writes a frame to the terminal.
	 */
	onFlush(cb: (frame: Frame) => void): void {
		this.flushCallback = cb;
	}

	/**
	 * Mark the tree as needing a re-render.
	 * In auto mode, schedules a render on the next microtask (coalesced).
	 * In manual mode, sets dirty flag only.
	 */
	invalidate(): void {
		if (this.stopped) return;
		this.dirty = true;

		if (this.mode === "auto") {
			this.scheduleFrame();
		}
	}

	/**
	 * Request an immediate render (for manual mode).
	 */
	requestRender(): void {
		if (this.stopped) return;
		this.dirty = true;
		this.doRender();
	}

	/**
	 * Get the current revision number.
	 */
	currentRevision(): number {
		return this.revision;
	}

	/**
	 * Stop the scheduler.
	 */
	stop(): void {
		this.stopped = true;
		if (this.frameTimer) {
			clearTimeout(this.frameTimer);
			this.frameTimer = null;
		}
	}

	private scheduleFrame(): void {
		if (this.frameTimer || this.rendering) return;

		const now = Date.now();
		const elapsed = now - this.lastFrameTime;
		const delay = Math.max(0, this.minFrameInterval - elapsed);

		this.frameTimer = setTimeout(() => {
			this.frameTimer = null;
			this.doRender();
		}, delay);
	}

	private doRender(): void {
		if (this.stopped || this.rendering || !this.dirty) return;
		if (!this.renderCallback || !this.flushCallback) return;

		this.rendering = true;
		this.dirty = false;
		this.revision++;

		try {
			const frame = this.renderCallback();
			if (frame) {
				frame.revision = this.revision;
				this.flushCallback(frame);
			}
		} finally {
			this.rendering = false;
			this.lastFrameTime = Date.now();

			// If dirtied during render, schedule another frame
			if (this.dirty && this.mode === "auto") {
				this.scheduleFrame();
			}
		}
	}
}
