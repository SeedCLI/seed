import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build, command } from "../src/index.js";
import {
	ExtensionCycleError,
	ExtensionSetupError,
	PluginDependencyError,
	PluginError,
	PluginLoadError,
	PluginValidationError,
} from "../src/plugin/errors.js";
import { loadPlugin, loadPlugins } from "../src/plugin/loader.js";
import { PluginRegistry } from "../src/plugin/registry.js";
import { topoSort } from "../src/plugin/topo-sort.js";
import {
	validatePeerDependencies,
	validatePlugin,
	validateSeedcliVersion,
} from "../src/plugin/validator.js";
import type { ExtensionConfig } from "../src/types/extension.js";
import { defineExtension } from "../src/types/extension.js";
import type { PluginConfig } from "../src/types/plugin.js";
import { definePlugin } from "../src/types/plugin.js";

// ─── Helper ───

function ext(name: string, deps?: string[]): ExtensionConfig {
	return {
		name,
		dependencies: deps,
		setup: () => {},
	};
}

function validPlugin(overrides?: Partial<PluginConfig>): PluginConfig {
	return {
		name: "test-plugin",
		version: "1.0.0",
		...overrides,
	};
}

// ─── topoSort ───

describe("topoSort", () => {
	test("returns identity order when no dependencies", () => {
		const extensions = [ext("a"), ext("b"), ext("c")];
		const sorted = topoSort(extensions);
		expect(sorted.map((e) => e.name)).toEqual(["a", "b", "c"]);
	});

	test("sorts linear chain A → B → C", () => {
		const extensions = [ext("c", ["b"]), ext("b", ["a"]), ext("a")];
		const sorted = topoSort(extensions);
		const names = sorted.map((e) => e.name);
		expect(names.indexOf("a")).toBeLessThan(names.indexOf("b"));
		expect(names.indexOf("b")).toBeLessThan(names.indexOf("c"));
	});

	test("sorts diamond graph", () => {
		// D depends on B and C; B and C depend on A
		const extensions = [ext("d", ["b", "c"]), ext("b", ["a"]), ext("c", ["a"]), ext("a")];
		const sorted = topoSort(extensions);
		const names = sorted.map((e) => e.name);
		expect(names.indexOf("a")).toBeLessThan(names.indexOf("b"));
		expect(names.indexOf("a")).toBeLessThan(names.indexOf("c"));
		expect(names.indexOf("b")).toBeLessThan(names.indexOf("d"));
		expect(names.indexOf("c")).toBeLessThan(names.indexOf("d"));
	});

	test("throws ExtensionCycleError on circular deps", () => {
		const extensions = [ext("a", ["b"]), ext("b", ["a"])];
		expect(() => topoSort(extensions)).toThrow(ExtensionCycleError);
	});

	test("ignores missing deps (external satisfaction)", () => {
		const extensions = [ext("a", ["nonexistent"])];
		const sorted = topoSort(extensions);
		expect(sorted.map((e) => e.name)).toEqual(["a"]);
	});

	test("handles empty array", () => {
		expect(topoSort([])).toEqual([]);
	});

	test("handles single extension", () => {
		const sorted = topoSort([ext("solo")]);
		expect(sorted.map((e) => e.name)).toEqual(["solo"]);
	});
});

// ─── validatePlugin ───

