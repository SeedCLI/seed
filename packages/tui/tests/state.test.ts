import { describe, expect, test } from "vitest";
import { createComputed, createEffect, createSignal, createStore } from "../src/state.js";

describe("createSignal", () => {
	test("returns initial value", () => {
		const [get] = createSignal(42);
		expect(get()).toBe(42);
	});

	test("updates value", () => {
		const [get, set] = createSignal(0);
		set(10);
		expect(get()).toBe(10);
	});

	test("notifies subscribers", () => {
		const [get, set] = createSignal(0);
		const values: number[] = [];

		(get as { _subscribe?: (cb: (v: number) => void) => () => void })._subscribe?.((v) =>
			values.push(v),
		);

		set(1);
		set(2);
		expect(values).toEqual([1, 2]);
	});

	test("skips no-op updates", () => {
		const [get, set] = createSignal(5);
		let callCount = 0;
		(get as { _subscribe?: (cb: (v: number) => void) => () => void })._subscribe?.(
			() => callCount++,
		);

		set(5); // same value
		expect(callCount).toBe(0);
	});
});

describe("createComputed", () => {
	test("computes derived value", () => {
		const [a] = createSignal(2);
		const [b] = createSignal(3);
		const sum = createComputed(() => a() + b(), [a, b]);
		expect(sum()).toBe(5);
	});

	test("recomputes on dependency change", () => {
		const [a, setA] = createSignal(2);
		const [b] = createSignal(3);
		const sum = createComputed(() => a() + b(), [a, b]);

		setA(10);
		expect(sum()).toBe(13);
	});
});

describe("createEffect", () => {
	test("runs immediately", () => {
		let ran = false;
		createEffect(() => {
			ran = true;
		}, []);
		expect(ran).toBe(true);
	});

	test("re-runs on dependency change", () => {
		const [count, setCount] = createSignal(0);
		const values: number[] = [];

		createEffect(() => {
			values.push(count());
		}, [count]);

		setCount(1);
		setCount(2);
		expect(values).toEqual([0, 1, 2]);
	});

	test("cleans up on dispose", () => {
		const [count, setCount] = createSignal(0);
		let runs = 0;
		const dispose = createEffect(() => {
			runs++;
		}, [count]);

		setCount(1);
		expect(runs).toBe(2);

		dispose();
		setCount(2);
		expect(runs).toBe(2); // no more runs
	});
});

describe("createStore", () => {
	test("get/set values", () => {
		const store = createStore({ name: "test", count: 0 });
		expect(store.get("name")).toBe("test");

		store.set("count", 5);
		expect(store.get("count")).toBe(5);
	});

	test("subscribe to key changes", () => {
		const store = createStore({ x: 0 });
		const values: number[] = [];
		store.subscribe("x", (v) => values.push(v));

		store.set("x", 1);
		store.set("x", 2);
		expect(values).toEqual([1, 2]);
	});

	test("snapshot returns copy", () => {
		const store = createStore({ a: 1, b: 2 });
		const snap = store.snapshot();
		expect(snap).toEqual({ a: 1, b: 2 });

		store.set("a", 99);
		expect(snap.a).toBe(1); // snapshot unchanged
	});
});
