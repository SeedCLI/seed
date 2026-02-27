import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { append, exists, patch, patchJson, prepend } from "../src/index.js";

describe("patching", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "seedcli-patching-"));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	async function writeFile(name: string, content: string): Promise<string> {
		const filePath = join(dir, name);
		await Bun.write(filePath, content);
		return filePath;
	}

	async function readFile(filePath: string): Promise<string> {
		return Bun.file(filePath).text();
	}

	describe("patch", () => {
		test("replaces text", async () => {
			const file = await writeFile("test.txt", "Hello World");
			const result = await patch(file, { replace: "World", insert: "Bun" });
			expect(result.changed).toBe(true);
			expect(result.content).toBe("Hello Bun");
			expect(await readFile(file)).toBe("Hello Bun");
		});

		test("replaces with regex", async () => {
			const file = await writeFile("test.txt", "version: 1.0.0");
			const result = await patch(file, { replace: /\d+\.\d+\.\d+/, insert: "2.0.0" });
			expect(result.changed).toBe(true);
			expect(await readFile(file)).toBe("version: 2.0.0");
		});

		test("inserts before pattern", async () => {
			const file = await writeFile("test.txt", "line1\nline3\n");
			const result = await patch(file, { before: "line3", insert: "line2\n" });
			expect(result.changed).toBe(true);
			expect(await readFile(file)).toBe("line1\nline2\nline3\n");
		});

		test("inserts after pattern", async () => {
			const file = await writeFile("test.txt", "line1\nline2\n");
			const result = await patch(file, { after: "line1\n", insert: "line1.5\n" });
			expect(result.changed).toBe(true);
			expect(await readFile(file)).toBe("line1\nline1.5\nline2\n");
		});

		test("deletes pattern", async () => {
			const file = await writeFile("test.txt", "keep remove keep");
			const result = await patch(file, { delete: "remove " });
			expect(result.changed).toBe(true);
			expect(await readFile(file)).toBe("keep keep");
		});

		test("returns unchanged result if pattern not found", async () => {
			const file = await writeFile("test.txt", "Hello World");
			const result = await patch(file, { replace: "missing", insert: "replaced" });
			expect(result.changed).toBe(false);
			expect(result.content).toBe("Hello World");
			expect(await readFile(file)).toBe("Hello World");
		});

		test("result.content matches file content after replace patch", async () => {
			const file = await writeFile("test.txt", "Hello World");
			const result = await patch(file, { replace: "World", insert: "Universe" });
			expect(result.changed).toBe(true);
			const fileContent = await readFile(file);
			expect(result.content).toBe(fileContent);
			expect(result.content).toBe("Hello Universe");
		});

		test("result.content matches file content after before-insert patch", async () => {
			const file = await writeFile("test.txt", "line1\nline3\n");
			const result = await patch(file, { before: "line3", insert: "line2\n" });
			expect(result.changed).toBe(true);
			const fileContent = await readFile(file);
			expect(result.content).toBe(fileContent);
		});

		test("result.content matches file content after after-insert patch", async () => {
			const file = await writeFile("test.txt", "line1\nline2\n");
			const result = await patch(file, { after: "line1\n", insert: "line1.5\n" });
			expect(result.changed).toBe(true);
			const fileContent = await readFile(file);
			expect(result.content).toBe(fileContent);
		});

		test("result.content matches file content after delete patch", async () => {
			const file = await writeFile("test.txt", "keep remove keep");
			const result = await patch(file, { delete: "remove " });
			expect(result.changed).toBe(true);
			const fileContent = await readFile(file);
			expect(result.content).toBe(fileContent);
			expect(result.content).toBe("keep keep");
		});
	});

	describe("append", () => {
		test("appends content to file", async () => {
			const file = await writeFile("test.txt", "Hello");
			await append(file, " World");
			expect(await readFile(file)).toBe("Hello World");
		});
	});

	describe("prepend", () => {
		test("prepends content to file", async () => {
			const file = await writeFile("test.txt", "World");
			await prepend(file, "Hello ");
			expect(await readFile(file)).toBe("Hello World");
		});
	});

	describe("exists", () => {
		test("returns true if pattern exists", async () => {
			const file = await writeFile("test.txt", "Hello World");
			expect(await exists(file, "World")).toBe(true);
		});

		test("returns false if pattern not found", async () => {
			const file = await writeFile("test.txt", "Hello World");
			expect(await exists(file, "Missing")).toBe(false);
		});

		test("works with regex", async () => {
			const file = await writeFile("test.txt", "version: 1.2.3");
			expect(await exists(file, /\d+\.\d+\.\d+/)).toBe(true);
		});
	});

	describe("patchJson", () => {
		test("mutates json in place", async () => {
			const file = await writeFile("test.json", '{\n  "name": "test",\n  "version": "1.0.0"\n}\n');
			await patchJson(file, (data: Record<string, unknown>) => {
				data.version = "2.0.0";
			});
			const result = JSON.parse(await readFile(file));
			expect(result.version).toBe("2.0.0");
			expect(result.name).toBe("test");
		});

		test("returns new object from mutator", async () => {
			const file = await writeFile("test.json", '{\n  "a": 1\n}\n');
			await patchJson(file, () => ({ a: 2, b: 3 }));
			const result = JSON.parse(await readFile(file));
			expect(result).toEqual({ a: 2, b: 3 });
		});

		test("preserves indentation", async () => {
			const file = await writeFile("test.json", '{\n\t"name": "test"\n}\n');
			await patchJson(file, (data: Record<string, unknown>) => {
				data.added = true;
			});
			const content = await readFile(file);
			expect(content).toContain("\t");
		});

		test("preserves trailing newline", async () => {
			const file = await writeFile("test.json", '{"a": 1}\n');
			await patchJson(file, (data: Record<string, unknown>) => {
				data.a = 2;
			});
			const content = await readFile(file);
			expect(content.endsWith("\n")).toBe(true);
		});
	});
});