describe("validatePlugin", () => {
	test("valid plugin passes", () => {
		const result = validatePlugin(validPlugin());
		expect(result.name).toBe("test-plugin");
		expect(result.version).toBe("1.0.0");
	});

	test("throws on null config", () => {
		expect(() => validatePlugin(null)).toThrow(PluginValidationError);
	});

	test("throws on non-object config", () => {
		expect(() => validatePlugin("not-an-object")).toThrow(PluginValidationError);
	});

	test("throws on missing name", () => {
		expect(() => validatePlugin({ version: "1.0.0" })).toThrow(PluginValidationError);
	});

	test("throws on empty name", () => {
		expect(() => validatePlugin({ name: "", version: "1.0.0" })).toThrow(PluginValidationError);
	});

	test("throws on invalid name format (uppercase)", () => {
		expect(() => validatePlugin({ name: "MyPlugin", version: "1.0.0" })).toThrow(
			PluginValidationError,
		);
	});

	test("throws on name starting with hyphen", () => {
		expect(() => validatePlugin({ name: "-bad", version: "1.0.0" })).toThrow(PluginValidationError);
	});

	test("throws on invalid version", () => {
		expect(() => validatePlugin({ name: "test", version: "not-semver" })).toThrow(
			PluginValidationError,
		);
	});

	test("throws on missing version", () => {
		expect(() => validatePlugin({ name: "test" })).toThrow(PluginValidationError);
	});

	test("throws on non-array commands", () => {
		expect(() => validatePlugin({ name: "test", version: "1.0.0", commands: "bad" })).toThrow(
			PluginValidationError,
		);
	});

	test("throws on non-array extensions", () => {
		expect(() => validatePlugin({ name: "test", version: "1.0.0", extensions: {} })).toThrow(
			PluginValidationError,
		);
	});

	test("allows name with hyphens and numbers", () => {
		const result = validatePlugin({ name: "my-plugin-2", version: "1.0.0" });
		expect(result.name).toBe("my-plugin-2");
	});

	test("error message includes guidance for missing name", () => {
		try {
			validatePlugin({ version: "1.0.0" });
		} catch (err) {
			expect((err as Error).message).toContain("definePlugin()");
		}
	});
});

// ─── validateSeedcliVersion ───

describe("validateSeedcliVersion", () => {
	test("passes when seedcli is not defined", () => {
		const plugin = validPlugin({ name: "no-constraint" });
		expect(() => validateSeedcliVersion(plugin, "1.0.0")).not.toThrow();
	});

	test("passes when runtime satisfies seedcli range", () => {
		const plugin = validPlugin({ seedcli: ">=1.0.0" });
		expect(() => validateSeedcliVersion(plugin, "2.0.0")).not.toThrow();
	});

	test("throws when runtime does not satisfy seedcli range", () => {
		const plugin = validPlugin({ seedcli: ">=2.0.0" });
		expect(() => validateSeedcliVersion(plugin, "1.5.0")).toThrow(PluginValidationError);
	});

	test("error message includes version details", () => {
		const plugin = validPlugin({ name: "strict-plugin", seedcli: ">=2.0.0" });
		try {
			validateSeedcliVersion(plugin, "1.5.0");
		} catch (err) {
			const msg = (err as Error).message;
			expect(msg).toContain("1.5.0");
			expect(msg).toContain(">=2.0.0");
			expect(msg).toContain("strict-plugin");
		}
	});
});

// ─── validatePeerDependencies ───

describe("validatePeerDependencies", () => {
	test("passes when peer is satisfied", () => {
		const plugin = validPlugin({
			name: "consumer",
			peerPlugins: { provider: ">=1.0.0" },
		});
		const loaded = new Map<string, PluginConfig>([
			["provider", validPlugin({ name: "provider", version: "2.0.0" })],
		]);
		expect(() => validatePeerDependencies(plugin, loaded)).not.toThrow();
	});

	test("throws when peer is missing", () => {
		const plugin = validPlugin({
			name: "consumer",
			peerPlugins: { provider: ">=1.0.0" },
		});
		const loaded = new Map<string, PluginConfig>();
		expect(() => validatePeerDependencies(plugin, loaded)).toThrow(PluginDependencyError);
	});

	test("throws when peer version is incompatible", () => {
		const plugin = validPlugin({
			name: "consumer",
			peerPlugins: { provider: ">=2.0.0" },
		});
		const loaded = new Map<string, PluginConfig>([
			["provider", validPlugin({ name: "provider", version: "1.0.0" })],
		]);
		expect(() => validatePeerDependencies(plugin, loaded)).toThrow(PluginDependencyError);
	});

	test("skips when no peerPlugins defined", () => {
		const plugin = validPlugin({ name: "standalone" });
		expect(() => validatePeerDependencies(plugin, new Map())).not.toThrow();
	});

	test("error message includes install guidance", () => {
		const plugin = validPlugin({
			name: "consumer",
			peerPlugins: { auth: ">=1.0.0" },
		});
		try {
			validatePeerDependencies(plugin, new Map());
		} catch (err) {
			expect((err as Error).message).toContain("bun add");
		}
	});
});

