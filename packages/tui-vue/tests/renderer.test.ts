import type { TuiNode } from "@seedcli/tui-core";
import { describe, expect, test } from "vitest";
import { hostConfig } from "../src/renderer.js";

describe("Vue TUI Renderer — Host Config", () => {
	// ─── createElement ───

	test("creates element by tui-prefixed tag", () => {
		const node = hostConfig.createElement("tui-box", false, undefined, null);
		expect(node.type).toBe("box");
	});

	test("creates element by short alias", () => {
		const node = hostConfig.createElement("row", false, undefined, null);
		expect(node.type).toBe("row");
	});

	test("maps all known tui-* tags correctly", () => {
		expect(hostConfig.createElement("tui-text", false, undefined, null).type).toBe("text");
		expect(hostConfig.createElement("tui-column", false, undefined, null).type).toBe("column");
		expect(hostConfig.createElement("tui-spacer", false, undefined, null).type).toBe("spacer");
		expect(hostConfig.createElement("tui-component", false, undefined, null).type).toBe(
			"component",
		);
	});

	test("unknown tag falls back to box", () => {
		const node = hostConfig.createElement("unknown-thing", false, undefined, null);
		expect(node.type).toBe("box");
	});

	// ─── createText ───

	test("creates text node with content", () => {
		const node = hostConfig.createText("hello");
		expect(node.type).toBe("text");
		expect(node.content).toBe("hello");
	});

	// ─── createComment ───

	test("creates invisible comment node", () => {
		const node = hostConfig.createComment("vue comment");
		expect(node.type).toBe("text");
		expect(node.props.visible).toBe(false);
	});

	// ─── setText / setElementText ───

	test("setText updates text node content", () => {
		const node = hostConfig.createText("before");
		hostConfig.setText(node, "after");
		expect(node.content).toBe("after");
	});

	test("setElementText sets content on empty element", () => {
		const node = hostConfig.createElement("tui-box", false, undefined, null);
		hostConfig.setElementText(node, "content");
		expect(node.content).toBe("content");
	});

	test("setElementText removes children and sets content", () => {
		const parent = hostConfig.createElement("tui-box", false, undefined, null);
		const child = hostConfig.createText("child");
		hostConfig.insert(child, parent, null);
		expect(parent.children.length).toBe(1);

		hostConfig.setElementText(parent, "replaced");
		expect(parent.children.length).toBe(0);
		expect(parent.content).toBe("replaced");
	});

	// ─── insert ───

	test("inserts child at end when no anchor", () => {
		const parent = hostConfig.createElement("tui-column", false, undefined, null);
		const a = hostConfig.createText("A");
		const b = hostConfig.createText("B");

		hostConfig.insert(a, parent, null);
		hostConfig.insert(b, parent, null);

		expect(parent.children.length).toBe(2);
		expect(parent.children[0].content).toBe("A");
		expect(parent.children[1].content).toBe("B");
	});

	test("inserts child before anchor", () => {
		const parent = hostConfig.createElement("tui-column", false, undefined, null);
		const a = hostConfig.createText("A");
		const c = hostConfig.createText("C");
		const b = hostConfig.createText("B");

		hostConfig.insert(a, parent, null);
		hostConfig.insert(c, parent, null);
		// Insert B before C
		hostConfig.insert(b, parent, c);

		expect(parent.children.map((n: TuiNode) => n.content)).toEqual(["A", "B", "C"]);
	});

	// ─── remove ───

	test("removes child from parent", () => {
		const parent = hostConfig.createElement("tui-column", false, undefined, null);
		const child = hostConfig.createText("child");
		hostConfig.insert(child, parent, null);
		expect(parent.children.length).toBe(1);

		hostConfig.remove(child);
		expect(parent.children.length).toBe(0);
	});

	// ─── parentNode ───

	test("returns parent of a node", () => {
		const parent = hostConfig.createElement("tui-box", false, undefined, null);
		const child = hostConfig.createText("child");
		hostConfig.insert(child, parent, null);

		expect(hostConfig.parentNode(child)).toBe(parent);
	});

	test("returns null for root node", () => {
		const root = hostConfig.createElement("tui-box", false, undefined, null);
		expect(hostConfig.parentNode(root)).toBeNull();
	});

	// ─── nextSibling ───

	test("returns next sibling", () => {
		const parent = hostConfig.createElement("tui-column", false, undefined, null);
		const a = hostConfig.createText("A");
		const b = hostConfig.createText("B");
		hostConfig.insert(a, parent, null);
		hostConfig.insert(b, parent, null);

		expect(hostConfig.nextSibling(a)).toBe(b);
	});

	test("returns null for last child", () => {
		const parent = hostConfig.createElement("tui-column", false, undefined, null);
		const a = hostConfig.createText("A");
		hostConfig.insert(a, parent, null);

		expect(hostConfig.nextSibling(a)).toBeNull();
	});

	test("returns null for orphan node", () => {
		const node = hostConfig.createText("orphan");
		expect(hostConfig.nextSibling(node)).toBeNull();
	});

	// ─── patchProp ───

	test("patches regular props on a node", () => {
		const node = hostConfig.createElement("tui-box", false, undefined, null);
		hostConfig.patchProp(node, "width", undefined, 40);
		expect(node.props.width).toBe(40);
	});

	test("patches content prop via setContent", () => {
		const node = hostConfig.createElement("tui-text", false, undefined, null);
		hostConfig.patchProp(node, "content", undefined, "hello");
		expect(node.content).toBe("hello");
	});

	test("skips Vue-internal props (key, ref)", () => {
		const node = hostConfig.createElement("tui-box", false, undefined, null);
		hostConfig.patchProp(node, "key", undefined, "my-key");
		hostConfig.patchProp(node, "ref", undefined, {});
		// These should not appear in props
		expect((node.props as Record<string, unknown>).key).toBeUndefined();
		expect((node.props as Record<string, unknown>).ref).toBeUndefined();
	});

	test("patches event handler prop (onKey)", () => {
		const node = hostConfig.createElement("tui-component", false, undefined, null);
		const handler = () => {};
		hostConfig.patchProp(node, "onKey", undefined, handler);

		// Should have registered a key event handler
		const handlers = node.handlers.get("key");
		expect(handlers).toBeDefined();
		expect(handlers?.size).toBe(1);
	});

	test("removes old event handler when patching", () => {
		const node = hostConfig.createElement("tui-component", false, undefined, null);
		const handler1 = () => {};
		const handler2 = () => {};

		hostConfig.patchProp(node, "onKey", undefined, handler1);
		expect(node.handlers.get("key")?.size).toBe(1);

		hostConfig.patchProp(node, "onKey", handler1, handler2);
		// Old handler removed, new one added
		expect(node.handlers.get("key")?.size).toBe(1);
	});

	test("removes event handler when set to null", () => {
		const node = hostConfig.createElement("tui-component", false, undefined, null);
		const handler = () => {};

		hostConfig.patchProp(node, "onKey", undefined, handler);
		hostConfig.patchProp(node, "onKey", handler, null);

		// Handler set should be empty or gone
		const handlers = node.handlers.get("key");
		expect(!handlers || handlers.size === 0).toBe(true);
	});

	// ─── cloneNode ───

	test("clones a node preserving type and props", () => {
		const original = hostConfig.createElement("tui-box", false, undefined, null);
		hostConfig.patchProp(original, "width", undefined, 100);

		const cloned = hostConfig.cloneNode?.(original);
		expect(cloned.type).toBe("box");
		expect(cloned.props.width).toBe(100);
		expect(cloned.id).not.toBe(original.id); // Different ID
	});

	// ─── insertStaticContent ───

	test("inserts static text content", () => {
		const parent = hostConfig.createElement("tui-column", false, undefined, null);
		// biome-ignore lint/style/noNonNullAssertion: method is defined, ?. would break destructuring
		const [first, last] = hostConfig.insertStaticContent!("static text", parent, null, false);
		expect(first).toBe(last);
		expect(first.content).toBe("static text");
		expect(parent.children.length).toBe(1);
	});
});
