/**
 * Virtual clock for deterministic timer/animation tests.
 *
 * Replaces setTimeout/setInterval with controllable alternatives
 * that can be manually advanced. This prevents flaky tests and
 * enables exact control over timing behavior.
 */

interface PendingTimer {
	id: number;
	callback: () => void;
	fireAt: number;
	interval: number | null; // null = timeout, number = interval period
}

export class VirtualClock {
	private currentTime = 0;
	private nextId = 1;
	private timers: PendingTimer[] = [];
	private installed = false;

	// Saved real implementations
	private realSetTimeout: typeof globalThis.setTimeout | null = null;
	private realClearTimeout: typeof globalThis.clearTimeout | null = null;
	private realSetInterval: typeof globalThis.setInterval | null = null;
	private realClearInterval: typeof globalThis.clearInterval | null = null;

	/** Current virtual time in milliseconds. */
	get now(): number {
		return this.currentTime;
	}

	/** Number of pending timers. */
	get pendingCount(): number {
		return this.timers.length;
	}

	/**
	 * Install the virtual clock, replacing global timer functions.
	 * Call uninstall() when done to restore originals.
	 */
	install(): void {
		if (this.installed) return;
		this.installed = true;

		this.realSetTimeout = globalThis.setTimeout;
		this.realClearTimeout = globalThis.clearTimeout;
		this.realSetInterval = globalThis.setInterval;
		this.realClearInterval = globalThis.clearInterval;

		globalThis.setTimeout = ((callback: () => void, ms?: number) => {
			return this.addTimer(callback, ms ?? 0, null);
		}) as typeof globalThis.setTimeout;

		globalThis.clearTimeout = ((id: number) => {
			this.removeTimer(id);
		}) as typeof globalThis.clearTimeout;

		globalThis.setInterval = ((callback: () => void, ms?: number) => {
			return this.addTimer(callback, ms ?? 0, ms ?? 0);
		}) as typeof globalThis.setInterval;

		globalThis.clearInterval = ((id: number) => {
			this.removeTimer(id);
		}) as typeof globalThis.clearInterval;
	}

	/** Restore original timer functions. */
	uninstall(): void {
		if (!this.installed) return;
		this.installed = false;
		this.timers.length = 0;
		this.currentTime = 0;

		if (this.realSetTimeout) globalThis.setTimeout = this.realSetTimeout;
		if (this.realClearTimeout) globalThis.clearTimeout = this.realClearTimeout;
		if (this.realSetInterval) globalThis.setInterval = this.realSetInterval;
		if (this.realClearInterval) globalThis.clearInterval = this.realClearInterval;
	}

	/**
	 * Advance time by the given number of milliseconds.
	 * Fires all timers that would have triggered in this period,
	 * in chronological order.
	 */
	advance(ms: number): void {
		const target = this.currentTime + ms;

		while (this.timers.length > 0) {
			// Sort by fireAt to process in order
			this.timers.sort((a, b) => a.fireAt - b.fireAt);
			const next = this.timers[0];
			if (next.fireAt > target) break;

			this.currentTime = next.fireAt;

			if (next.interval !== null) {
				// Reschedule interval
				next.fireAt += next.interval;
			} else {
				// Remove timeout
				this.timers.shift();
			}

			next.callback();
		}

		this.currentTime = target;
	}

	/**
	 * Advance to the next scheduled timer and fire it.
	 * Returns the number of milliseconds advanced, or 0 if no timers.
	 */
	tick(): number {
		if (this.timers.length === 0) return 0;

		this.timers.sort((a, b) => a.fireAt - b.fireAt);
		const next = this.timers[0];
		const delta = next.fireAt - this.currentTime;
		this.advance(delta);
		return delta;
	}

	/**
	 * Fire all pending timers immediately regardless of their scheduled time.
	 * Useful for cleanup in tests.
	 */
	flush(): void {
		const maxIterations = 1000;
		let iterations = 0;
		while (this.timers.length > 0 && iterations < maxIterations) {
			this.tick();
			iterations++;
		}
	}

	/** Schedule a timeout (used internally by the installed setTimeout). */
	private addTimer(callback: () => void, ms: number, interval: number | null): number {
		const id = this.nextId++;
		this.timers.push({
			id,
			callback,
			fireAt: this.currentTime + ms,
			interval,
		});
		return id;
	}

	/** Cancel a timer by ID. */
	private removeTimer(id: number): void {
		const idx = this.timers.findIndex((t) => t.id === id);
		if (idx !== -1) this.timers.splice(idx, 1);
	}
}

/**
 * Create and install a virtual clock.
 * Returns the clock instance and a cleanup function.
 */
export function createVirtualClock(): { clock: VirtualClock; cleanup: () => void } {
	const clock = new VirtualClock();
	clock.install();
	return { clock, cleanup: () => clock.uninstall() };
}
