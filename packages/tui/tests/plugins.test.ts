import { createNode } from "@seedcli/tui-core";
import { describe, expect, test } from "vitest";
import { PluginRegistry, type TuiPlugin } from "../src/plugins.js";

function createTestPlugin(id: string, overrides?: Partial<TuiPlugin>): TuiPlugin {
	return {
		id,
		name: `Test Plugin: ${id}`,
		version: "1.0.0",
		install(registry) {
			// Default: register a simple text component
			registry.registerComponent(id, `${id}/hello`, () => createNode("text", {}, [], "hello"));
		},
		...overrides,
	};
}

describe("PluginRegistry", () => {
	test("install and list plugins", () => {
		const registry = new PluginRegistry();
		const plugin = createTestPlugin("test-org/widgets");
		registry.install(plugin);

		expect(registry.installedPlugins).toContain("test-org/widgets");
	});

	test("throws on duplicate install", () => {
		const registry = new PluginRegistry();
		const plugin = createTestPlugin("dup/plugin");
		registry.install(plugin);

		expect(() => registry.install(plugin)).toThrow("SEED_TUI_PLUGIN_0001");
	});

	test("uninstall removes plugin and its components", () => {
		const registry = new PluginRegistry();
		const plugin = createTestPlugin("org/widget");
		registry.install(plugin);

		expect(registry.hasComponent("org/widget/hello")).toBe(true);

		registry.uninstall("org/widget");
		expect(registry.installedPlugins).not.toContain("org/widget");
		expect(registry.hasComponent("org/widget/hello")).toBe(false);
	});

	test("uninstall calls dispose on plugin", () => {
		let disposed = false;
		const registry = new PluginRegistry();
		const plugin = createTestPlugin("org/disposable", {
			dispose: () => {
				disposed = true;
			},
		});
		registry.install(plugin);
		registry.uninstall("org/disposable");

		expect(disposed).toBe(true);
	});

	test("uninstall is safe for unknown plugin", () => {
		const registry = new PluginRegistry();
		registry.uninstall("nonexistent");
		// Should not throw
	});
});

describe("Component Registration", () => {
	test("registerComponent and createComponent", () => {
		const registry = new PluginRegistry();
		registry.install(createTestPlugin("acme/tools"));

		const node = registry.createComponent("acme/tools/hello");
		expect(node.type).toBe("text");
		expect(node.content).toBe("hello");
	});

	test("requires namespaced component name", () => {
		const registry = new PluginRegistry();
		const plugin: TuiPlugin = {
			id: "bad/plugin",
			name: "Bad",
			version: "1.0.0",
			install(reg) {
				reg.registerComponent("bad/plugin", "no-namespace", () => createNode("text", {}));
			},
		};

		expect(() => registry.install(plugin)).toThrow("SEED_TUI_PLUGIN_0003");
	});

	test("detects component name conflicts", () => {
		const registry = new PluginRegistry();

		const plugin1: TuiPlugin = {
			id: "org1/widgets",
			name: "Org1",
			version: "1.0.0",
			install(reg) {
				reg.registerComponent("org1/widgets", "shared/button", () => createNode("box", {}));
			},
		};

		const plugin2: TuiPlugin = {
			id: "org2/widgets",
			name: "Org2",
			version: "1.0.0",
			install(reg) {
				reg.registerComponent("org2/widgets", "shared/button", () => createNode("box", {}));
			},
		};

		registry.install(plugin1);
		expect(() => registry.install(plugin2)).toThrow("SEED_TUI_PLUGIN_0004");
	});

	test("allows same plugin to re-register own component", () => {
		const registry = new PluginRegistry();
		const plugin: TuiPlugin = {
			id: "my/plugin",
			name: "My",
			version: "1.0.0",
			install(reg) {
				reg.registerComponent("my/plugin", "my/plugin/btn", () => createNode("box", {}));
				// Same plugin re-registering: should not throw
				reg.registerComponent("my/plugin", "my/plugin/btn", () => createNode("text", {}));
			},
		};

		registry.install(plugin); // Should not throw
	});

	test("throws for unknown component", () => {
		const registry = new PluginRegistry();
		expect(() => registry.createComponent("nonexistent/comp")).toThrow("SEED_TUI_PLUGIN_0005");
	});

	test("lists registered components", () => {
		const registry = new PluginRegistry();
		const plugin: TuiPlugin = {
			id: "demo/pkg",
			name: "Demo",
			version: "1.0.0",
			install(reg) {
				reg.registerComponent("demo/pkg", "demo/pkg/a", () => createNode("text", {}));
				reg.registerComponent("demo/pkg", "demo/pkg/b", () => createNode("box", {}));
			},
		};
		registry.install(plugin);

		expect(registry.registeredComponents).toContain("demo/pkg/a");
		expect(registry.registeredComponents).toContain("demo/pkg/b");
	});
});

