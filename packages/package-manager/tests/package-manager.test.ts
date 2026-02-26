import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getCommands } from "../src/commands.js";
import { detect } from "../src/detect.js";
import { create } from "../src/manager.js";

describe("package-manager", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "seedcli-pm-"));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	describe("detect", () => {
		test("detects bun from bun.lock", async () => {
			await writeFile(join(dir, "bun.lock"), "");
			expect(await detect(dir)).toBe("bun");
		});

		test("detects npm from package-lock.json", async () => {
			await writeFile(join(dir, "package-lock.json"), "");
			expect(await detect(dir)).toBe("npm");
		});

		test("detects yarn from yarn.lock", async () => {
			await writeFile(join(dir, "yarn.lock"), "");
			expect(await detect(dir)).toBe("yarn");
		});

		test("detects pnpm from pnpm-lock.yaml", async () => {
			await writeFile(join(dir, "pnpm-lock.yaml"), "");
			expect(await detect(dir)).toBe("pnpm");
		});

		test("detects bun from bun.lockb", async () => {
			await writeFile(join(dir, "bun.lockb"), "");
			expect(await detect(dir)).toBe("bun");
		});

		test("detects from packageManager field", async () => {
			await Bun.write(join(dir, "package.json"), JSON.stringify({ packageManager: "yarn@4.0.0" }));
			expect(await detect(dir)).toBe("yarn");
		});

		test("detects pnpm from packageManager field", async () => {
			await Bun.write(join(dir, "package.json"), JSON.stringify({ packageManager: "pnpm@9.1.0" }));
			expect(await detect(dir)).toBe("pnpm");
		});

		test("defaults to bun when no lockfile or packageManager field", async () => {
			expect(await detect(dir)).toBe("bun");
		});

		test("lockfile takes priority over packageManager field", async () => {
			await writeFile(join(dir, "package-lock.json"), "");
			await Bun.write(join(dir, "package.json"), JSON.stringify({ packageManager: "yarn@4.0.0" }));
			expect(await detect(dir)).toBe("npm");
		});

		test("defaults to bun when package.json has no packageManager field", async () => {
			await Bun.write(join(dir, "package.json"), JSON.stringify({ name: "test" }));
			expect(await detect(dir)).toBe("bun");
		});

		test("defaults to bun when package.json has invalid packageManager", async () => {
			await Bun.write(
				join(dir, "package.json"),
				JSON.stringify({ packageManager: "unknown@1.0.0" }),
			);
			expect(await detect(dir)).toBe("bun");
		});
	});

	describe("getCommands", () => {
		test("returns bun commands", () => {
			const cmds = getCommands("bun");
			expect(cmds.install).toBe("bun install");
			expect(cmds.add).toBe("bun add");
			expect(cmds.remove).toBe("bun remove");
			expect(cmds.run).toBe("bun run");
			expect(cmds.addDev).toEqual(["bun", "add", "-d"]);
		});

		test("returns npm commands", () => {
			const cmds = getCommands("npm");
			expect(cmds.install).toBe("npm install");
			expect(cmds.add).toBe("npm install");
			expect(cmds.remove).toBe("npm uninstall");
			expect(cmds.run).toBe("npm run");
			expect(cmds.addDev).toEqual(["npm", "install", "--save-dev"]);
		});

		test("returns yarn commands", () => {
			const cmds = getCommands("yarn");
			expect(cmds.install).toBe("yarn install");
			expect(cmds.add).toBe("yarn add");
			expect(cmds.remove).toBe("yarn remove");
			expect(cmds.run).toBe("yarn run");
			expect(cmds.addDev).toEqual(["yarn", "add", "--dev"]);
		});

		test("returns pnpm commands", () => {
			const cmds = getCommands("pnpm");
			expect(cmds.install).toBe("pnpm install");
			expect(cmds.add).toBe("pnpm add");
			expect(cmds.remove).toBe("pnpm remove");
			expect(cmds.run).toBe("pnpm run");
			expect(cmds.addDev).toEqual(["pnpm", "add", "-D"]);
		});
	});

	describe("create", () => {
		test("creates manager with explicit name", async () => {
			const pm = await create("bun");
			expect(pm.name).toBe("bun");
		});

		test("creates manager with each package manager name", async () => {
			for (const name of ["bun", "npm", "yarn", "pnpm"] as const) {
				const pm = await create(name);
				expect(pm.name).toBe(name);
			}
		});

		test("creates manager and gets version", async () => {
			const pm = await create("bun");
			const version = await pm.version();
			expect(version).toMatch(/\d+\.\d+/);
		});

		test("auto-detects package manager from lockfile", async () => {
			await writeFile(join(dir, "bun.lock"), "");
			const pm = await create(undefined, dir);
			expect(pm.name).toBe("bun");
		});

		test("auto-detects npm from lockfile", async () => {
			await writeFile(join(dir, "package-lock.json"), "");
			const pm = await create(undefined, dir);
			expect(pm.name).toBe("npm");
		});

		test("defaults to bun when no indicators present", async () => {
			const pm = await create(undefined, dir);
			expect(pm.name).toBe("bun");
		});
	});
});
