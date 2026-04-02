import { appendChild, createNode } from "@seedcli/tui-core";
import { describe, expect, test } from "vitest";
import { countDirtyNodes, countNodes, createDebugOverlay, FpsCounter } from "../src/debug.js";

describe("createDebugOverlay", () => {
	test("creates a hidden overlay node", () => {
		const overlay = createDebugOverlay();
		expect(overlay.node.type).toBe("box");
		expect(overlay.node.props.visible).toBe(false);
		expect(overlay.visible).toBe(false);
	});

	test("toggle shows and hides overlay", () => {
		const overlay = createDebugOverlay();
		expect(overlay.visible).toBe(false);

		overlay.toggle();
		expect(overlay.visible).toBe(true);
		expect(overlay.node.props.visible).toBe(true);

		overlay.toggle();
		expect(overlay.visible).toBe(false);
		expect(overlay.node.props.visible).toBe(false);
	});

	test("update changes displayed values", () => {
		const overlay = createDebugOverlay();
		overlay.toggle(); // must be visible to update

		overlay.update({
			fps: 30,
			dirtyNodes: 5,
			focusedId: "input-1",
			renderMs: 8.5,
			layoutMs: 2.1,
			nodeCount: 42,
		});

		// Check child text contents updated
		const texts = overlay.node.children.map((c) => c.content);
		expect(texts.some((t) => t?.includes("30"))).toBe(true);
		expect(texts.some((t) => t?.includes("input-1"))).toBe(true);
	});

	test("update is no-op when hidden", () => {
		const overlay = createDebugOverlay();
		// Should not throw even though overlay is hidden
		overlay.update({
			fps: 60,
			dirtyNodes: 0,
			focusedId: null,
			renderMs: 0,
			layoutMs: 0,
			nodeCount: 0,
		});
	});
});

describe("FpsCounter", () => {
	test("returns 0 fps with no frames", () => {
		const counter = new FpsCounter();
		expect(counter.fps).toBe(0);
	});

	test("returns 0 fps with single frame", () => {
		const counter = new FpsCounter();
		counter.frame();
		expect(counter.fps).toBe(0);
	});

	test("reset clears all data", () => {
		const counter = new FpsCounter();
		counter.frame();
		counter.frame();
		counter.reset();
		expect(counter.fps).toBe(0);
	});
});

describe("countDirtyNodes", () => {
	test("counts dirty nodes in tree", () => {
		const root = createNode("column", {});
		const a = createNode("text", {}, [], "A");
		const b = createNode("text", {}, [], "B");
		appendChild(root, a);
		appendChild(root, b);

		// All nodes are dirty after creation
		expect(countDirtyNodes(root)).toBe(3);

		// Clear dirty on one
		a.dirty = false;
		expect(countDirtyNodes(root)).toBe(2);
	});
});

describe("countNodes", () => {
	test("counts all nodes including root", () => {
		const root = createNode("column", {});
		const a = createNode("text", {}, [], "A");
		const b = createNode("row", {});
		const c = createNode("text", {}, [], "C");
		appendChild(root, a);
		appendChild(root, b);
		appendChild(b, c);

		expect(countNodes(root)).toBe(4);
	});

	test("counts single node as 1", () => {
		const node = createNode("text", {});
		expect(countNodes(node)).toBe(1);
	});
});
