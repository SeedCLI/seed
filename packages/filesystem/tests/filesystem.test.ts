import { afterEach, describe, expect, test } from "bun:test";
import { chmod, rm } from "node:fs/promises";
import { copy } from "../src/copy.js";
import { ensureDir, list, subdirectories } from "../src/dir.js";
import { FileNotFoundError, PermissionError } from "../src/errors.js";
import { exists, isDirectory, isFile } from "../src/exists.js";
import { find } from "../src/find.js";
import { move, rename } from "../src/move.js";
import { path } from "../src/path.js";
import { read, readBuffer, readJson } from "../src/read.js";
import { remove } from "../src/remove.js";
import { tmpDir, tmpFile } from "../src/tmp.js";
import { write, writeJson } from "../src/write.js";

const TEST_DIR = path.join(import.meta.dir, ".test-tmp");

afterEach(async () => {
	await rm(TEST_DIR, { recursive: true, force: true });
});

// ─── Error classes ───

describe("error classes", () => {
	test("FileNotFoundError has correct properties", () => {
		const err = new FileNotFoundError("/missing/file.txt");
		expect(err.name).toBe("FileNotFoundError");
		expect(err.path).toBe("/missing/file.txt");
		expect(err.message).toContain("/missing/file.txt");
		expect(err).toBeInstanceOf(Error);
	});

	test("PermissionError has correct properties", () => {
		const err = new PermissionError("/protected/file.txt");
		expect(err.name).toBe("PermissionError");
		expect(err.path).toBe("/protected/file.txt");
		expect(err.message).toContain("Permission denied");
		expect(err.message).toContain("/protected/file.txt");
		expect(err).toBeInstanceOf(Error);
	});
});

// ─── Read / Write ───

describe("read / write", () => {
	test("writes and reads text file", async () => {
		const file = path.join(TEST_DIR, "hello.txt");
		await write(file, "Hello World");
		const content = await read(file);
		expect(content).toBe("Hello World");
	});

	test("throws FileNotFoundError for missing file", async () => {
		try {
			await read("/nonexistent/file.txt");
			expect(true).toBe(false); // should not reach
		} catch (err) {
			expect(err).toBeInstanceOf(FileNotFoundError);
		}
	});

	test("throws PermissionError for unreadable file", async () => {
		const file = path.join(TEST_DIR, "no-read.txt");
		await write(file, "secret");
		await chmod(file, 0o000);
		try {
			await read(file);
			expect(true).toBe(false);
		} catch (err) {
			expect(err).toBeInstanceOf(PermissionError);
			expect((err as PermissionError).path).toBe(file);
		} finally {
			// Restore permissions so afterEach cleanup works
			await chmod(file, 0o644);
		}
	});

	test("writes and reads JSON", async () => {
		const file = path.join(TEST_DIR, "data.json");
		await writeJson(file, { name: "test", version: 1 });
		const data = await readJson<{ name: string; version: number }>(file);
		expect(data.name).toBe("test");
		expect(data.version).toBe(1);
	});

	test("writeJson with sorted keys", async () => {
		const file = path.join(TEST_DIR, "sorted.json");
		await writeJson(file, { zebra: 1, apple: 2 }, { sortKeys: true });
		const content = await read(file);
		const keys = Object.keys(JSON.parse(content));
		expect(keys).toEqual(["apple", "zebra"]);
	});
});

// ─── Exists ───

describe("exists / isFile / isDirectory", () => {
	test("exists returns true for existing file", async () => {
		const file = path.join(TEST_DIR, "exists.txt");
		await write(file, "content");
		expect(await exists(file)).toBe(true);
	});

	test("exists returns false for missing file", async () => {
		expect(await exists("/nonexistent")).toBe(false);
	});

	test("isFile returns true for file", async () => {
		const file = path.join(TEST_DIR, "file.txt");
		await write(file, "content");
		expect(await isFile(file)).toBe(true);
		expect(await isDirectory(file)).toBe(false);
	});

	test("isDirectory returns true for directory", async () => {
		await ensureDir(TEST_DIR);
		expect(await isDirectory(TEST_DIR)).toBe(true);
		expect(await isFile(TEST_DIR)).toBe(false);
	});

	test("isFile returns false for nonexistent path", async () => {
		expect(await isFile("/nonexistent/path")).toBe(false);
	});

	test("isDirectory returns false for nonexistent path", async () => {
		expect(await isDirectory("/nonexistent/path")).toBe(false);
	});
});

