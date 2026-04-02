import { describe, expect, test, beforeEach } from "vitest";
import { createNode, appendChild, resetIdCounter } from "../src/tree/node.js";
import { computeLayout } from "../src/layout/engine.js";

beforeEach(() => {
	resetIdCounter();
});

describe("computeLayout", () => {
	test("computes layout for a single text node", () => {
		const node = createNode("text", { width: 20, height: 3 }, [], "hello");
		computeLayout(node, 80, 24);

		expect(node.layout.x).toBe(0);
		expect(node.layout.y).toBe(0);
		expect(node.layout.width).toBe(20);
		expect(node.layout.height).toBe(3);
	});

	test("fills available space by default", () => {
		const node = createNode("box");
		computeLayout(node, 80, 24);

		expect(node.layout.width).toBe(80);
		expect(node.layout.height).toBe(24);
	});

	test("lays out row children horizontally", () => {
		const parent = createNode("row", { width: 80, height: 10 });
		const a = createNode("text", { width: 20 }, [], "a");
		const b = createNode("text", { width: 30 }, [], "b");
		appendChild(parent, a);
		appendChild(parent, b);

		computeLayout(parent, 80, 24);

		expect(a.layout.x).toBe(0);
		expect(b.layout.x).toBe(20);
	});

	test("distributes fill width equally in rows", () => {
		const parent = createNode("row", { width: 60, height: 10 });
		const a = createNode("text", { width: "fill" }, [], "a");
		const b = createNode("text", { width: "fill" }, [], "b");
		appendChild(parent, a);
		appendChild(parent, b);

		computeLayout(parent, 60, 10);

		expect(a.layout.width).toBe(30);
		expect(b.layout.width).toBe(30);
	});

	test("lays out column children vertically", () => {
		const parent = createNode("column", { width: 80, height: 10 });
		const a = createNode("text", { height: 3 }, [], "a");
		const b = createNode("text", { height: 3 }, [], "b");
		appendChild(parent, a);
		appendChild(parent, b);

		computeLayout(parent, 80, 24);

		expect(a.layout.y).toBe(0);
		expect(b.layout.y).toBe(3);
	});

	test("respects gap in columns", () => {
		const parent = createNode("column", { width: 80, height: 20, gap: 2 });
		const a = createNode("text", { height: 3 }, [], "a");
		const b = createNode("text", { height: 3 }, [], "b");
		appendChild(parent, a);
		appendChild(parent, b);

		computeLayout(parent, 80, 24);

		expect(a.layout.y).toBe(0);
		expect(b.layout.y).toBe(5); // 3 (a height) + 2 (gap)
	});

	test("respects gap in rows", () => {
		const parent = createNode("row", { width: 80, height: 10, gap: 2 });
		const a = createNode("text", { width: 20 }, [], "a");
		const b = createNode("text", { width: 20 }, [], "b");
		appendChild(parent, a);
		appendChild(parent, b);

		computeLayout(parent, 80, 24);

		expect(a.layout.x).toBe(0);
		expect(b.layout.x).toBe(22); // 20 (a width) + 2 (gap)
	});

	test("respects min/max constraints", () => {
		const node = createNode("box", { width: 10, minWidth: 20, maxHeight: 5, height: 100 });
		computeLayout(node, 80, 24);

		expect(node.layout.width).toBe(20);
		expect(node.layout.height).toBe(5);
	});

	test("handles percentage sizes", () => {
		const node = createNode("box", { width: "50%" as `${number}%`, height: "25%" as `${number}%` });
		computeLayout(node, 80, 24);

		expect(node.layout.width).toBe(40);
		expect(node.layout.height).toBe(6);
	});

	test("invisible nodes get zero dimensions", () => {
		const node = createNode("box", { width: 40, height: 10, visible: false });
		computeLayout(node, 80, 24);

		expect(node.layout.width).toBe(0);
		expect(node.layout.height).toBe(0);
	});
});
