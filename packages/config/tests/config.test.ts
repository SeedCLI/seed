import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { get, load, loadFile } from "../src/index.js";

describe("config", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "seedcli-config-"));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	describe("get", () => {
		test("gets nested value with dot notation", () => {
			const obj = { a: { b: { c: 42 } } };
			expect(get(obj, "a.b.c")).toBe(42);
		});

		test("returns default for missing path", () => {
			const obj = { a: 1 };
			expect(get(obj, "b.c", "default")).toBe("default");
		});

		test("returns undefined for missing path without default", () => {
			const obj = { a: 1 };
			expect(get(obj, "b.c")).toBeUndefined();
		});

		test("handles null in path", () => {
			const obj: Record<string, unknown> = { a: null };
			expect(get(obj, "a.b", "fallback")).toBe("fallback");
		});

		test("gets top-level value", () => {
			const obj = { name: "test" };
			expect(get(obj, "name")).toBe("test");
		});

		test("empty string path returns defaultValue", () => {
			const obj = { a: 1, b: 2 };
			expect(get(obj, "", "fallback")).toBe("fallback");
		});

		test("empty string path returns undefined when no defaultValue", () => {
			const obj = { a: 1 };
			expect(get(obj, "")).toBeUndefined();
		});

		test("rejects __proto__ key (prototype pollution guard)", () => {
			const obj = { __proto__: { admin: true } } as Record<string, unknown>;
			expect(get(obj, "__proto__", "safe")).toBe("safe");
		});

		test("rejects constructor key (prototype pollution guard)", () => {
			const obj = { constructor: { bad: true } } as Record<string, unknown>;
			expect(get(obj, "constructor", "safe")).toBe("safe");
		});

		test("rejects prototype key (prototype pollution guard)", () => {
			const obj = { prototype: { evil: true } } as Record<string, unknown>;
			expect(get(obj, "prototype", "safe")).toBe("safe");
		});

		test("supports bracket notation for keys with dots", () => {
			const obj = { "foo.bar": { baz: 42 } } as Record<string, unknown>;
			expect(get(obj, "[foo.bar].baz")).toBe(42);
		});

		test("returns defaultValue when traversing through non-object", () => {
			const obj = { a: "string-value" } as Record<string, unknown>;
			expect(get(obj, "a.b.c", "default")).toBe("default");
		});
	});

	describe("loadFile", () => {
		test("loads JSON file", async () => {
			const file = join(dir, "config.json");
			await Bun.write(file, JSON.stringify({ name: "test", port: 3000 }));
			const config = await loadFile(file);
			expect(config).toEqual({ name: "test", port: 3000 });
		});
	});

	describe("load", () => {
		test("loads config with defaults", async () => {
			const result = await load({
				name: "testapp",
				cwd: dir,
				defaults: { port: 3000, host: "localhost" },
			});
			expect(result.config.port).toBe(3000);
			expect(result.config.host).toBe("localhost");
		});

		test("loads config from config file", async () => {
			await Bun.write(join(dir, "testapp.config.json"), JSON.stringify({ port: 8080 }));
			const result = await load({
				name: "testapp",
				cwd: dir,
				defaults: { port: 3000 },
			});
			expect(result.config.port).toBe(8080);
		});

		test("overrides take precedence", async () => {
			await Bun.write(join(dir, "testapp.config.json"), JSON.stringify({ port: 8080 }));
			const result = await load({
				name: "testapp",
				cwd: dir,
				defaults: { port: 3000 },
				overrides: { port: 9999 },
			});
			expect(result.config.port).toBe(9999);
		});
	});
});
