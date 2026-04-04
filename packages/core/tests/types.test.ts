import { describe, expect, test } from "vitest";
import { arg, command, defineConfig, defineExtension, definePlugin, flag } from "../src/index.js";

describe("arg()", () => {
	test("returns the definition unchanged", () => {
		const def = arg({ type: "string", required: true });
		expect(def).toEqual({ type: "string", required: true });
	});

	test("preserves choices", () => {
		const def = arg({
			type: "string",
			required: true,
			choices: ["staging", "prod"] as const,
		});
		expect(def.choices).toEqual(["staging", "prod"]);
	});
});

describe("flag()", () => {
	test("returns the definition unchanged", () => {
		const def = flag({ type: "boolean", default: false });
		expect(def).toEqual({ type: "boolean", default: false });
	});

	test("supports alias", () => {
		const def = flag({ type: "string", alias: "n" });
		expect(def.alias).toBe("n");
	});
});

describe("command()", () => {
	test("creates a command with name", () => {
		const cmd = command({
			name: "hello",
			description: "Say hello",
			run: async ({ print }) => {
				print.info("Hello!");
			},
		});
		expect(cmd.name).toBe("hello");
		expect(cmd.description).toBe("Say hello");
	});

	test("creates a command with args and flags", () => {
		const cmd = command({
			name: "deploy",
			args: {
				env: arg({ type: "string", required: true, choices: ["staging", "prod"] as const }),
			},
			flags: {
				force: flag({ type: "boolean", default: false }),
				replicas: flag({ type: "number" }),
			},
			run: async ({ args, flags }) => {
				// Type inference test — these should not cause TS errors:
				const _env: "staging" | "prod" = args.env;
				const _force: boolean = flags.force;
				const _replicas: number | undefined = flags.replicas;
				void _env;
				void _force;
				void _replicas;
			},
		});
		expect(cmd.name).toBe("deploy");
		expect(cmd.args).toBeDefined();
		expect(cmd.flags).toBeDefined();
	});

	test("supports subcommands", () => {
		const sub = command({ name: "sub" });
		const parent = command({
			name: "parent",
			subcommands: [sub],
		});
		expect(parent.subcommands).toHaveLength(1);
		expect(parent.subcommands?.[0].name).toBe("sub");
	});
});

describe("definePlugin()", () => {
	test("returns plugin config", () => {
		const plugin = definePlugin({
			name: "test-plugin",
			version: "1.0.0",
			seedcli: ">=1.0.0",
		});
		expect(plugin.name).toBe("test-plugin");
		expect(plugin.version).toBe("1.0.0");
		expect(plugin.seedcli).toBe(">=1.0.0");
	});

	test("supports peerPlugins", () => {
		const plugin = definePlugin({
			name: "test-plugin",
			version: "1.0.0",
			peerPlugins: { auth: "^1.0.0" },
		});
		expect(plugin.peerPlugins?.auth).toBe("^1.0.0");
	});
});

describe("defineExtension()", () => {
	test("returns extension config", () => {
		const ext = defineExtension({
			name: "auth",
			setup: () => {},
		});
		expect(ext.name).toBe("auth");
		expect(typeof ext.setup).toBe("function");
	});

	test("supports dependencies", () => {
		const ext = defineExtension({
			name: "analytics",
			dependencies: ["auth"],
			setup: () => {},
		});
		expect(ext.dependencies).toEqual(["auth"]);
	});
});

describe("defineConfig()", () => {
	test("returns config unchanged", () => {
		const config = defineConfig({
			build: {
				compile: {
					targets: ["node24-macos-arm64", "node24-linux-x64", "node24-win-x64"],
					sourcemap: true,
					splitting: false,
					define: { "process.env.NODE_ENV": '"production"' },
				},
				bundle: {
					outdir: "dist",
					sourcemap: true,
				},
			},
			dev: { entry: "src/index.ts" },
		});
		expect(config.build?.compile?.targets).toEqual([
			"node24-macos-arm64",
			"node24-linux-x64",
			"node24-win-x64",
		]);
		expect(config.build?.compile?.sourcemap).toBe(true);
		expect(config.build?.compile?.splitting).toBe(false);
		expect(config.build?.compile?.define).toEqual({ "process.env.NODE_ENV": '"production"' });
		expect(config.build?.bundle?.sourcemap).toBe(true);
		expect(config.dev?.entry).toBe("src/index.ts");
	});

	test("accepts 'all' as a compile target", () => {
		const config = defineConfig({
			build: {
				compile: {
					targets: ["all"],
				},
			},
		});
		expect(config.build?.compile?.targets).toEqual(["all"]);
	});
});
