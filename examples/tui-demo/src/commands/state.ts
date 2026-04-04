import { command } from "@seedcli/core";
import type { KeyEvent, TuiEvent } from "@seedcli/tui";
import {
	addEventListener,
	box,
	column,
	createApp,
	createAsyncResource,
	createComputed,
	createEffect,
	createSignal,
	createStore,
	row,
	text,
} from "@seedcli/tui";

export const stateCommand = command({
	name: "state",
	description: "Demo reactive state: signals, computed, effects, stores, async resources",

	run: async () => {
		const app = createApp({ id: "state-demo", title: "State Demo" });

		// --- Signal ---
		const [getCount, setCount] = createSignal(0);
		const countText = text(`Count: ${getCount()}`, { bold: true, color: "#3498DB", height: 1 });

		// --- Computed ---
		const doubled = createComputed(() => getCount() * 2, [getCount]);
		const doubledText = text(`Doubled: ${doubled()}`, { color: "#9B59B6", height: 1 });

		const isEven = createComputed(() => getCount() % 2 === 0, [getCount]);
		const parityText = text(`Parity: ${isEven() ? "even" : "odd"}`, {
			color: "#E67E22",
			height: 1,
		});

		// --- Effect ---
		const effectLog = text("Effect: waiting for changes...", { dim: true, height: 1 });
		createEffect((): undefined => {
			const c = getCount();
			effectLog.content = `Effect fired! Count changed to ${c}`;
		}, [getCount]);

		// --- Store ---
		const store = createStore({
			username: "guest",
			theme: "dark",
			notifications: 3,
		});
		const storeText = text(
			`user=${store.get("username")}, theme=${store.get("theme")}, notifs=${store.get("notifications")}`,
			{ color: "#2ECC71", height: 1 },
		);
		store.subscribe("username", () => {
			storeText.content = `user=${store.get("username")}, theme=${store.get("theme")}, notifs=${store.get("notifications")}`;
		});
		store.subscribe("notifications", () => {
			storeText.content = `user=${store.get("username")}, theme=${store.get("theme")}, notifs=${store.get("notifications")}`;
		});

		// --- Async Resource ---
		const resource = createAsyncResource(async () => {
			await new Promise((r) => setTimeout(r, 500));
			return { status: "ok", timestamp: Date.now() };
		});
		const resourceText = text("Async: loading...", { color: "#F1C40F", height: 1 });

		const resourcePoll = setInterval(() => {
			if (resource.loading()) {
				resourceText.content = "Async: loading...";
			} else if (resource.error()) {
				resourceText.content = `Async: error - ${resource.error()?.message}`;
			} else {
				const data = resource.data();
				resourceText.content = `Async: status=${data?.status}, ts=${data?.timestamp}`;
			}
		}, 100);

		// Interactive controls
		const controlsBox = box(
			{ border: "rounded", padding: [0, 1, 0, 1], width: 50, height: 8, focusable: true },
			column(
				{ gap: 0, height: 6 },
				...[
					text("Controls:", { bold: true, height: 1 }),
					text("  +/=  Increment counter", { height: 1 }),
					text("  -/_  Decrement counter", { height: 1 }),
					text("  r    Refetch async resource", { height: 1 }),
					text("  u    Toggle username", { height: 1 }),
					text("  n    Increment notifications", { height: 1 }),
				],
			),
		);

		addEventListener(controlsBox, "key", ((event: KeyEvent) => {
			const key = event.key;
			if (key === "+" || key === "=") {
				setCount(getCount() + 1);
				countText.content = `Count: ${getCount()}`;
				doubledText.content = `Doubled: ${doubled()}`;
				parityText.content = `Parity: ${isEven() ? "even" : "odd"}`;
			} else if (key === "-" || key === "_") {
				setCount(getCount() - 1);
				countText.content = `Count: ${getCount()}`;
				doubledText.content = `Doubled: ${doubled()}`;
				parityText.content = `Parity: ${isEven() ? "even" : "odd"}`;
			} else if (key === "r") {
				resource.refetch();
			} else if (key === "u") {
				store.set("username", store.get("username") === "guest" ? "admin" : "guest");
			} else if (key === "n") {
				store.set("notifications", store.get("notifications") + 1);
			}
		}) as (event: TuiEvent) => void);

		// Layout: 24 rows, padding [0,1,0,1], gap:1
		// header(1) + signals-box(5) + effect(1) + store-row(1) + async-row(1) + controls(8) + footer(1) = 18
		// Gaps: 6 × 1 = 6. Total: 18 + 6 = 24. Fits!

		const root = column(
			{ width: "fill", height: "fill", gap: 1, padding: [0, 1, 0, 1] },
			...[
				text("=== Reactive State Demo ===", { bold: true, color: "#00BFFF", height: 1 }),

				// Signals + Computed in one box: border(2) + 3 lines = 5
				box(
					{ border: "single", padding: [0, 1, 0, 1], width: 45, height: 5 },
					column({ gap: 0, height: 3 }, ...[countText, doubledText, parityText]),
				),

				effectLog,

				// Store (inline)
				row({ height: 1 }, ...[text("Store: ", { bold: true, height: 1 }), storeText]),

				// Async resource (inline)
				resourceText,

				controlsBox,

				text("Press Ctrl+C to exit", { dim: true, height: 1 }),
			],
		);

		app.mount(root);
		await app.run().finally(() => {
			clearInterval(resourcePoll);
		});
	},
});