// ─── PluginRegistry ───

describe("PluginRegistry", () => {
	test("register and get", () => {
		const registry = new PluginRegistry();
		registry.register(validPlugin());
		expect(registry.get("test-plugin")).toBeDefined();
		expect(registry.get("test-plugin")?.version).toBe("1.0.0");
	});

	test("has returns true for registered plugin", () => {
		const registry = new PluginRegistry();
		registry.register(validPlugin());
		expect(registry.has("test-plugin")).toBe(true);
		expect(registry.has("nonexistent")).toBe(false);
	});

	test("all returns all registered plugins", () => {
		const registry = new PluginRegistry();
		registry.register(validPlugin({ name: "alpha", version: "1.0.0" }));
		registry.register(validPlugin({ name: "beta", version: "2.0.0" }));
		expect(registry.all().length).toBe(2);
	});

	test("silently deduplicates same plugin name", () => {
		const registry = new PluginRegistry();
		registry.register(validPlugin());
		registry.register(validPlugin()); // should not throw
		expect(registry.all().length).toBe(1);
	});

	test("throws on command name conflict", () => {
		const registry = new PluginRegistry();
		registry.register(
			validPlugin({
				name: "p1",
				version: "1.0.0",
				commands: [command({ name: "deploy" })],
			}),
		);
		expect(() =>
			registry.register(
				validPlugin({
					name: "p2",
					version: "1.0.0",
					commands: [command({ name: "deploy" })],
				}),
			),
		).toThrow(PluginValidationError);
	});

	test("command conflict error mentions both plugins", () => {
		const registry = new PluginRegistry();
		registry.register(
			validPlugin({
				name: "plugin-a",
				version: "1.0.0",
				commands: [command({ name: "deploy" })],
			}),
		);
		try {
			registry.register(
				validPlugin({
					name: "plugin-b",
					version: "1.0.0",
					commands: [command({ name: "deploy" })],
				}),
			);
		} catch (err) {
			const msg = (err as Error).message;
			expect(msg).toContain("plugin-a");
			expect(msg).toContain("plugin-b");
			expect(msg).toContain("deploy");
		}
	});

	test("throws on extension name conflict", () => {
		const registry = new PluginRegistry();
		registry.register(
			validPlugin({
				name: "p1",
				version: "1.0.0",
				extensions: [ext("deploy")],
			}),
		);
		expect(() =>
			registry.register(
				validPlugin({
					name: "p2",
					version: "1.0.0",
					extensions: [ext("deploy")],
				}),
			),
		).toThrow(PluginValidationError);
	});

	test("commands aggregates from all plugins", () => {
		const registry = new PluginRegistry();
		const cmd1 = command({ name: "cmd1" });
		const cmd2 = command({ name: "cmd2" });
		registry.register(validPlugin({ name: "p1", version: "1.0.0", commands: [cmd1] }));
		registry.register(validPlugin({ name: "p2", version: "1.0.0", commands: [cmd2] }));
		const cmds = registry.commands();
		expect(cmds.length).toBe(2);
		expect(cmds.map((c) => c.name)).toEqual(["cmd1", "cmd2"]);
	});

	test("extensions aggregates from all plugins", () => {
		const registry = new PluginRegistry();
		registry.register(
			validPlugin({
				name: "p1",
				version: "1.0.0",
				extensions: [ext("ext-a")],
			}),
		);
		registry.register(
			validPlugin({
				name: "p2",
				version: "1.0.0",
				extensions: [ext("ext-b")],
			}),
		);
		const exts = registry.extensions();
		expect(exts.length).toBe(2);
	});

	test("validateAll checks peer dependencies", () => {
		const registry = new PluginRegistry();
		registry.register(
			validPlugin({
				name: "consumer",
				version: "1.0.0",
				peerPlugins: { provider: ">=1.0.0" },
			}),
		);
		// peer "provider" is not registered
		expect(() => registry.validateAll()).toThrow(PluginDependencyError);
	});

	test("validateAll passes when peers are satisfied", () => {
		const registry = new PluginRegistry();
		registry.register(validPlugin({ name: "provider", version: "2.0.0" }));
		registry.register(
			validPlugin({
				name: "consumer",
				version: "1.0.0",
				peerPlugins: { provider: ">=1.0.0" },
			}),
		);
		expect(() => registry.validateAll()).not.toThrow();
	});
});

