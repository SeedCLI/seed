import { appendChild, createNode } from "@seedcli/tui-core";
import { describe, expect, test } from "vitest";
import { createSnapshot, snapshotToJson } from "../src/snapshot-export.js";

const mockCapabilities = {
	isTTY: true,
	color: { depth: "truecolor" as const, noColor: false },
	mouseTracking: false,
	alternateScreen: true,
	unicode: true,
	profile: "full" as const,
};

describe("createSnapshot", () => {
	test("creates snapshot with tree and metadata", () => {
		const root = createNode("column", { width: "fill" });
		const text = createNode("text", { bold: true }, [], "Hello");
		appendChild(root, text);

		const snapshot = createSnapshot({
			root,
			capabilities: mockCapabilities,
			terminalSize: { columns: 80, rows: 24 },
			focusedNodeId: "input-1",
		});

		expect(snapshot.version).toBe(1);
		expect(snapshot.timestamp).toBeTruthy();
		expect(snapshot.capabilities.profile).toBe("full");
		expect(snapshot.terminalSize).toEqual({ columns: 80, rows: 24 });
		expect(snapshot.focusedNodeId).toBe("input-1");
		expect(snapshot.tree.type).toBe("column");
		expect(snapshot.tree.children.length).toBe(1);
		expect(snapshot.tree.children[0].content).toBe("Hello");
		expect(snapshot.tree.children[0].props.bold).toBe(true);
	});

	test("handles null focus and frame", () => {
		const root = createNode("text", {}, [], "test");
		const snapshot = createSnapshot({
			root,
			capabilities: mockCapabilities,
			terminalSize: { columns: 40, rows: 10 },
		});

		expect(snapshot.focusedNodeId).toBeNull();
		expect(snapshot.frameText).toBeNull();
	});

	test("serializes tree props correctly", () => {
		const node = createNode("box", {
			width: 40,
			height: 10,
			border: "rounded",
			focusable: true,
			color: "#ff0000",
		});

		const snapshot = createSnapshot({
			root: node,
			capabilities: mockCapabilities,
			terminalSize: { columns: 80, rows: 24 },
		});

		expect(snapshot.tree.props.width).toBe(40);
		expect(snapshot.tree.props.height).toBe(10);
		expect(snapshot.tree.props.border).toBe("rounded");
		expect(snapshot.tree.props.focusable).toBe(true);
		expect(snapshot.tree.props.color).toBe("#ff0000");
	});
});

describe("snapshotToJson", () => {
	test("produces valid JSON", () => {
		const root = createNode("text", {}, [], "test");
		const snapshot = createSnapshot({
			root,
			capabilities: mockCapabilities,
			terminalSize: { columns: 80, rows: 24 },
		});

		const json = snapshotToJson(snapshot);
		const parsed = JSON.parse(json);
		expect(parsed.version).toBe(1);
		expect(parsed.tree.type).toBe("text");
	});

	test("produces formatted JSON", () => {
		const root = createNode("text", {}, [], "test");
		const snapshot = createSnapshot({
			root,
			capabilities: mockCapabilities,
			terminalSize: { columns: 80, rows: 24 },
		});

		const json = snapshotToJson(snapshot);
		expect(json).toContain("\n"); // Pretty-printed
		expect(json).toContain("  "); // Indented
	});
});
