import { describe, test, expect, afterEach } from "vitest";
import { VirtualClock, createVirtualClock } from "../src/testing/clock.js";

describe("VirtualClock", () => {
	let clock: VirtualClock;

	afterEach(() => {
		clock?.uninstall();
	});

	test("starts at time zero", () => {
		clock = new VirtualClock();
		clock.install();
		expect(clock.now).toBe(0);
	});

	test("advance moves time forward", () => {
		clock = new VirtualClock();
		clock.install();
		clock.advance(100);
		expect(clock.now).toBe(100);
	});

	test("setTimeout fires after advance", () => {
		clock = new VirtualClock();
		clock.install();

		let fired = false;
		setTimeout(() => { fired = true; }, 50);

		clock.advance(25);
		expect(fired).toBe(false);

		clock.advance(25);
		expect(fired).toBe(true);
	});

	test("setTimeout does not fire early", () => {
		clock = new VirtualClock();
		clock.install();

		let fired = false;
		setTimeout(() => { fired = true; }, 100);

		clock.advance(99);
		expect(fired).toBe(false);
	});

	test("clearTimeout cancels timer", () => {
		clock = new VirtualClock();
		clock.install();

		let fired = false;
		const id = setTimeout(() => { fired = true; }, 50);
		clearTimeout(id);

		clock.advance(100);
		expect(fired).toBe(false);
	});

	test("setInterval fires repeatedly", () => {
		clock = new VirtualClock();
		clock.install();

		let count = 0;
		setInterval(() => { count++; }, 100);

		clock.advance(350);
		expect(count).toBe(3);
	});

	test("clearInterval stops repeating", () => {
		clock = new VirtualClock();
		clock.install();

		let count = 0;
		const id = setInterval(() => { count++; }, 100);

		clock.advance(250);
		expect(count).toBe(2);

		clearInterval(id);
		clock.advance(200);
		expect(count).toBe(2);
	});

	test("tick advances to next timer", () => {
		clock = new VirtualClock();
		clock.install();

		let fired = false;
		setTimeout(() => { fired = true; }, 75);

		const delta = clock.tick();
		expect(delta).toBe(75);
		expect(fired).toBe(true);
		expect(clock.now).toBe(75);
	});

	test("tick returns 0 when no timers", () => {
		clock = new VirtualClock();
		clock.install();

		expect(clock.tick()).toBe(0);
	});

	test("flush fires all pending timers", () => {
		clock = new VirtualClock();
		clock.install();

		const order: number[] = [];
		setTimeout(() => order.push(1), 10);
		setTimeout(() => order.push(2), 20);
		setTimeout(() => order.push(3), 30);

		clock.flush();
		expect(order).toEqual([1, 2, 3]);
	});

	test("pendingCount tracks timers", () => {
		clock = new VirtualClock();
		clock.install();

		expect(clock.pendingCount).toBe(0);

		setTimeout(() => {}, 100);
		setTimeout(() => {}, 200);
		expect(clock.pendingCount).toBe(2);

		clock.advance(150);
		expect(clock.pendingCount).toBe(1);
	});

	test("uninstall restores real timers", () => {
		const realSetTimeout = globalThis.setTimeout;
		clock = new VirtualClock();
		clock.install();

		expect(globalThis.setTimeout).not.toBe(realSetTimeout);
		clock.uninstall();
		expect(globalThis.setTimeout).toBe(realSetTimeout);
	});

	test("multiple timeouts in correct order", () => {
		clock = new VirtualClock();
		clock.install();

		const order: string[] = [];
		setTimeout(() => order.push("second"), 200);
		setTimeout(() => order.push("first"), 100);
		setTimeout(() => order.push("third"), 300);

		clock.advance(350);
		expect(order).toEqual(["first", "second", "third"]);
	});
});

describe("createVirtualClock", () => {
	test("returns clock and cleanup function", () => {
		const { clock, cleanup } = createVirtualClock();
		expect(clock).toBeInstanceOf(VirtualClock);
		expect(clock.now).toBe(0);
		cleanup();
	});
});
