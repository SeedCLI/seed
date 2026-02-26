import { describe, expect, test } from "bun:test";
import { header } from "../src/header.js";
import { list } from "../src/list.js";
import { status } from "../src/status.js";

describe("ui module", () => {
	describe("header()", () => {
		test("renders ASCII art inside a box", () => {
			const result = header("Test");
			// Should contain box borders (╭ or ─)
			expect(result).toContain("─");
			// Should contain the figlet ASCII art
			expect(result).toContain("_____");
		});

		test("includes subtitle when provided", () => {
			const result = header("App", { subtitle: "v1.0.0" });
			expect(result).toContain("v1.0.0");
		});

		test("applies color option", () => {
			const result = header("App", { color: "cyan" });
			// Result should be a non-empty string (color codes are embedded)
			expect(result.length).toBeGreaterThan(0);
		});
	});

	describe("list()", () => {
		test("renders bullet list by default", () => {
			const result = list(["apple", "banana", "cherry"]);
			expect(result).toContain("•");
			expect(result).toContain("apple");
			expect(result).toContain("banana");
			expect(result).toContain("cherry");
		});

		test("renders arrow marker", () => {
			const result = list(["a", "b"], { marker: "arrow" });
			expect(result).toContain("→");
		});

		test("renders dash marker", () => {
			const result = list(["a", "b"], { marker: "dash" });
			expect(result).toContain("–");
		});

		test("renders numbered list", () => {
			const result = list(["first", "second", "third"], { marker: "number" });
			expect(result).toContain("1.");
			expect(result).toContain("2.");
			expect(result).toContain("3.");
		});

		test("ordered option defaults to number marker", () => {
			const result = list(["a", "b"], { ordered: true });
			expect(result).toContain("1.");
			expect(result).toContain("2.");
		});

		test("handles empty list", () => {
			const result = list([]);
			expect(result).toBe("");
		});
	});

	describe("status()", () => {
		test("success shows green checkmark", () => {
			const result = status("Tests", "success");
			expect(result).toContain("✔");
			expect(result).toContain("Tests");
		});

		test("fail shows red cross", () => {
			const result = status("Build", "fail");
			expect(result).toContain("✖");
			expect(result).toContain("Build");
		});

		test("skip shows gray circle", () => {
			const result = status("Lint", "skip");
			expect(result).toContain("◌");
			expect(result).toContain("Lint");
		});

		test("pending shows yellow ellipsis", () => {
			const result = status("Deploy", "pending");
			expect(result).toContain("…");
			expect(result).toContain("Deploy");
		});
	});

	describe("re-exports", () => {
		test("divider is re-exported", async () => {
			const mod = await import("../src/index.js");
			expect(typeof mod.divider).toBe("function");
		});

		test("keyValue is re-exported", async () => {
			const mod = await import("../src/index.js");
			expect(typeof mod.keyValue).toBe("function");
		});

		test("progress is re-exported", async () => {
			const mod = await import("../src/index.js");
			expect(typeof mod.progress).toBe("function");
		});

		test("tree is re-exported", async () => {
			const mod = await import("../src/index.js");
			expect(typeof mod.tree).toBe("function");
		});

		test("countdown is exported", async () => {
			const mod = await import("../src/index.js");
			expect(typeof mod.countdown).toBe("function");
		});
	});
});
