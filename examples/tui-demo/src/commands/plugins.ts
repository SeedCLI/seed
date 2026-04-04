import { command } from "@seedcli/core";
import type { KeyEvent, TuiEvent, TuiNode, TuiPlugin } from "@seedcli/tui";
import { addEventListener, box, column, createApp, PluginRegistry, row, text } from "@seedcli/tui";

const badgePlugin: TuiPlugin = {
	id: "demo/badges",
	name: "Badge Components",
	version: "1.0.0",
	install(registry) {
		registry.registerComponent("demo/badges", "demo/badge", (opts: Record<string, unknown>) => {
			const label = (opts.label as string) || "badge";
			const color = (opts.color as string) || "#3498DB";
			return box(
				{ border: "rounded", padding: [0, 1, 0, 1], height: 3 },
				text(` ${label} `, { color, bold: true, height: 1 }),
			);
		});
		registry.registerKeymap("demo/badges", "shortcuts", [
			{ key: "b", description: "Show badge info", handler: () => {} },
		]);
		registry.registerRenderHook("demo/badges", "before", (_root: TuiNode) => {});
		registry.registerRenderHook("demo/badges", "after", (_root: TuiNode) => {});
	},
	dispose() {},
};

const altBadgePlugin: TuiPlugin = {
	id: "other/badges",
	name: "Alt Badge Components",
	version: "1.0.0",
	install(registry) {
		registry.registerComponent(
			"other/badges",
			"other/fancy-badge",
			(opts: Record<string, unknown>) => {
				const label = (opts.label as string) || "fancy";
				return box(
					{ border: "double", padding: [0, 1, 0, 1], height: 3 },
					text(`★ ${label} ★`, { color: "#F1C40F", bold: true, height: 1 }),
				);
			},
		);
	},
};

export const pluginsCommand = command({
	name: "plugins",
	description: "Demo plugin system: install, components, keymaps, render hooks, dispose",

	run: async () => {
		const app = createApp({ id: "plugins-demo", title: "Plugins Demo" });
		const registry = new PluginRegistry();

		const logLines: string[] = [];
		const logText = text("", { dim: true, height: 4 });

		function log(msg: string) {
			logLines.push(msg);
			if (logLines.length > 4) logLines.shift();
			logText.content = logLines.join("\n");
		}

		registry.install(badgePlugin);
		log(`Installed: ${badgePlugin.id}`);
		registry.install(altBadgePlugin);
		log(`Installed: ${altBadgePlugin.id}`);
		log(`Components: ${registry.registeredComponents.join(", ")}`);

		const badge1 = registry.createComponent("demo/badge", { label: "v1.0", color: "#2ECC71" });
		const badge2 = registry.createComponent("demo/badge", { label: "stable", color: "#3498DB" });
		const fancyBadge = registry.createComponent("other/fancy-badge", { label: "premium" });

		const keymaps = registry.getAllKeymapBindings();
		const keymapText = text(
			`Keymaps: ${keymaps.map((k) => `${k.key} - ${k.description || "n/a"}`).join("; ")}`,
			{ color: "#9B59B6", height: 1 },
		);

		const hookRoot = column({ height: 1 }, text("hook target", { height: 1 }));
		registry.runRenderHooks("before", hookRoot);
		registry.runRenderHooks("after", hookRoot);
		log("Render hooks executed");

		const controls = box(
			{ border: "rounded", padding: [0, 1, 0, 1], width: 50, height: 6, focusable: true },
			column(
				{ gap: 0, height: 4 },
				...[
					text("Controls:", { bold: true, height: 1 }),
					text("  1 Uninstall demo/badges", { height: 1 }),
					text("  2 Re-install demo/badges", { height: 1 }),
					text("  3 Check components | 4 Dispose all", { height: 1 }),
				],
			),
		);

		addEventListener(controls, "key", ((event: KeyEvent) => {
			if (event.key === "1") {
				try {
					registry.uninstall("demo/badges");
					log("Uninstalled demo/badges");
				} catch (e) {
					log(`Error: ${(e as Error).message}`);
				}
			} else if (event.key === "2") {
				try {
					registry.install(badgePlugin);
					log("Re-installed demo/badges");
				} catch (e) {
					log(`Error: ${(e as Error).message}`);
				}
			} else if (event.key === "3") {
				log(
					`demo/badge: ${registry.hasComponent("demo/badge")}, fancy: ${registry.hasComponent("other/fancy-badge")}`,
				);
			} else if (event.key === "4") {
				registry.dispose();
				log("All plugins disposed");
			}
		}) as (event: TuiEvent) => void);

		// Layout: 24 rows, padding [0,1,0,1], gap:1
		// header(1) + badges-row(3) + keymap(1) + log-box(6) + controls(6) + footer(1) = 18
		// Gaps: 5 × 1 = 5. Total: 18 + 5 = 23. Fits!

		const root = column(
			{ width: "fill", height: "fill", gap: 1, padding: [0, 1, 0, 1] },
			...[
				text("=== Plugin System Demo ===", { bold: true, color: "#00BFFF", height: 1 }),

				row(
					{ gap: 2, height: 3 },
					...[text("Badges:", { bold: true, height: 1 }), badge1, badge2, fancyBadge],
				),

				keymapText,

				box(
					{ border: "single", padding: [0, 1, 0, 1], width: 55, height: 6 },
					column(
						{ gap: 0, height: 4 },
						...[text("Event Log:", { bold: true, height: 1 }), logText],
					),
				),

				controls,

				text("Press Ctrl+C to exit", { dim: true, height: 1 }),
			],
		);

		app.mount(root);
		await app.run().finally(() => {
			registry.dispose();
		});
	},
});
