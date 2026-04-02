import { describe, test, expect } from "vitest";
import { defineComponent, h, ref } from "@vue/runtime-core";
import { createNode, type TuiNode } from "@seedcli/tui-core";
import { createVueTuiApp } from "../src/mount.js";
import { render } from "../src/renderer.js";
import type { TuiApp } from "@seedcli/tui";

/** Minimal mock TuiApp for unit testing (no real terminal). */
function createMockTuiApp(): TuiApp & { mountedRoot: TuiNode | null; running: boolean } {
	let mountedRoot: TuiNode | null = null;
	let running = false;

	return {
		mountedRoot: null,
		running: false,

		mount(root: TuiNode): void {
			mountedRoot = root;
			this.mountedRoot = root;
		},

		render(): void {},

		async run(): Promise<void> {
			running = true;
			this.running = true;
			// In real app, this blocks. For tests, return immediately.
		},

		async stop(): Promise<void> {
			running = false;
			this.running = false;
		},

		state: {
			get: () => undefined,
			set: () => {},
			delete: () => false,
			has: () => false,
			subscribe: () => () => {},
		},

		capabilities: {
			isTTY: false,
			color: { depth: "none", noColor: true },
			mouseTracking: false,
			alternateScreen: false,
			unicode: true,
			profile: "plain" as const,
		},

		get lifecycleState() {
			return running ? ("running" as const) : ("idle" as const);
		},
	};
}

describe("createVueTuiApp", () => {
	test("creates VueTuiInstance with vueApp and rootContainer", () => {
		const tuiApp = createMockTuiApp();
		const App = defineComponent({
			setup() {
				return () => h("tui-text" as any, { content: "hello" });
			},
		});

		const instance = createVueTuiApp(App, { app: tuiApp });
		expect(instance.vueApp).toBeDefined();
		expect(instance.rootContainer).toBeDefined();
		expect(instance.rootContainer.type).toBe("column");
	});

	test("mount renders Vue tree into root container", async () => {
		const tuiApp = createMockTuiApp();
		const App = defineComponent({
			setup() {
				return () => h("tui-text" as any, { content: "hello" });
			},
		});

		const instance = createVueTuiApp(App, { app: tuiApp });
		await instance.mount();

		// Root container should have children from Vue render
		expect(instance.rootContainer.children.length).toBeGreaterThan(0);
		// TUI app should have been mounted
		expect(tuiApp.mountedRoot).toBe(instance.rootContainer);
	});

	test("mount calls tuiApp.run()", async () => {
		const tuiApp = createMockTuiApp();
		const App = defineComponent({
			setup() {
				return () => h("tui-text" as any, { content: "test" });
			},
		});

		const instance = createVueTuiApp(App, { app: tuiApp });
		await instance.mount();

		expect(tuiApp.running).toBe(true);
	});

	test("throws if mounted twice", async () => {
		const tuiApp = createMockTuiApp();
		const App = defineComponent({
			setup() {
				return () => h("tui-text" as any, { content: "test" });
			},
		});

		const instance = createVueTuiApp(App, { app: tuiApp });
		await instance.mount();

		expect(instance.mount()).rejects.toThrow("SEED_TUI_VUE_0003");
	});

	test("unmount cleans up Vue tree and stops TUI app", async () => {
		const tuiApp = createMockTuiApp();
		const App = defineComponent({
			setup() {
				return () => h("tui-text" as any, { content: "test" });
			},
		});

		const instance = createVueTuiApp(App, { app: tuiApp });
		await instance.mount();
		await instance.unmount();

		expect(tuiApp.running).toBe(false);
	});

	test("unmount is safe to call when not mounted", async () => {
		const tuiApp = createMockTuiApp();
		const App = defineComponent({
			setup() {
				return () => h("tui-text" as any, { content: "test" });
			},
		});

		const instance = createVueTuiApp(App, { app: tuiApp });
		// Should not throw
		await instance.unmount();
	});
});

describe("Vue custom renderer integration", () => {
	test("renders nested component tree into TUI nodes", () => {
		const rootContainer = createNode("column", {});
		const App = defineComponent({
			setup() {
				return () =>
					h("tui-column" as any, {}, [
						h("tui-text" as any, { content: "Title" }),
						h("tui-row" as any, {}, [
							h("tui-text" as any, { content: "A" }),
							h("tui-text" as any, { content: "B" }),
						]),
					]);
			},
		});

		render(h(App), rootContainer);

		// The App component's render produces a column with 2 children
		expect(rootContainer.children.length).toBe(1);
		const column = rootContainer.children[0];
		expect(column.type).toBe("column");
		expect(column.children.length).toBe(2);
		expect(column.children[0].type).toBe("text");
		expect(column.children[0].content).toBe("Title");
		expect(column.children[1].type).toBe("row");
		expect(column.children[1].children.length).toBe(2);
	});

	test("reactive updates propagate to TUI tree", async () => {
		const rootContainer = createNode("column", {});
		const count = ref(0);

		const App = defineComponent({
			setup() {
				return () => h("tui-text" as any, { content: `Count: ${count.value}` });
			},
		});

		render(h(App), rootContainer);
		expect(rootContainer.children[0].content).toBe("Count: 0");

		// Update reactive value
		count.value = 42;
		// Vue batches updates in microtask, wait for it
		await new Promise((r) => setTimeout(r, 10));

		expect(rootContainer.children[0].content).toBe("Count: 42");
	});

	test("unmounting removes all children", () => {
		const rootContainer = createNode("column", {});
		const App = defineComponent({
			setup() {
				return () => h("tui-text" as any, { content: "test" });
			},
		});

		render(h(App), rootContainer);
		expect(rootContainer.children.length).toBe(1);

		render(null, rootContainer);
		expect(rootContainer.children.length).toBe(0);
	});

	test("event handlers are wired through patchProp", () => {
		const rootContainer = createNode("column", {});
		const calls: string[] = [];

		const App = defineComponent({
			setup() {
				return () =>
					h("tui-component" as any, {
						focusable: true,
						onKey: () => calls.push("key-pressed"),
					});
			},
		});

		render(h(App), rootContainer);

		const componentNode = rootContainer.children[0];
		expect(componentNode.type).toBe("component");
		expect(componentNode.handlers.get("key")?.size).toBe(1);

		// Fire event through handler
		const handler = [...componentNode.handlers.get("key")!][0];
		handler({ key: "a", raw: new Uint8Array(), modifiers: new Set(), handled: false, stopPropagation() {} } as never);
		expect(calls).toEqual(["key-pressed"]);
	});
});
