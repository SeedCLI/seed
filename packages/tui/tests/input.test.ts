import { describe, test, expect } from "vitest";
import { input } from "../src/components/input.js";

describe("Input component", () => {
	test("creates a focusable component node", () => {
		const node = input();
		expect(node.type).toBe("component");
		expect(node.props.focusable).toBe(true);
	});

	test("renders initial value", () => {
		const node = input({ value: "hello" });
		expect(node.children[0].content).toBe("hello");
	});

	test("renders placeholder when empty", () => {
		const node = input({ placeholder: "Type here..." });
		expect(node.children[0].content).toBe("Type here...");
		expect(node.children[0].props.dim).toBe(true);
	});

	test("renders masked value", () => {
		const node = input({ value: "secret", mask: "*" });
		expect(node.children[0].content).toBe("******");
	});

	test("handles character insertion via key events", () => {
		let lastValue = "";
		const node = input({ onChange: (v) => (lastValue = v) });

		// Simulate typing "hi"
		dispatchKey(node, "h");
		expect(lastValue).toBe("h");

		dispatchKey(node, "i");
		expect(lastValue).toBe("hi");
		expect(node.children[0].content).toBe("hi");
	});

	test("handles backspace", () => {
		let lastValue = "";
		const node = input({ value: "abc", onChange: (v) => (lastValue = v) });

		dispatchKey(node, "backspace");
		expect(lastValue).toBe("ab");
	});

	test("handles Ctrl+U to clear", () => {
		let lastValue = "";
		const node = input({ value: "abc", onChange: (v) => (lastValue = v) });

		dispatchKey(node, "u", new Set(["ctrl"]));
		expect(lastValue).toBe("");
	});

	test("calls onSubmit on Enter", () => {
		let submitted = "";
		const node = input({ value: "test", onSubmit: (v) => (submitted = v) });

		dispatchKey(node, "enter");
		expect(submitted).toBe("test");
	});
});

// Helper to dispatch a key event to a node
function dispatchKey(
	node: ReturnType<typeof input>,
	key: string,
	modifiers: Set<string> = new Set(),
) {
	const event = {
		key,
		raw: new Uint8Array(),
		modifiers: modifiers as Set<"ctrl" | "alt" | "shift" | "meta">,
		handled: false,
		stopPropagation() {
			this.handled = true;
		},
	};

	const handlers = node.handlers.get("key");
	if (handlers) {
		for (const handler of handlers) {
			handler(event as never);
			if (event.handled) break;
		}
	}
}