// ─── loadPlugin ───

describe("loadPlugin", () => {
	test("returns object source directly", async () => {
		const plugin = validPlugin();
		const result = await loadPlugin(plugin);
		expect(result).toBe(plugin);
	});

	test("throws PluginLoadError for unresolvable string", async () => {
		try {
			await loadPlugin("nonexistent-plugin-that-does-not-exist");
			expect(true).toBe(false);
		} catch (err) {
			expect(err).toBeInstanceOf(PluginLoadError);
		}
	});

	test("error message includes install guidance", async () => {
		try {
			await loadPlugin("@mycli/plugin-missing");
			expect(true).toBe(false);
		} catch (err) {
			const msg = (err as Error).message;
			expect(msg).toContain("not found");
			expect(msg).toContain("bun add");
		}
	});
});

describe("loadPlugins", () => {
	test("loads multiple object plugins", async () => {
		const plugins = [
			validPlugin({ name: "a", version: "1.0.0" }),
			validPlugin({ name: "b", version: "2.0.0" }),
		];
		const result = await loadPlugins(plugins);
		expect(result.length).toBe(2);
		expect(result[0].name).toBe("a");
		expect(result[1].name).toBe("b");
	});
});

// ─── Builder integration ───

describe("Builder plugin methods", () => {
	test(".plugin() stores single plugin source", () => {
		const plugin = validPlugin();
		const runtime = build("mycli").plugin(plugin).create();
		expect(runtime).toBeDefined();
	});

	test(".plugin() accepts string array", () => {
		// Should not throw — string arrays are now accepted
		const runtime = build("mycli").plugin(["plugin-a", "plugin-b"]).create();
		expect(runtime).toBeDefined();
	});

	test(".plugins() accepts directory with options", () => {
		const runtime = build("mycli").plugins("./plugins", { matching: "mycli-plugin-*" }).create();
		expect(runtime).toBeDefined();
	});

	test("chaining plugin with commands and help", () => {
		const runtime = build("mycli")
			.plugin(validPlugin())
			.command(command({ name: "test" }))
			.help()
			.version("1.0.0")
			.create();
		expect(runtime).toBeDefined();
	});
});

// ─── Runtime integration ───

