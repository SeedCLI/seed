import { command } from "@seedcli/core";
import {
	createApp,
	text,
	box,
	column,
	row,
	input,
	select,
	progress,
	table,
	code,
} from "@seedcli/tui";

export const componentsCommand = command({
	name: "components",
	description: "Demo interactive TUI components: input, select, progress, table, code",

	run: async () => {
		const app = createApp({ id: "components-demo", title: "Components Demo" });

		// Input field
		const nameInput = input({
			placeholder: "Type your name...",
			onChange: (val) => {
				greeting.content = val ? `Hello, ${val}!` : "";
			},
		});

		const greeting = text("", { color: "#2ECC71", height: 1 });

		// Select
		const colorSelect = select({
			items: [
				{ label: "Red", value: "red" },
				{ label: "Green", value: "green" },
				{ label: "Blue", value: "blue" },
			],
			onSubmit: (item) => {
				selectResult.content = `Selected: ${item.label}`;
			},
		});

		const selectResult = text("Enter to select", { dim: true, height: 1 });

		// Progress bars
		const prog = progress({
			value: 0.65,
			width: 30,
			label: "Download",
			showPercentage: true,
			props: { height: 1 },
		});

		const indProg = progress({
			indeterminate: true,
			width: 20,
			label: "Loading",
			props: { height: 1 },
		});

		// Table
		const dataTable = table({
			columns: [
				{ header: "Package", width: 12 },
				{ header: "Version", width: 8 },
				{ header: "Size", width: 6, align: "right" },
			],
			rows: [
				["tui-core", "1.0.0", "24KB"],
				["tui", "1.0.0", "18KB"],
				["tui-vue", "1.0.0", "12KB"],
			],
			headerStyle: { color: "#3498DB" },
			onSelect: (idx) => {
				tableResult.content = `Row ${idx} selected`;
			},
			props: { height: 4 },
		});

		const tableResult = text("Arrow keys to navigate table", { dim: true, height: 1 });

		// Code block
		const codeBlock = code({
			content: 'const app = createApp({ id: "demo" });\napp.mount(root);',
			language: "typescript",
			lineNumbers: true,
			highlightLines: [1],
			props: { height: 4 },
		});

		// Layout: 24 rows, padding [0,1,0,1] = 0 vertical, gap:1
		// header(1) + input-box(4) + select-row(4) + progress-row(1) + table-box(7) + code(4) + footer(1) = 22
		// Gaps: 6 × 1 = 6. Total: 22 + 6 = 28. Over!
		// Fix: use gap:0 between some sections, reduce table
		// Actual: header(1) + input-box(4) + row[select(5)+result](5) + progress(1) + table(4)+result(1) + code(4) + footer(1) = 21 + 6 gaps = 27
		// Still over. Use fewer children:
		// header(1) + row[input(4), select(5)](5) + progress(1) + table-box(6) + code(4) + footer(1) = 18 + 5 gaps = 23. Fits!

		const root = column({ width: "fill", height: "fill", gap: 1, padding: [0, 1, 0, 1] }, ...[
			text("=== TUI Components Demo ===", { bold: true, color: "#00BFFF", height: 1 }),

			// Input + Select side by side: height = max(4, 5) = 5
			row({ gap: 2, height: 7 }, ...[
				box({ border: "rounded", padding: [0, 1, 0, 1], width: 35, height: 7 }, column({ gap: 0, height: 5 }, ...[
					text("Input:", { bold: true, height: 1 }),
					nameInput,
					greeting,
					text("", { height: 2 }),
				])),
				box({ border: "single", padding: [0, 1, 0, 1], width: 25, height: 7 }, column({ gap: 0, height: 5 }, ...[
					text("Select:", { bold: true, height: 1 }),
					colorSelect,
					selectResult,
				])),
			]),

			// Progress bars
			row({ gap: 2, height: 1 }, ...[prog, indProg]),

			// Table section: border(2) + header(1) + 3 rows + result = 7
			box({ border: "single", padding: [0, 1, 0, 1], height: 7, width: 40 }, column({ gap: 0, height: 5 }, ...[
				text("Table:", { bold: true, height: 1 }),
				dataTable,
				tableResult,
			])),

			// Code block: border(2) + 2 lines = 4
			codeBlock,

			text("Tab to navigate, Ctrl+C to exit", { dim: true, height: 1 }),
		]);

		app.mount(root);
		await app.run();
	},
});
