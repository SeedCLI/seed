import { command } from "@seedcli/core";
import { box, column, createApp, row, spacer, text } from "@seedcli/tui";

export const primitivesCommand = command({
	name: "primitives",
	description: "Demo core TUI primitives: text, box, row, column, spacer",

	run: async () => {
		const app = createApp({ id: "primitives-demo", title: "Primitives Demo" });

		// Layout budget: 24 rows total, padding [0,1,0,1] = 0 vertical, gap:1
		// Children: header(1) + styles-box(6) + borders-row(3) + horiz-row(1) + spacer-row(1) + nested-box(5) + footer(1) = 18
		// Gaps: 6 × 1 = 6. Total: 18 + 6 = 24. Fits exactly.

		const root = column(
			{ width: "fill", height: "fill", gap: 1, padding: [0, 1, 0, 1] },
			...[
				// Header
				text("=== TUI Primitives Demo ===", { bold: true, color: "#00BFFF", height: 1 }),

				// Text styles grouped in one box: border(2) + 4 lines = 6
				box(
					{ border: "rounded", padding: [0, 1, 0, 1], width: 45, height: 6 },
					column(
						{ gap: 0, height: 4 },
						...[
							text("Bold text", { bold: true, height: 1 }),
							text("Colored text", { color: "#FF6B6B", height: 1 }),
							text("Dim + italic", { dim: true, italic: true, height: 1 }),
							text("Inverse + underline", { inverse: true, underline: true, height: 1 }),
						],
					),
				),

				// Different border styles in a row: tallest child = border(2) + content(1) = 3
				row(
					{ gap: 2, height: 3 },
					...[
						box(
							{ border: "rounded", padding: [0, 1, 0, 1], height: 3 },
							text("Rounded", { color: "#9B59B6", height: 1 }),
						),
						box(
							{ border: "double", padding: [0, 1, 0, 1], height: 3 },
							text("Double", { color: "#E67E22", height: 1 }),
						),
						box(
							{ border: "bold", padding: [0, 1, 0, 1], height: 3 },
							text("Bold", { color: "#2ECC71", height: 1 }),
						),
					],
				),

				// Row layout: 3 colored texts
				row(
					{ gap: 2, height: 1 },
					...[
						text("[Col 1]", { color: "#2ECC71", height: 1 }),
						text("[Col 2]", { color: "#3498DB", height: 1 }),
						text("[Col 3]", { color: "#E74C3C", height: 1 }),
					],
				),

				// Row with spacer
				row(
					{ width: 50, height: 1 },
					...[
						text("Left", { bold: true, height: 1 }),
						spacer({ height: 1 }),
						text("Right", { bold: true, height: 1 }),
					],
				),

				// Nested layout: border(2) + text(1) + row(1) + spacer(1) = 5
				box(
					{ border: "single", padding: [0, 1, 0, 1], width: 50, height: 5 },
					column(
						{ gap: 0, height: 3 },
						...[
							text("Nested Layout", { bold: true, color: "#F1C40F", height: 1 }),
							row(
								{ gap: 2, height: 1 },
								...[
									text("[A]", { color: "#E74C3C", height: 1 }),
									text("[B]", { color: "#2ECC71", height: 1 }),
									text("[C]", { color: "#3498DB", height: 1 }),
								],
							),
							text("Column > Row nesting works!", { dim: true, height: 1 }),
						],
					),
				),

				// Footer
				text("Press Ctrl+C to exit", { dim: true, height: 1 }),
			],
		);

		app.mount(root);
		await app.run();
	},
});