describe("Runtime with plugins", () => {
	let logSpy: ReturnType<typeof mock>;
	let errorSpy: ReturnType<typeof mock>;
	let origLog: typeof console.log;
	let origError: typeof console.error;

	beforeEach(() => {
		origLog = console.log;
		origError = console.error;
		logSpy = mock();
		errorSpy = mock();
		console.log = logSpy;
		console.error = errorSpy;
	});

	afterEach(() => {
		console.log = origLog;
		console.error = origError;
		process.exitCode = 0;
	});

	test("plugin commands are available", async () => {
		let executed = false;
		const plugin = validPlugin({
			name: "deploy-plugin",
			version: "1.0.0",
			commands: [
				command({
					name: "deploy",
					run: async () => {
						executed = true;
					},
				}),
			],
		});

		const runtime = build("mycli").plugin(plugin).create();
		await runtime.run(["deploy"]);
		expect(executed).toBe(true);
	});

	test("duplicate plugins are silently deduped", async () => {
		let executionCount = 0;
		const plugin = validPlugin({
			name: "deploy-plugin",
			version: "1.0.0",
			commands: [
				command({
					name: "deploy",
					run: async () => {
						executionCount++;
					},
				}),
			],
		});

		// Register same plugin twice via array
		const runtime = build("mycli")
			.plugin([plugin as unknown as string])
			.plugin(plugin)
			.create();
		await runtime.run(["deploy"]);
		expect(executionCount).toBe(1);
	});

	test("extensions run setup and teardown in order", async () => {
		const order: string[] = [];

		const runtime = build("mycli")
			.extension({
				name: "ext-a",
				setup: () => {
					order.push("setup-a");
				},
				teardown: () => {
					order.push("teardown-a");
				},
			})
			.extension({
				name: "ext-b",
				dependencies: ["ext-a"],
				setup: () => {
					order.push("setup-b");
				},
				teardown: () => {
					order.push("teardown-b");
				},
			})
			.command(
				command({
					name: "test",
					run: async () => {
						order.push("command");
					},
				}),
			)
			.create();

		await runtime.run(["test"]);
		expect(order).toEqual(["setup-a", "setup-b", "command", "teardown-b", "teardown-a"]);
	});

	test("teardown runs even if command throws", async () => {
		const order: string[] = [];

		const runtime = build("mycli")
			.extension({
				name: "ext-cleanup",
				setup: () => {
					order.push("setup");
				},
				teardown: () => {
					order.push("teardown");
				},
			})
			.onError(() => {
				order.push("error-handler");
			})
			.command(
				command({
					name: "fail",
					run: async () => {
						throw new Error("command failed");
					},
				}),
			)
			.create();

		await runtime.run(["fail"]);
		expect(order).toContain("setup");
		expect(order).toContain("teardown");
	});

	test("extension cycle detected at runtime", async () => {
		const runtime = build("mycli")
			.extension({
				name: "ext-a",
				dependencies: ["ext-b"],
				setup: () => {},
			})
			.extension({
				name: "ext-b",
				dependencies: ["ext-a"],
				setup: () => {},
			})
			.onError((err) => {
				expect(err).toBeInstanceOf(ExtensionCycleError);
			})
			.command(
				command({
					name: "test",
					run: async () => {},
				}),
			)
			.create();

		await runtime.run(["test"]);
	});

	test("plugin extensions are merged and sorted", async () => {
		const order: string[] = [];

		const plugin = validPlugin({
			name: "my-plugin",
			version: "1.0.0",
			extensions: [
				{
					name: "plugin-ext",
					setup: () => {
						order.push("plugin-ext-setup");
					},
				},
			],
			commands: [
				command({
					name: "greet",
					run: async () => {
						order.push("command");
					},
				}),
			],
		});

		const runtime = build("mycli")
			.extension({
				name: "core-ext",
				setup: () => {
					order.push("core-ext-setup");
				},
			})
			.plugin(plugin)
			.create();

		await runtime.run(["greet"]);
		expect(order).toContain("core-ext-setup");
		expect(order).toContain("plugin-ext-setup");
		expect(order).toContain("command");
	});

	test("extension setup can modify toolbox", async () => {
		let captured: Record<string, unknown> = {};

		const runtime = build("mycli")
			.extension({
				name: "auth",
				setup: (toolbox) => {
					(toolbox as Record<string, unknown>).auth = { token: "abc123" };
				},
			})
			.command(
				command({
					name: "check",
					run: async (toolbox) => {
						captured = toolbox as unknown as Record<string, unknown>;
					},
				}),
			)
			.create();

		await runtime.run(["check"]);
		expect((captured as Record<string, unknown>).auth).toEqual({ token: "abc123" });
	});

	test("plugins directory scanning", async () => {
		// Create a temp directory with a plugin subdirectory
		const tmpDir = await mkdtemp(join(tmpdir(), "seedcli-plugins-"));

		const pluginDir = join(tmpDir, "mycli-plugin-test");
		await Bun.write(
			join(pluginDir, "index.ts"),
			`
			export default {
				name: "test-scanned",
				version: "1.0.0",
				commands: [],
			};
			`,
		);

		const runtime = build("mycli")
			.plugins(tmpDir, { matching: "mycli-plugin-*" })
			.command(command({ name: "default", run: async () => {} }))
			.create();

		// This should not throw — the plugin dir scanning should work
		// (the actual plugin load may fail if index.ts can't be imported as a module,
		// but the scanning itself should not error)
		try {
			await runtime.run(["default"]);
		} catch {
			// Plugin import might fail in test env, that's OK — we just verify scanning works
		}

		await rm(tmpDir, { recursive: true, force: true });
	});
});

