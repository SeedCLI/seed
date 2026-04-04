import { beforeEach, describe, expect, test } from "vitest";
import { FocusManager } from "../src/input/focus.js";
import { appendChild, createNode, resetIdCounter } from "../src/tree/node.js";

beforeEach(() => {
	resetIdCounter();
});

describe("FocusManager", () => {
	test("starts with null focus", () => {
		const fm = new FocusManager();
		expect(fm.getFocused()).toBeNull();
	});

	test("focuses next node", () => {
		const root = createNode("column");
		const a = createNode("box", { focusable: true, id: "a" });
		const b = createNode("box", { focusable: true, id: "b" });
		appendChild(root, a);
		appendChild(root, b);

		const fm = new FocusManager();
		fm.setRoot(root);

		fm.focusNext();
		expect(fm.getFocused()?.id).toBe("a");

		fm.focusNext();
		expect(fm.getFocused()?.id).toBe("b");
	});

	test("wraps around on focusNext", () => {
		const root = createNode("column");
		const a = createNode("box", { focusable: true, id: "a" });
		const b = createNode("box", { focusable: true, id: "b" });
		appendChild(root, a);
		appendChild(root, b);

		const fm = new FocusManager();
		fm.setRoot(root);

		fm.focusNext(); // a
		fm.focusNext(); // b
		fm.focusNext(); // wraps to a
		expect(fm.getFocused()?.id).toBe("a");
	});

	test("focuses previous node", () => {
		const root = createNode("column");
		const a = createNode("box", { focusable: true, id: "a" });
		const b = createNode("box", { focusable: true, id: "b" });
		appendChild(root, a);
		appendChild(root, b);

		const fm = new FocusManager();
		fm.setRoot(root);

		fm.focusPrevious(); // starts at last
		expect(fm.getFocused()?.id).toBe("b");

		fm.focusPrevious();
		expect(fm.getFocused()?.id).toBe("a");
	});

	test("validates focus when node is removed", () => {
		const root = createNode("column");
		const a = createNode("box", { focusable: true, id: "a" });
		const b = createNode("box", { focusable: true, id: "b" });
		appendChild(root, a);
		appendChild(root, b);

		const fm = new FocusManager();
		fm.setRoot(root);
		fm.focus(a);

		// Remove 'a' from tree
		root.children.splice(0, 1);
		a.parent = null;

		fm.validateFocus();
		expect(fm.getFocused()?.id).toBe("b");
	});

	test("emits focus change events", () => {
		const root = createNode("column");
		const a = createNode("box", { focusable: true, id: "a" });
		appendChild(root, a);

		const fm = new FocusManager();
		fm.setRoot(root);

		let prevNode: unknown = "unset";
		let nextNode: unknown = "unset";
		fm.setOnFocusChange((prev, next) => {
			prevNode = prev;
			nextNode = next;
		});

		fm.focus(a);
		expect(prevNode).toBeNull();
		expect(nextNode).toBe(a);
	});

	test("clear resets state", () => {
		const root = createNode("column");
		const a = createNode("box", { focusable: true, id: "a" });
		appendChild(root, a);

		const fm = new FocusManager();
		fm.setRoot(root);
		fm.focus(a);

		fm.clear();
		expect(fm.getFocused()).toBeNull();
	});
});
