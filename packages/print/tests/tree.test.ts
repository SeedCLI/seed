import { describe, expect, test } from "bun:test";
import { tree } from "../src/tree.js";

describe("tree", () => {
	test("renders simple tree", () => {
		const result = tree({
			label: "root",
			children: [{ label: "child1" }, { label: "child2" }],
		});
		expect(result).toContain("root");
		expect(result).toContain("├── child1");
		expect(result).toContain("└── child2");
	});

	test("renders nested tree", () => {
		const result = tree({
			label: "root",
			children: [
				{
					label: "src",
					children: [{ label: "index.ts" }, { label: "utils.ts" }],
				},
				{ label: "package.json" },
			],
		});
		expect(result).toContain("root");
		expect(result).toContain("├── src");
		expect(result).toContain("│   ├── index.ts");
		expect(result).toContain("│   └── utils.ts");
		expect(result).toContain("└── package.json");
	});

	test("renders deeply nested tree", () => {
		const result = tree({
			label: "root",
			children: [
				{
					label: "a",
					children: [
						{
							label: "b",
							children: [{ label: "c" }],
						},
					],
				},
			],
		});
		expect(result).toContain("root");
		expect(result).toContain("└── a");
		expect(result).toContain("    └── b");
		expect(result).toContain("        └── c");
	});

	test("renders without guides", () => {
		const result = tree(
			{
				label: "root",
				children: [{ label: "child" }],
			},
			{ guides: false },
		);
		expect(result).toContain("root");
		expect(result).toContain("child");
		expect(result).not.toContain("├");
		expect(result).not.toContain("└");
		expect(result).not.toContain("│");
	});

	test("renders leaf node", () => {
		const result = tree({ label: "single" });
		expect(result).toBe("single");
	});

	test("renders node with empty children array", () => {
		const result = tree({ label: "parent", children: [] });
		expect(result).toBe("parent");
	});

	test("renders multiple siblings at same level", () => {
		const result = tree({
			label: "root",
			children: [{ label: "first" }, { label: "second" }, { label: "third" }, { label: "fourth" }],
		});
		expect(result).toContain("├── first");
		expect(result).toContain("├── second");
		expect(result).toContain("├── third");
		expect(result).toContain("└── fourth");
	});

	test("renders continuation line for non-last parent", () => {
		const result = tree({
			label: "root",
			children: [
				{
					label: "dir1",
					children: [{ label: "file1" }],
				},
				{ label: "dir2" },
			],
		});
		// dir1 is not last, so its children should have "│   " prefix
		expect(result).toContain("│   └── file1");
	});

	test("last parent children use space prefix", () => {
		const result = tree({
			label: "root",
			children: [
				{ label: "first" },
				{
					label: "last",
					children: [{ label: "nested" }],
				},
			],
		});
		// "last" is the last child, so its children should have "    " prefix
		expect(result).toContain("    └── nested");
	});

	test("output starts with root label", () => {
		const result = tree({
			label: "my-project",
			children: [{ label: "file.txt" }],
		});
		expect(result.startsWith("my-project")).toBe(true);
	});

	test("guides option defaults to true", () => {
		const result = tree({
			label: "root",
			children: [{ label: "child" }],
		});
		expect(result).toContain("└── child");
	});

	test("explicit guides true matches default", () => {
		const node = {
			label: "root",
			children: [{ label: "child" }],
		};
		const defaultResult = tree(node);
		const explicitResult = tree(node, { guides: true });
		expect(explicitResult).toBe(defaultResult);
	});
});