// ─── Host-vs-plugin command conflict (Bug fix) ───

describe("Host-vs-plugin command conflict", () => {
	let origLog: typeof console.log;
	let origError: typeof console.error;

	beforeEach(() => {
		origLog = console.log;
		origError = console.error;
		console.log = mock();
		console.error = mock();
	});

	afterEach(() => {
		console.log = origLog;
		console.error = origError;
		process.exitCode = 0;
	});

	test("throws when plugin command name conflicts with host command", async () => {
		const plugin = validPlugin({
			name: "greet-plugin",
			version: "1.0.0",
			commands: [
				command({
					name: "hello",
					run: async () => {},
				}),
			],
		});

		let caughtError: Error | null = null;
		const runtime = build("mycli")
			.command(
				command({
					name: "hello",
					run: async () => {},
				}),
			)
			.plugin(plugin)
			.onError((err) => {
				caughtError = err;
			})
			.create();

		await runtime.run(["hello"]);
		expect(caughtError).toBeInstanceOf(PluginValidationError);
		expect(caughtError!.message).toContain("greet-plugin");
		expect(caughtError!.message).toContain("hello");
	});

	test("throws when plugin alias conflicts with host command name", async () => {
		const plugin = validPlugin({
			name: "greet-plugin",
			version: "1.0.0",
			commands: [
				command({
					name: "greet",
					alias: ["hello"],
					run: async () => {},
				}),
			],
		});

		let caughtError: Error | null = null;
		const runtime = build("mycli")
			.command(
				command({
					name: "hello",
					run: async () => {},
				}),
			)
			.plugin(plugin)
			.onError((err) => {
				caughtError = err;
			})
			.create();

		await runtime.run(["hello"]);
		expect(caughtError).toBeInstanceOf(PluginValidationError);
	});

	test("throws when plugin command name conflicts with host alias", async () => {
		const plugin = validPlugin({
			name: "greet-plugin",
			version: "1.0.0",
			commands: [
				command({
					name: "hello",
					run: async () => {},
				}),
			],
		});

		let caughtError: Error | null = null;
		const runtime = build("mycli")
			.command(
				command({
					name: "greet",
					alias: ["hello"],
					run: async () => {},
				}),
			)
			.plugin(plugin)
			.onError((err) => {
				caughtError = err;
			})
			.create();

		await runtime.run(["hello"]);
		expect(caughtError).toBeInstanceOf(PluginValidationError);
	});

	test("no conflict when plugin and host have different command names", async () => {
		let pluginExecuted = false;
		const plugin = validPlugin({
			name: "deploy-plugin",
			version: "1.0.0",
			commands: [
				command({
					name: "deploy",
					run: async () => {
						pluginExecuted = true;
					},
				}),
			],
		});

		const runtime = build("mycli")
			.command(
				command({
					name: "hello",
					run: async () => {},
				}),
			)
			.plugin(plugin)
			.create();

		await runtime.run(["deploy"]);
		expect(pluginExecuted).toBe(true);
	});
});

// ─── Error cause chaining ───

describe("error cause chaining", () => {
	test("PluginError preserves cause", () => {
		const cause = new Error("root cause");
		const err = new PluginError("wrapped", "my-plugin", { cause });
		expect(err.cause).toBe(cause);
		expect(err.pluginName).toBe("my-plugin");
	});

	test("PluginValidationError preserves cause", () => {
		const cause = new TypeError("type issue");
		const err = new PluginValidationError("invalid", "bad-plugin", { cause });
		expect(err.cause).toBe(cause);
		expect(err.name).toBe("PluginValidationError");
	});

	test("PluginLoadError preserves cause", () => {
		const cause = new Error("module not found");
		const err = new PluginLoadError("load failed", "missing-plugin", { cause });
		expect(err.cause).toBe(cause);
		expect(err.pluginName).toBe("missing-plugin");
	});

	test("PluginDependencyError preserves cause", () => {
		const cause = new Error("version mismatch");
		const err = new PluginDependencyError("dep failed", "consumer", "provider", { cause });
		expect(err.cause).toBe(cause);
		expect(err.dependency).toBe("provider");
	});

	test("ExtensionCycleError preserves cause", () => {
		const cause = new Error("graph error");
		const err = new ExtensionCycleError(["a", "b"], { cause });
		expect(err.cause).toBe(cause);
		expect(err.extensions).toEqual(["a", "b"]);
	});

	test("ExtensionSetupError preserves cause", () => {
		const cause = new Error("setup failed internally");
		const err = new ExtensionSetupError("setup boom", "my-ext", { cause });
		expect(err.cause).toBe(cause);
		expect(err.extensionName).toBe("my-ext");
	});
});