describe("Version Compatibility", () => {
	test("plugin with compatible version installs", () => {
		const registry = new PluginRegistry();
		const plugin = createTestPlugin("compat/plugin", {
			minApiVersion: "1.0.0",
		});

		registry.install(plugin);
		expect(registry.installedPlugins).toContain("compat/plugin");
	});

	test("plugin requiring future version throws", () => {
		const registry = new PluginRegistry();
		const plugin = createTestPlugin("future/plugin", {
			minApiVersion: "99.0.0",
		});

		expect(() => registry.install(plugin)).toThrow("SEED_TUI_PLUGIN_0002");
	});
});

describe("Keymaps", () => {
	test("register and retrieve keymaps", () => {
		const registry = new PluginRegistry();
		const handler = () => {};
		const plugin: TuiPlugin = {
			id: "keys/plugin",
			name: "Keys",
			version: "1.0.0",
			install(reg) {
				reg.registerKeymap("keys/plugin", "nav", [
					{ key: "j", handler, description: "Move down" },
					{ key: "k", handler, description: "Move up" },
				]);
			},
		};
		registry.install(plugin);

		const bindings = registry.getAllKeymapBindings();
		expect(bindings.length).toBe(2);
		expect(bindings[0].key).toBe("j");
	});
});

describe("Render Hooks", () => {
	test("register and run render hooks", () => {
		const registry = new PluginRegistry();
		const calls: string[] = [];

		const plugin: TuiPlugin = {
			id: "hook/plugin",
			name: "Hook",
			version: "1.0.0",
			install(reg) {
				reg.registerRenderHook("hook/plugin", "before", () => calls.push("before"));
				reg.registerRenderHook("hook/plugin", "after", () => calls.push("after"));
			},
		};
		registry.install(plugin);

		const root = createNode("column", {});
		registry.runRenderHooks("before", root);
		registry.runRenderHooks("after", root);

		expect(calls).toEqual(["before", "after"]);
	});

	test("uninstall removes render hooks", () => {
		const registry = new PluginRegistry();
		let hookRan = false;

		const plugin: TuiPlugin = {
			id: "rm/hook",
			name: "Remove",
			version: "1.0.0",
			install(reg) {
				reg.registerRenderHook("rm/hook", "before", () => {
					hookRan = true;
				});
			},
		};
		registry.install(plugin);
		registry.uninstall("rm/hook");

		registry.runRenderHooks("before", createNode("text", {}));
		expect(hookRan).toBe(false);
	});
});

describe("dispose", () => {
	test("dispose clears everything", () => {
		const registry = new PluginRegistry();
		let disposed = false;

		const plugin = createTestPlugin("disp/all", {
			dispose: () => {
				disposed = true;
			},
		});
		registry.install(plugin);

		registry.dispose();
		expect(disposed).toBe(true);
		expect(registry.installedPlugins.length).toBe(0);
		expect(registry.registeredComponents.length).toBe(0);
	});
});
