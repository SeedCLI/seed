import { command } from "@seedcli/core";
import type { TuiEvent, TuiNode } from "@seedcli/tui";
import {
	addEventListener,
	applyTheme,
	box,
	column,
	createApp,
	createEffect,
	createSignal,
	createTheme,
	input,
	progress,
	row,
	select,
	spacer,
	text,
} from "@seedcli/tui";

/**
 * Add focus/blur visual indicator to a box by changing its border color.
 * The `focusableChild` is the component inside the box that receives focus.
 */
function addFocusRing(
	wrapper: TuiNode,
	focusableChild: TuiNode,
	focusColor: string,
	blurColor: string,
) {
	const setBorder = (color: string) => {
		const border = wrapper.props.border;
		if (typeof border === "object" && border !== null) {
			wrapper.props.border = { ...border, color };
		} else if (typeof border === "string") {
			wrapper.props.border = { style: border, color };
		}
		wrapper.dirty = true;
	};

	setBorder(blurColor);

	addEventListener(focusableChild, "focus", (() => {
		setBorder(focusColor);
	}) as (e: TuiEvent) => void);

	addEventListener(focusableChild, "blur", (() => {
		setBorder(blurColor);
	}) as (e: TuiEvent) => void);
}

export const fullAppCommand = command({
	name: "full-app",
	description: "Full integration demo: themed app with input, select, progress, and focus",

	run: async () => {
		const theme = createTheme({
			name: "app-theme",
			primary: { bg: "#1565C0", fg: "#FFFFFF", border: "#42A5F5" },
			accent: { bg: "#00897B", fg: "#FFFFFF" },
			surface: { bg: "#121212", fg: "#E0E0E0", muted: "#757575", subtle: "#1E1E1E" },
		});

		const app = createApp({
			id: "full-app",
			title: "TUI Full Integration",
		});

		// State
		const [getProgress, setProgress] = createSignal(0);
		const tasks: string[] = [];

		const statusText = text("Ready", { dim: true, height: 1 });

		// ── Header ──
		const header = box(
			{ width: "fill", height: 1, padding: [0, 1, 0, 1] },
			row(
				{ height: 1 },
				...[text(" Task Manager ", { bold: true, height: 1 }), spacer({ height: 1 }), statusText],
			),
		);
		applyTheme(header, { color: "primary.fg", bgColor: "primary.bg" }, theme);
		applyTheme(header.children[0].children[0], "primary.fg", theme);

		// ── Input ──
		const taskInput = input({
			placeholder: "Enter a new task...",
			onSubmit: (val) => {
				if (val.trim()) {
					tasks.push(val.trim());
					updateTaskList();
					updateProgress();
					statusText.content = `Added: "${val.trim()}"`;
				}
			},
			props: { height: 1 },
		});

		// Input box: border(2) + label(1) + input(1) = 4
		const inputBox = box(
			{ border: "rounded", padding: [0, 1, 0, 1], width: "fill", height: 4 },
			column({ gap: 0, height: 2 }, ...[text("New Task:", { bold: true, height: 1 }), taskInput]),
		);
		addFocusRing(inputBox, taskInput, theme.primary.border, "#333333");

		// ── Select ──
		const prioritySelect = select({
			items: [
				{ label: "Low", value: "low" },
				{ label: "Medium", value: "medium" },
				{ label: "High", value: "high" },
				{ label: "Critical", value: "critical" },
			],
			onSubmit: (item) => {
				statusText.content = `Priority: ${item.label}`;
			},
			props: { height: 4 },
		});

		// Select box: border(2) + label(1) + 4 items = 7
		const selectBox = box(
			{ border: "single", padding: [0, 1, 0, 1], width: 25, height: 7 },
			column(
				{ gap: 0, height: 5 },
				...[text("Priority:", { bold: true, height: 1 }), prioritySelect],
			),
		);
		addFocusRing(selectBox, prioritySelect, theme.primary.border, "#333333");

		// ── Task List ──
		const taskListTitle = text("Tasks (0):", { bold: true, height: 1 });
		// Task content grows dynamically — give it fill height
		const taskListContent = text("No tasks yet", { dim: true });

		function updateTaskList() {
			taskListTitle.content = `Tasks (${tasks.length}):`;
			if (tasks.length === 0) {
				taskListContent.content = "No tasks yet";
			} else {
				taskListContent.content = tasks.map((t, i) => `  ${i + 1}. ${t}`).join("\n");
			}
		}

		// Task list box: fill height (grows with available space)
		// border(2) is fixed overhead, content fills the rest
		const taskListBox = box(
			{ border: "single", padding: [0, 1, 0, 1], width: "fill", overflow: "clip" },
			column({ gap: 0 }, ...[taskListTitle, taskListContent]),
		);

		// ── Progress ──
		const progressBar = progress({
			value: 0,
			width: 30,
			label: "Completion",
			showPercentage: true,
			props: { height: 1 },
		});

		function updateProgress() {
			const val = tasks.length > 0 ? Math.min(tasks.length / 10, 1) : 0;
			setProgress(val);
			const p = progressBar as TuiNode & {
				_progress: { setValue: (v: number) => void };
			};
			p._progress.setValue(getProgress());
		}

		createEffect(() => {
			const p = getProgress();
			if (p >= 1) {
				statusText.content = "All tasks complete!";
			}
		}, [getProgress]);

		// ── Footer ──
		const footer = box(
			{ width: "fill", height: 1, padding: [0, 1, 0, 1] },
			row(
				{ height: 1 },
				...[
					text("Tab: navigate", { dim: true, height: 1 }),
					text(" | ", { dim: true, height: 1 }),
					text("Enter: submit", { dim: true, height: 1 }),
					text(" | ", { dim: true, height: 1 }),
					text("Ctrl+C: quit", { dim: true, height: 1 }),
				],
			),
		);
		applyTheme(footer, { bgColor: "surface.subtle" }, theme);

		// ── Layout ──
		// Root (24 rows, gap:0):
		//   header(1) + content(fill) + footer(1) = content gets 22
		// Content (gap:1, padding:1 → contentHeight=18):
		//   topRow(height:7) + taskList(fill) + progress(1) = taskList gets 18-7-1-2gaps = 8
		const root = column(
			{ width: "fill", height: "fill", gap: 0 },
			...[
				header,
				column(
					{ gap: 1, padding: 1, width: "fill" },
					...[
						// Top row: input + select side by side
						row(
							{ gap: 2, width: "fill", height: 7 },
							...[
								column({ width: "fill", height: 7 }, ...[inputBox, spacer({ height: 1 })]),
								selectBox,
							],
						),
						// Task list fills remaining vertical space
						taskListBox,
						progressBar,
					],
				),
				footer,
			],
		);

		app.mount(root);
		await app.run();
	},
});