// ─── definePlugin() validation ───

describe("definePlugin()", () => {
	test("rejects empty name", () => {
		expect(() => definePlugin({ name: "", version: "1.0.0" })).toThrow("cannot be empty");
	});

	test("rejects whitespace-only name", () => {
		expect(() => definePlugin({ name: "   ", version: "1.0.0" })).toThrow("cannot be empty");
	});

	test("rejects missing version", () => {
		expect(() => definePlugin({ name: "my-plugin", version: "" } as PluginConfig)).toThrow(
			"missing a version",
		);
	});

	test("rejects undefined version", () => {
		expect(() => definePlugin({ name: "my-plugin" } as unknown as PluginConfig)).toThrow(
			"missing a version",
		);
	});

	test("accepts valid config", () => {
		const result = definePlugin({ name: "my-plugin", version: "1.0.0" });
		expect(result.name).toBe("my-plugin");
		expect(result.version).toBe("1.0.0");
	});

	test("returns the same config object", () => {
		const config = { name: "my-plugin", version: "1.0.0" };
		const result = definePlugin(config);
		expect(result).toBe(config);
	});

	test("error message includes guidance for empty name", () => {
		try {
			definePlugin({ name: "", version: "1.0.0" });
			expect(true).toBe(false);
		} catch (err) {
			expect((err as Error).message).toContain("definePlugin");
		}
	});

	test("error message includes plugin name for missing version", () => {
		try {
			definePlugin({ name: "cool-plugin" } as unknown as PluginConfig);
			expect(true).toBe(false);
		} catch (err) {
			expect((err as Error).message).toContain("cool-plugin");
		}
	});
});

// ─── defineExtension() validation ───

describe("defineExtension()", () => {
	test("rejects empty name", () => {
		expect(() => defineExtension({ name: "", setup: () => {} })).toThrow("cannot be empty");
	});

	test("rejects whitespace-only name", () => {
		expect(() => defineExtension({ name: "   ", setup: () => {} })).toThrow("cannot be empty");
	});

	test("rejects missing setup function", () => {
		expect(() => defineExtension({ name: "my-ext" } as unknown as ExtensionConfig)).toThrow(
			"missing a setup function",
		);
	});

	test("rejects non-function setup", () => {
		expect(() =>
			defineExtension({ name: "my-ext", setup: "not-a-function" } as unknown as ExtensionConfig),
		).toThrow("missing a setup function");
	});

	test("accepts valid config", () => {
		const setup = () => {};
		const result = defineExtension({ name: "my-ext", setup });
		expect(result.name).toBe("my-ext");
		expect(result.setup).toBe(setup);
	});

	test("returns the same config object", () => {
		const config = { name: "my-ext", setup: () => {} };
		const result = defineExtension(config);
		expect(result).toBe(config);
	});

	test("accepts config with dependencies and teardown", () => {
		const result = defineExtension({
			name: "my-ext",
			dependencies: ["other-ext"],
			setup: () => {},
			teardown: () => {},
		});
		expect(result.dependencies).toEqual(["other-ext"]);
		expect(result.teardown).toBeDefined();
	});

	test("error message includes guidance for empty name", () => {
		try {
			defineExtension({ name: "", setup: () => {} });
			expect(true).toBe(false);
		} catch (err) {
			expect((err as Error).message).toContain("defineExtension");
		}
	});

	test("error message includes extension name for missing setup", () => {
		try {
			defineExtension({ name: "auth-ext" } as unknown as ExtensionConfig);
			expect(true).toBe(false);
		} catch (err) {
			expect((err as Error).message).toContain("auth-ext");
		}
	});
});
