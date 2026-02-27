import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	DiscoveryError,
	discover,
	discoverCommands,
	discoverExtensions,
} from "../src/discovery/auto-discover.js";

describe("discoverCommands", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "seedcli-discovery-"));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	test("discovers a single top-level command", async () => {
		await Bun.write(
			join(dir, "commands/hello.ts"),
			`export default { name: "hello", run: async () => {} };`,
		);

		const commands = await discoverCommands(dir);
		expect(commands.length).toBe(1);
		expect(commands[0].name).toBe("hello");
	});

	test("discovers multiple commands", async () => {
		await Bun.write(
			join(dir, "commands/hello.ts"),
			`export default { name: "hello", run: async () => {} };`,
		);
		await Bun.write(
			join(dir, "commands/deploy.ts"),
			`export default { name: "deploy", run: async () => {} };`,
		);

		const commands = await discoverCommands(dir);
		expect(commands.length).toBe(2);
		const names = commands.map((c) => c.name).sort();
		expect(names).toEqual(["deploy", "hello"]);
	});

	test("assigns name from filename if not set", async () => {
		await Bun.write(
			join(dir, "commands/greet.ts"),
			`export default { description: "A greeting", run: async () => {} };`,
		);

		const commands = await discoverCommands(dir);
		expect(commands[0].name).toBe("greet");
	});

	test("nested directory creates subcommands", async () => {
		await Bun.write(
			join(dir, "commands/db/migrate.ts"),
			`export default { name: "migrate", run: async () => {} };`,
		);
		await Bun.write(
			join(dir, "commands/db/seed.ts"),
			`export default { name: "seed", run: async () => {} };`,
		);

		const commands = await discoverCommands(dir);
		expect(commands.length).toBe(1);
		expect(commands[0].name).toBe("db");
		expect(commands[0].subcommands?.length).toBe(2);
	});

	test("index.ts in subdirectory provides parent command config", async () => {
		await Bun.write(
			join(dir, "commands/db/index.ts"),
			`export default { name: "db", description: "Database commands" };`,
		);
		await Bun.write(
			join(dir, "commands/db/migrate.ts"),
			`export default { name: "migrate", run: async () => {} };`,
		);

		const commands = await discoverCommands(dir);
		expect(commands.length).toBe(1);
		expect(commands[0].name).toBe("db");
		expect(commands[0].description).toBe("Database commands");
		expect(commands[0].subcommands?.length).toBe(1);
	});

	test("skips files starting with underscore", async () => {
		await Bun.write(
			join(dir, "commands/hello.ts"),
			`export default { name: "hello", run: async () => {} };`,
		);
		await Bun.write(join(dir, "commands/_helper.ts"), `export const helper = () => {};`);

		const commands = await discoverCommands(dir);
		expect(commands.length).toBe(1);
		expect(commands[0].name).toBe("hello");
	});

	test("skips files starting with dot", async () => {
		await Bun.write(
			join(dir, "commands/hello.ts"),
			`export default { name: "hello", run: async () => {} };`,
		);
		await Bun.write(join(dir, "commands/.hidden.ts"), `export default { name: "hidden" };`);

		const commands = await discoverCommands(dir);
		expect(commands.length).toBe(1);
	});

	test("returns empty array when commands dir does not exist", async () => {
		const commands = await discoverCommands(dir);
		expect(commands).toEqual([]);
	});

	test("skips root index.ts", async () => {
		await Bun.write(join(dir, "commands/index.ts"), `export default { name: "index" };`);
		await Bun.write(
			join(dir, "commands/hello.ts"),
			`export default { name: "hello", run: async () => {} };`,
		);

		const commands = await discoverCommands(dir);
		expect(commands.length).toBe(1);
		expect(commands[0].name).toBe("hello");
	});

	test("skips .d.ts declaration files", async () => {
		await Bun.write(
			join(dir, "commands/hello.ts"),
			`export default { name: "hello", run: async () => {} };`,
		);
		await Bun.write(
			join(dir, "commands/hello.d.ts"),
			`export declare const hello: { name: string };`,
		);

		const commands = await discoverCommands(dir);
		expect(commands.length).toBe(1);
		expect(commands[0].name).toBe("hello");
	});

	test("skips .test.ts files", async () => {
		await Bun.write(
			join(dir, "commands/deploy.ts"),
			`export default { name: "deploy", run: async () => {} };`,
		);
		await Bun.write(
			join(dir, "commands/deploy.test.ts"),
			`import { test } from "bun:test"; test("dummy", () => {});`,
		);

		const commands = await discoverCommands(dir);
		expect(commands.length).toBe(1);
		expect(commands[0].name).toBe("deploy");
	});

	test("skips .spec.ts files", async () => {
		await Bun.write(
			join(dir, "commands/deploy.ts"),
			`export default { name: "deploy", run: async () => {} };`,
		);
		await Bun.write(
			join(dir, "commands/deploy.spec.ts"),
			`import { test } from "bun:test"; test("spec", () => {});`,
		);

		const commands = await discoverCommands(dir);
		expect(commands.length).toBe(1);
		expect(commands[0].name).toBe("deploy");
	});
});