// ─── Directory operations ───

describe("directory operations", () => {
	test("ensureDir creates nested dirs", async () => {
		const dir = path.join(TEST_DIR, "a", "b", "c");
		await ensureDir(dir);
		expect(await isDirectory(dir)).toBe(true);
	});

	test("list returns entries", async () => {
		await write(path.join(TEST_DIR, "a.txt"), "a");
		await write(path.join(TEST_DIR, "b.txt"), "b");
		const entries = await list(TEST_DIR);
		expect(entries).toContain("a.txt");
		expect(entries).toContain("b.txt");
	});

	test("subdirectories returns only dirs", async () => {
		await write(path.join(TEST_DIR, "file.txt"), "text");
		await ensureDir(path.join(TEST_DIR, "subdir1"));
		await ensureDir(path.join(TEST_DIR, "subdir2"));
		const dirs = await subdirectories(TEST_DIR);
		expect(dirs).toEqual(["subdir1", "subdir2"]);
	});
});

// ─── Remove ───

describe("remove", () => {
	test("removes file", async () => {
		const file = path.join(TEST_DIR, "to-remove.txt");
		await write(file, "bye");
		await remove(file);
		expect(await exists(file)).toBe(false);
	});

	test("removes directory recursively", async () => {
		const dir = path.join(TEST_DIR, "dir-to-remove");
		await write(path.join(dir, "child.txt"), "child");
		await remove(dir);
		expect(await exists(dir)).toBe(false);
	});
});

// ─── Read extras ───

describe("readBuffer", () => {
	test("reads file as Buffer", async () => {
		const file = path.join(TEST_DIR, "binary.bin");
		await write(file, "buffer content");
		const buf = await readBuffer(file);
		expect(buf).toBeInstanceOf(Buffer);
		expect(buf.toString()).toBe("buffer content");
	});

	test("throws FileNotFoundError for missing file", async () => {
		try {
			await readBuffer("/nonexistent/binary.bin");
			expect(true).toBe(false);
		} catch (err) {
			expect(err).toBeInstanceOf(FileNotFoundError);
		}
	});
});

// ─── Copy ───

describe("copy", () => {
	test("copies a file", async () => {
		const src = path.join(TEST_DIR, "original.txt");
		const dest = path.join(TEST_DIR, "copied.txt");
		await write(src, "copy me");
		await copy(src, dest);
		expect(await read(dest)).toBe("copy me");
	});

	test("copies a directory recursively", async () => {
		const srcDir = path.join(TEST_DIR, "src-dir");
		await write(path.join(srcDir, "a.txt"), "a");
		await write(path.join(srcDir, "sub", "b.txt"), "b");
		const destDir = path.join(TEST_DIR, "dest-dir");
		await copy(srcDir, destDir);
		expect(await read(path.join(destDir, "a.txt"))).toBe("a");
		expect(await read(path.join(destDir, "sub", "b.txt"))).toBe("b");
	});
});

// ─── Move / Rename ───

describe("move / rename", () => {
	test("moves a file", async () => {
		const src = path.join(TEST_DIR, "to-move.txt");
		const dest = path.join(TEST_DIR, "moved.txt");
		await write(src, "move me");
		await move(src, dest);
		expect(await exists(src)).toBe(false);
		expect(await read(dest)).toBe("move me");
	});

	test("throws when destination exists and overwrite is false", async () => {
		const src = path.join(TEST_DIR, "src.txt");
		const dest = path.join(TEST_DIR, "dest.txt");
		await write(src, "src");
		await write(dest, "dest");
		try {
			await move(src, dest, { overwrite: false });
			expect(true).toBe(false);
		} catch (err) {
			expect((err as Error).message).toContain("already exists");
		}
	});

	test("rename a file", async () => {
		const src = path.join(TEST_DIR, "old-name.txt");
		const dest = path.join(TEST_DIR, "new-name.txt");
		await write(src, "content");
		await rename(src, dest);
		expect(await exists(src)).toBe(false);
		expect(await read(dest)).toBe("content");
	});
});

// ─── Find ───

