import { command } from "@seedcli/core";
import {
	createApp,
	text,
	box,
	column,
	row,
	createDebugOverlay,
	FpsCounter,
	countNodes,
	countDirtyNodes,
	createSnapshot,
	snapshotToJson,
	detectCapabilities,
	addEventListener,
	markDirty,
} from "@seedcli/tui";
import type { KeyEvent, TuiEvent } from "@seedcli/tui";

export const debugCommand = command({
	name: "debug",
	description: "Demo debug tools: overlay, FpsCounter, node counting, snapshot export",

	run: async () => {
		const app = createApp({ id: "debug-demo", title: "Debug Demo", devMode: true });

		const fpsCounter = new FpsCounter();
		const overlay = createDebugOverlay();

		const statsText = text("Calculating...", { color: "#3498DB", height: 1 });
		const snapshotResult = text("Press 's' to take snapshot", { dim: true, height: 1 });

		// Sample tree to count nodes in
		const sampleTree = column({ gap: 0, height: 3 }, ...[
			row({ gap: 1, height: 1 }, ...[
				text("A", { height: 1 }), text("B", { height: 1 }), text("C", { height: 1 }),
			]),
			row({ gap: 1, height: 1 }, ...[
				text("D", { height: 1 }), text("E", { height: 1 }),
			]),
			text("Nested content", { height: 1 }),
		]);

		function updateStats() {
			fpsCounter.frame();
			const total = countNodes(root);
			const dirty = countDirtyNodes(root);
			statsText.content = `Nodes: ${total} | Dirty: ${dirty} | FPS: ${fpsCounter.fps}`;

			overlay.update({
				fps: fpsCounter.fps,
				dirtyNodes: dirty,
				focusedId: null,
				renderMs: 1.2,
				layoutMs: 0.5,
				nodeCount: total,
			});
		}

		const controls = box(
			{ border: "rounded", padding: [0, 1, 0, 1], width: 50, height: 7, focusable: true },
			column({ gap: 0, height: 5 }, ...[
				text("Controls:", { bold: true, height: 1 }),
				text("  o  Toggle debug overlay", { height: 1 }),
				text("  s  Take snapshot", { height: 1 }),
				text("  d  Mark tree dirty", { height: 1 }),
				text("  f  Simulate frame tick", { height: 1 }),
			]),
		);

		addEventListener(controls, "key", ((event: KeyEvent) => {
			if (event.key === "o") {
				overlay.toggle();
				updateStats();
			} else if (event.key === "s") {
				const caps = detectCapabilities();
				const snapshot = createSnapshot({
					root,
					capabilities: caps,
					terminalSize: { columns: 80, rows: 24 },
					focusedNodeId: null,
				});
				const json = snapshotToJson(snapshot);
				snapshotResult.content = `Snapshot: ${json.length}B, ${snapshot.tree.children.length} children, v${snapshot.version}`;
			} else if (event.key === "d") {
				markDirty(sampleTree);
				updateStats();
			} else if (event.key === "f") {
				fpsCounter.frame();
				updateStats();
			}
		}) as (event: TuiEvent) => void);

		// Layout: 24 rows, padding [0,1,0,1], gap:1
		// header(1) + stats(1) + tree-box(5) + snapshot(1) + controls(7) + footer(1) = 16
		// Gaps: 5 × 1 = 5. Total: 16 + 5 = 21. Fits!
		// Note: overlay node is hidden by default, doesn't affect layout

		const root = column({ width: "fill", height: "fill", gap: 1, padding: [0, 1, 0, 1] }, ...[
			text("=== Debug Tools Demo ===", { bold: true, color: "#00BFFF", height: 1 }),

			statsText,

			box({ border: "single", padding: [0, 1, 0, 1], width: 35, height: 5 }, column({ gap: 0, height: 3 }, ...[
				text("Sample Tree:", { bold: true, height: 1 }),
				sampleTree,
			])),

			snapshotResult,

			controls,

			text("Press Ctrl+C to exit", { dim: true, height: 1 }),
		]);

		updateStats();

		app.mount(root);
		await app.run();
	},
});