describe("discoverExtensions", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "seedcli-discovery-"));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	test("discovers extensions", async () => {
		await Bun.write(
			join(dir, "extensions/auth.ts"),
			`export default { name: "auth", setup: () => {} };`,
		);

		const extensions = await discoverExtensions(dir);
		expect(extensions.length).toBe(1);
		expect(extensions[0].name).toBe("auth");
	});

	test("assigns name from filename if not set", async () => {
		await Bun.write(join(dir, "extensions/logger.ts"), `export default { setup: () => {} };`);

		const extensions = await discoverExtensions(dir);
		expect(extensions[0].name).toBe("logger");
	});

	test("returns empty array when extensions dir does not exist", async () => {
		const extensions = await discoverExtensions(dir);
		expect(extensions).toEqual([]);
	});

	test("skips underscore-prefixed files", async () => {
		await Bun.write(
			join(dir, "extensions/auth.ts"),
			`export default { name: "auth", setup: () => {} };`,
		);
		await Bun.write(join(dir, "extensions/_util.ts"), `export const util = {};`);

		const extensions = await discoverExtensions(dir);
		expect(extensions.length).toBe(1);
	});
});

describe("discover", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "seedcli-discovery-"));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	test("discovers both commands and extensions", async () => {
		await Bun.write(
			join(dir, "commands/hello.ts"),
			`export default { name: "hello", run: async () => {} };`,
		);
		await Bun.write(
			join(dir, "extensions/auth.ts"),
			`export default { name: "auth", setup: () => {} };`,
		);

		const result = await discover(dir);
		expect(result.commands.length).toBe(1);
		expect(result.extensions.length).toBe(1);
	});

	test("handles missing directories gracefully", async () => {
		const result = await discover(dir);
		expect(result.commands).toEqual([]);
		expect(result.extensions).toEqual([]);
	});
});

describe("validation and error handling", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "seedcli-discovery-"));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	test("DiscoveryError has correct name and filePath", () => {
		const err = new DiscoveryError("test error", "/path/to/file.ts");
		expect(err.name).toBe("DiscoveryError");
		expect(err.filePath).toBe("/path/to/file.ts");
		expect(err.message).toBe("test error");
	});

	test("DiscoveryError preserves cause via ErrorOptions", () => {
		const cause = new SyntaxError("Unexpected token");
		const err = new DiscoveryError("Failed to import", "/commands/broken.ts", { cause });
		expect(err.cause).toBe(cause);
		expect(err.filePath).toBe("/commands/broken.ts");
		expect(err.name).toBe("DiscoveryError");
	});

	test("skips command with no run handler or subcommands", async () => {
		await Bun.write(
			join(dir, "commands/valid.ts"),
			`export default { name: "valid", run: async () => {} };`,
		);
		await Bun.write(join(dir, "commands/invalid.ts"), `export default { description: "no run" };`);

		const commands = await discoverCommands(dir);
		expect(commands.length).toBe(1);
		expect(commands[0].name).toBe("valid");
	});

	test("skips command that exports a non-object", async () => {
		await Bun.write(
			join(dir, "commands/valid.ts"),
			`export default { name: "valid", run: async () => {} };`,
		);
		await Bun.write(join(dir, "commands/bad.ts"), `export default "not an object";`);

		const commands = await discoverCommands(dir);
		expect(commands.length).toBe(1);
		expect(commands[0].name).toBe("valid");
	});

	test("skips extension with no setup function", async () => {
		await Bun.write(
			join(dir, "extensions/valid.ts"),
			`export default { name: "valid", setup: () => {} };`,
		);
		await Bun.write(join(dir, "extensions/invalid.ts"), `export default { name: "invalid" };`);

		const extensions = await discoverExtensions(dir);
		expect(extensions.length).toBe(1);
		expect(extensions[0].name).toBe("valid");
	});

	test("skips extension that exports a non-object", async () => {
		await Bun.write(
			join(dir, "extensions/valid.ts"),
			`export default { name: "valid", setup: () => {} };`,
		);
		await Bun.write(join(dir, "extensions/bad.ts"), `export default 42;`);

		const extensions = await discoverExtensions(dir);
		expect(extensions.length).toBe(1);
		expect(extensions[0].name).toBe("valid");
	});

	test("skips command files that fail to import", async () => {
		await Bun.write(
			join(dir, "commands/valid.ts"),
			`export default { name: "valid", run: async () => {} };`,
		);
		await Bun.write(
			join(dir, "commands/broken.ts"),
			`import { nonExistent } from "totally-fake-module-xyz"; export default nonExistent;`,
		);

		const commands = await discoverCommands(dir);
		expect(commands.length).toBe(1);
		expect(commands[0].name).toBe("valid");
	});

	test("skips extension files that fail to import", async () => {
		await Bun.write(
			join(dir, "extensions/valid.ts"),
			`export default { name: "valid", setup: () => {} };`,
		);
		await Bun.write(
			join(dir, "extensions/broken.ts"),
			`import { nonExistent } from "totally-fake-module-xyz"; export default nonExistent;`,
		);

		const extensions = await discoverExtensions(dir);
		expect(extensions.length).toBe(1);
		expect(extensions[0].name).toBe("valid");
	});
});
