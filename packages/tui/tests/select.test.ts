import { describe, test, expect } from "vitest";
import { select } from "../src/components/select.js";

describe("Select component", () => {
	test("creates a focusable component node", () => {
		const node = select({ items: ["A", "B", "C"] });
		expect(node.type).toBe("component");
		expect(node.props.focusable).toBe(true);
	});

	test("renders items with marker on first", () => {
		const node = select({ items: ["A", "B", "C"] });
		expect(node.children.length).toBe(3);
		expect(node.children[0].content).toContain("\u25B8"); // ▸
		expect(node.children[0].content).toContain("A");
		expect(node.children[1].content).not.toContain("\u25B8");
	});

	test("navigates down with arrow key", () => {
		let selectedIdx = -1;
		const node = select({
			items: ["A", "B", "C"],
			onChange: (_, idx) => (selectedIdx = idx),
		});

		dispatchKey(node, "down");
		expect(selectedIdx).toBe(1);
		expect(node.children[1].content).toContain("\u25B8");
	});

	test("navigates up with arrow key", () => {
		let selectedIdx = -1;
		const node = select({
			items: ["A", "B", "C"],
			selectedIndex: 2,
			onChange: (_, idx) => (selectedIdx = idx),
		});

		dispatchKey(node, "up");
		expect(selectedIdx).toBe(1);
	});

	test("skips disabled items", () => {
		let selectedIdx = -1;
		const node = select({
			items: [
				{ label: "A", value: "a" },
				{ label: "B", value: "b", disabled: true },
				{ label: "C", value: "c" },
			],
			onChange: (_, idx) => (selectedIdx = idx),
		});

		dispatchKey(node, "down");
		expect(selectedIdx).toBe(2); // skips B (disabled)
	});

	test("calls onSubmit on Enter", () => {
		let submitted = "";
		const node = select({
			items: ["A", "B", "C"],
			onSubmit: (item) => (submitted = item.value),
		});

		dispatchKey(node, "enter");
		expect(submitted).toBe("A");
	});

	test("dims disabled items", () => {
		const node = select({
			items: [
				{ label: "A", value: "a" },
				{ label: "B", value: "b", disabled: true },
			],
		});

		expect(node.children[1].props.dim).toBe(true);
	});
});

function dispatchKey(
	node: ReturnType<typeof select>,
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
