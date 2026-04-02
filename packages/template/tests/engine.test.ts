import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { directory } from "../src/directory.js";
import { renderString } from "../src/engine.js";
import { generate } from "../src/generate.js";

describe("template engine", () => {
	describe("render", () => {
		test("renders simple template", async () => {
			const result = await renderString("Hello, <%= it.name %>!", { name: "World" });
			expect(result).toBe("Hello, World!");
		});

		test("renders with useWith (no it. prefix)", async () => {
			const result = await renderString("Hello, <%= name %>!", { name: "World" });
			expect(result).toBe("Hello, World!");
		});

		test("renders empty template", async () => {
			const result = await renderString("");
			expect(result).toBe("");
		});

		test("renders with conditionals", async () => {
			const tmpl = "<% if (show) { %>visible<% } %>";
			expect(await renderString(tmpl, { show: true })).toBe("visible");
			expect(await renderString(tmpl, { show: false })).toBe("");
		});

		test("renders with loops", async () => {
			const tmpl = "<% for (const item of items) { %><%= item %> <% } %>";
			const result = await renderString(tmpl, { items: ["a", "b", "c"] });
			expect(result).toBe("a b c ");
		});

		test("does not escape HTML (autoEscape: false)", async () => {
			const result = await renderString("<%= html %>", { html: "<div>test</div>" });
			expect(result).toBe("<div>test</div>");
		});
	});
});

describe("generate", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "seedcli-template-"));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	test("generates file from template", async () => {
		const templatePath = join(dir, "template.txt");
		await writeFile(templatePath, "Hello, <%= name %>!");

		const targetPath = join(dir, "output", "result.txt");
		const result = await generate({
			template: templatePath,
			target: targetPath,
			props: { name: "World" },
		});

		expect(result).toBe(targetPath);
		const content = await readFile(targetPath, "utf-8");
		expect(content).toBe("Hello, World!");
	});
});

describe("directory scaffold", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "seedcli-template-dir-"));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	test("scaffolds directory from templates", async () => {
		const source = join(dir, "templates");
		const target = join(dir, "output");

		// Create template directory
		await mkdir(source, { recursive: true });
		await writeFile(join(source, "readme.md.eta"), "# <%= name %>\n<%= description %>");
		await writeFile(join(source, "config.json"), '{"name": "static"}');

		const created = await directory({
			source,
			target,
			props: { name: "MyProject", description: "A test project" },
		});

		expect(created.length).toBe(2);
		const readme = await readFile(join(target, "readme.md"), "utf-8");
		expect(readme).toBe("# MyProject\nA test project");
		const config = await readFile(join(target, "config.json"), "utf-8");
		expect(config).toBe('{"name": "static"}');
	});

	test("replaces dynamic filename segments", async () => {
		const source = join(dir, "templates");
		const target = join(dir, "output");

		await mkdir(source, { recursive: true });
		await writeFile(join(source, "__name__.ts.eta"), "export const name = '<%= name %>';");

		const created = await directory({
			source,
			target,
			props: { name: "myModule" },
		});

		expect(created.length).toBe(1);
		const content = await readFile(join(target, "myModule.ts"), "utf-8");
		expect(content).toBe("export const name = 'myModule';");
	});

	test("skips files matching skip patterns", async () => {
		const source = join(dir, "templates");
		const target = join(dir, "output");

		await mkdir(source, { recursive: true });
		await writeFile(join(source, "keep.txt"), "keep");
		await writeFile(join(source, "skip.log"), "skip");

		const created = await directory({
			source,
			target,
			props: {},
			ignore: ["*.log"],
		});

		expect(created.length).toBe(1);
		expect(created[0]).toContain("keep.txt");
	});
});
