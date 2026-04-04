import { beforeEach, describe, expect, test } from "vitest";
import {
	addEventListener,
	appendChild,
	clearDirty,
	createNode,
	disposeNode,
	findFocusableNodes,
	findNodeById,
	insertBefore,
	markDirty,
	removeChild,
	resetIdCounter,
	setContent,
	updateProps,
} from "../src/tree/node.js";

beforeEach(() => {
	resetIdCounter();
});

describe("createNode", () => {
	test("creates a text node with content", () => {
		const node = createNode("text", {}, [], "hello");
		expect(node.type).toBe("text");
		expect(node.content).toBe("hello");
		expect(node.dirty).toBe(true);
		expect(node.children).toHaveLength(0);
		expect(node.parent).toBeNull();
	});

	test("creates a container node with children", () => {
		const child1 = createNode("text", {}, [], "a");
		const child2 = createNode("text", {}, [], "b");
		const parent = createNode("row", {}, [child1, child2]);

		expect(parent.children).toHaveLength(2);
		expect(child1.parent).toBe(parent);
		expect(child2.parent).toBe(parent);
	});

	test("uses custom id when provided", () => {
		const node = createNode("box", { id: "my-box" });
		expect(node.id).toBe("my-box");
	});

	test("generates unique id when not provided", () => {
		const a = createNode("text");
		const b = createNode("text");
		expect(a.id).not.toBe(b.id);
	});
});

describe("appendChild / removeChild / insertBefore", () => {
	test("appends child to parent", () => {
		const parent = createNode("column");
		const child = createNode("text", {}, [], "hi");
		appendChild(parent, child);

		expect(parent.children).toHaveLength(1);
		expect(child.parent).toBe(parent);
	});

	test("removes child from parent", () => {
		const parent = createNode("column");
		const child = createNode("text", {}, [], "hi");
		appendChild(parent, child);
		removeChild(parent, child);

		expect(parent.children).toHaveLength(0);
		expect(child.parent).toBeNull();
	});

	test("reparents child when appending to new parent", () => {
		const p1 = createNode("row");
		const p2 = createNode("row");
		const child = createNode("text");
		appendChild(p1, child);
		appendChild(p2, child);

		expect(p1.children).toHaveLength(0);
		expect(p2.children).toHaveLength(1);
		expect(child.parent).toBe(p2);
	});

	test("inserts before anchor", () => {
		const parent = createNode("column");
		const a = createNode("text", {}, [], "a");
		const b = createNode("text", {}, [], "b");
		const c = createNode("text", {}, [], "c");
		appendChild(parent, a);
		appendChild(parent, c);
		insertBefore(parent, b, c);

		expect(parent.children[0]).toBe(a);
		expect(parent.children[1]).toBe(b);
		expect(parent.children[2]).toBe(c);
	});
});

describe("updateProps / setContent", () => {
	test("updates node props and marks dirty", () => {
		const node = createNode("box", { width: 10 });
		clearDirty(node);
		expect(node.dirty).toBe(false);

		updateProps(node, { width: 20 });
		expect(node.props.width).toBe(20);
		expect(node.dirty).toBe(true);
	});

	test("sets content and marks dirty", () => {
		const node = createNode("text", {}, [], "old");
		clearDirty(node);
		setContent(node, "new");
		expect(node.content).toBe("new");
		expect(node.dirty).toBe(true);
	});

	test("does not mark dirty for same content", () => {
		const node = createNode("text", {}, [], "same");
		clearDirty(node);
		setContent(node, "same");
		expect(node.dirty).toBe(false);
	});
});

describe("dirty propagation", () => {
	test("marks ancestors dirty", () => {
		const root = createNode("column");
		const child = createNode("row");
		const leaf = createNode("text", {}, [], "x");
		appendChild(root, child);
		appendChild(child, leaf);

		clearDirty(root);
		expect(root.dirty).toBe(false);
		expect(child.dirty).toBe(false);
		expect(leaf.dirty).toBe(false);

		markDirty(leaf);
		expect(leaf.dirty).toBe(true);
		expect(child.dirty).toBe(true);
		expect(root.dirty).toBe(true);
	});
});

describe("findFocusableNodes", () => {
	test("finds focusable nodes in tree order", () => {
		const root = createNode("column");
		const a = createNode("box", { focusable: true, id: "a" });
		const b = createNode("box", { focusable: true, id: "b" });
		const c = createNode("box", { id: "c" }); // not focusable
		appendChild(root, a);
		appendChild(root, b);
		appendChild(root, c);

		const result = findFocusableNodes(root);
		expect(result).toHaveLength(2);
		expect(result[0].id).toBe("a");
		expect(result[1].id).toBe("b");
	});

	test("sorts by tabIndex", () => {
		const root = createNode("column");
		const a = createNode("box", { focusable: true, tabIndex: 2, id: "a" });
		const b = createNode("box", { focusable: true, tabIndex: 1, id: "b" });
		appendChild(root, a);
		appendChild(root, b);

		const result = findFocusableNodes(root);
		expect(result[0].id).toBe("b");
		expect(result[1].id).toBe("a");
	});

	test("excludes invisible nodes", () => {
		const root = createNode("column");
		const a = createNode("box", { focusable: true, visible: false, id: "a" });
		const b = createNode("box", { focusable: true, id: "b" });
		appendChild(root, a);
		appendChild(root, b);

		const result = findFocusableNodes(root);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe("b");
	});
});

describe("findNodeById", () => {
	test("finds nested node by id", () => {
		const root = createNode("column", { id: "root" });
		const child = createNode("row", { id: "child" });
		const leaf = createNode("text", { id: "leaf" });
		appendChild(root, child);
		appendChild(child, leaf);

		expect(findNodeById(root, "leaf")).toBe(leaf);
		expect(findNodeById(root, "child")).toBe(child);
		expect(findNodeById(root, "missing")).toBeNull();
	});
});

describe("event handlers", () => {
	test("adds and removes event handlers", () => {
		const node = createNode("box");
		let _called = false;
		const remove = addEventListener(node, "key", () => {
			_called = true;
		});

		expect(node.handlers.has("key")).toBe(true);
		remove();
		expect(node.handlers.has("key")).toBe(false);
	});
});

describe("disposeNode", () => {
	test("clears handlers and children", () => {
		const root = createNode("column");
		const child = createNode("text");
		appendChild(root, child);
		addEventListener(child, "key", () => {});

		disposeNode(root);
		expect(root.children).toHaveLength(0);
		expect(child.handlers.size).toBe(0);
		expect(child.parent).toBeNull();
	});
});