describe("find", () => {
	test("finds files by glob pattern", async () => {
		await write(path.join(TEST_DIR, "a.ts"), "");
		await write(path.join(TEST_DIR, "b.ts"), "");
		await write(path.join(TEST_DIR, "c.js"), "");
		const results = await find(TEST_DIR, { matching: "*.ts" });
		expect(results).toContain("a.ts");
		expect(results).toContain("b.ts");
		expect(results).not.toContain("c.js");
	});

	test("finds all files when no matching specified", async () => {
		await write(path.join(TEST_DIR, "x.ts"), "");
		await write(path.join(TEST_DIR, "y.js"), "");
		const results = await find(TEST_DIR);
		expect(results.length).toBeGreaterThanOrEqual(2);
	});

	test("finds with multiple patterns", async () => {
		await write(path.join(TEST_DIR, "a.ts"), "");
		await write(path.join(TEST_DIR, "b.js"), "");
		await write(path.join(TEST_DIR, "c.css"), "");
		const results = await find(TEST_DIR, { matching: ["*.ts", "*.js"] });
		expect(results).toContain("a.ts");
		expect(results).toContain("b.js");
		expect(results).not.toContain("c.css");
	});

	test("ignores files matching ignore pattern", async () => {
		await write(path.join(TEST_DIR, "keep.ts"), "");
		await write(path.join(TEST_DIR, "skip.test.ts"), "");
		const results = await find(TEST_DIR, {
			matching: "*.ts",
			ignore: "*.test.ts",
		});
		expect(results).toContain("keep.ts");
		expect(results).not.toContain("skip.test.ts");
	});

	test("ignores files matching multiple ignore patterns", async () => {
		await write(path.join(TEST_DIR, "keep.ts"), "");
		await write(path.join(TEST_DIR, "skip.test.ts"), "");
		await write(path.join(TEST_DIR, "skip.spec.ts"), "");
		const results = await find(TEST_DIR, {
			matching: "*.ts",
			ignore: ["*.test.ts", "*.spec.ts"],
		});
		expect(results).toContain("keep.ts");
		expect(results).not.toContain("skip.test.ts");
		expect(results).not.toContain("skip.spec.ts");
	});

	test("includes dot files when dot is true", async () => {
		await write(path.join(TEST_DIR, ".hidden"), "");
		await write(path.join(TEST_DIR, "visible.txt"), "");
		const withDot = await find(TEST_DIR, { dot: true });
		const withoutDot = await find(TEST_DIR, { dot: false });
		expect(withDot).toContain(".hidden");
		expect(withoutDot).not.toContain(".hidden");
	});

	test("returns sorted results", async () => {
		await write(path.join(TEST_DIR, "z.txt"), "");
		await write(path.join(TEST_DIR, "a.txt"), "");
		await write(path.join(TEST_DIR, "m.txt"), "");
		const results = await find(TEST_DIR, { matching: "*.txt" });
		expect(results).toEqual(["a.txt", "m.txt", "z.txt"]);
	});
});

// ─── Tmp ───

describe("tmpDir / tmpFile", () => {
	test("creates temp directory", async () => {
		const dir = await tmpDir({ prefix: "test-" });
		expect(await isDirectory(dir)).toBe(true);
		await remove(dir);
	});

	test("creates temp file", async () => {
		const file = await tmpFile({ ext: ".json" });
		expect(await exists(file)).toBe(true);
		expect(file.endsWith(".json")).toBe(true);
		await remove(path.dirname(file));
	});
});

// ─── Path helpers ───

describe("path helpers", () => {
	test("join", () => expect(path.join("a", "b", "c")).toBe("a/b/c"));
	test("dirname", () => expect(path.dirname("/a/b/c.ts")).toBe("/a/b"));
	test("basename", () => expect(path.basename("/a/b/c.ts")).toBe("c.ts"));
	test("basename with ext", () => expect(path.basename("/a/b/c.ts", ".ts")).toBe("c"));
	test("ext", () => expect(path.ext("/a/b/c.ts")).toBe(".ts"));
	test("isAbsolute", () => {
		expect(path.isAbsolute("/a/b")).toBe(true);
		expect(path.isAbsolute("a/b")).toBe(false);
	});
	test("home returns string", () => expect(typeof path.home()).toBe("string"));
	test("cwd returns string", () => expect(typeof path.cwd()).toBe("string"));
});
