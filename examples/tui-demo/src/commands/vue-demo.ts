import { command } from "@seedcli/core";
import { createApp } from "@seedcli/tui";
import { createVueTuiApp, TuiText, TuiBox, TuiRow, TuiColumn, TuiInput, TuiSelect } from "@seedcli/tui-vue";
import { defineComponent, ref, computed, h } from "vue";

const VueDemoApp = defineComponent({
	name: "VueDemoApp",
	setup() {
		const name = ref("");
		const greeting = computed(() => (name.value ? `Hello, ${name.value}!` : "Type your name above"));

		const selectedColor = ref(0);
		const colors = [
			{ label: "Red", value: "red" },
			{ label: "Green", value: "green" },
			{ label: "Blue", value: "blue" },
		];
		const selectedLabel = ref("None selected");

		const counter = ref(0);

		// Auto-increment counter every 2 seconds
		const interval = setInterval(() => { counter.value++; }, 2000);

		return () =>
			// Layout: 24 rows, padding [0,1,0,1], gap:1
			// header(1) + input-box(6) + select-box(7) + counter-box(6) + footer(1) = 21
			// Gaps: 4 × 1 = 4. Total: 21 + 4 = 25. One over!
			// Fix: use gap:0 between some or reduce box sizes
			// header(1) + row[input(6), select(7)](7) + counter(6) + row-boxes(3) + footer(1) = 18 + 4 = 22. Fits!
			h(TuiColumn, { width: "fill", height: "fill", gap: 1, padding: [0, 1, 0, 1] }, () => [
				h(TuiText, { content: "=== Vue Reconciler Demo ===", bold: true, color: "#00BFFF", height: 1 }),

				// Input + Select side by side
				h(TuiRow, { gap: 2, height: 7 }, () => [
					h(TuiBox, { border: "rounded", padding: [0, 1, 0, 1], width: 35, height: 7 }, () => [
						h(TuiColumn, { gap: 0, height: 5 }, () => [
							h(TuiText, { content: "Vue Input (v-model):", bold: true, height: 1 }),
							h(TuiInput, {
								modelValue: name.value,
								placeholder: "Enter your name...",
								"onUpdate:modelValue": (val: string) => { name.value = val; },
							}),
							h(TuiText, { content: greeting.value, color: "#2ECC71", height: 1 }),
						]),
					]),
					h(TuiBox, { border: "single", padding: [0, 1, 0, 1], width: 25, height: 7 }, () => [
						h(TuiColumn, { gap: 0, height: 5 }, () => [
							h(TuiText, { content: "Vue Select:", bold: true, height: 1 }),
							h(TuiSelect, {
								items: colors,
								modelValue: selectedColor.value,
								"onUpdate:modelValue": (val: number) => { selectedColor.value = val; },
								onSubmit: (item: { label: string }) => { selectedLabel.value = `Chosen: ${item.label}`; },
							}),
							h(TuiText, { content: selectedLabel.value, dim: true, height: 1 }),
						]),
					]),
				]),

				// Reactive counter
				h(TuiBox, { border: "rounded", padding: [0, 1, 0, 1], width: 40, height: 6 }, () => [
					h(TuiColumn, { gap: 0, height: 4 }, () => [
						h(TuiText, { content: "Reactive Counter (auto-increments):", bold: true, height: 1 }),
						h(TuiText, { content: `Count: ${counter.value}`, color: "#3498DB", bold: true, height: 1 }),
						h(TuiText, { content: `Doubled: ${counter.value * 2}`, color: "#9B59B6", height: 1 }),
						h(TuiText, { content: counter.value % 2 === 0 ? "Even" : "Odd", color: "#E67E22", height: 1 }),
					]),
				]),

				// Row layout demo: tallest child = border(2) + content(1) = 3
				h(TuiRow, { gap: 2, height: 3 }, () => [
					h(TuiBox, { border: "single", padding: [0, 1, 0, 1], height: 3 }, () => [
						h(TuiText, { content: "Box A", color: "#E74C3C", height: 1 }),
					]),
					h(TuiBox, { border: "single", padding: [0, 1, 0, 1], height: 3 }, () => [
						h(TuiText, { content: "Box B", color: "#2ECC71", height: 1 }),
					]),
					h(TuiBox, { border: "single", padding: [0, 1, 0, 1], height: 3 }, () => [
						h(TuiText, { content: "Box C", color: "#3498DB", height: 1 }),
					]),
				]),

				h(TuiText, { content: "Tab to navigate, Ctrl+C to exit", dim: true, height: 1 }),
			]);
	},
});

export const vueDemoCommand = command({
	name: "vue-demo",
	description: "Demo Vue 3 custom renderer with TUI components",

	run: async () => {
		const tuiApp = createApp({ id: "vue-demo", title: "Vue TUI Demo" });

		const instance = createVueTuiApp(VueDemoApp, {
			app: tuiApp,
			errorHandler: (err, ctx) => {
				console.error(`Vue TUI error in ${ctx.component || "unknown"}:`, err);
			},
		});

		await instance.mount();
	},
});
