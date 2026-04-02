import { command } from "@seedcli/core";
import {
	createApp,
	text,
	box,
	column,
	row,
	createTheme,
	darkTheme,
	lightTheme,
	createThemeContext,
	applyTheme,
	resolveThemeForCapability,
	addEventListener,
} from "@seedcli/tui";
import type { Theme, KeyEvent, TuiEvent } from "@seedcli/tui";

export const themeCommand = command({
	name: "theme",
	description: "Demo theming: createTheme, darkTheme, lightTheme, context, capability downgrade",

	run: async () => {
		const app = createApp({ id: "theme-demo", title: "Theme Demo" });

		const customTheme = createTheme({
			name: "ocean",
			surface: { bg: "#0A1929", fg: "#B2BAC2", muted: "#5A6A7A", subtle: "#1A2A3A" },
			primary: { bg: "#1976D2", fg: "#FFFFFF", border: "#42A5F5" },
			accent: { bg: "#00BCD4", fg: "#FFFFFF" },
		});

		const ctx = createThemeContext(darkTheme);
		const themes: Theme[] = [darkTheme, lightTheme, customTheme];
		let themeIndex = 0;

		const themeNameText = text(`Theme: ${ctx.getTheme().name}`, { bold: true, height: 1 });

		// Preview nodes
		const surfacePreview = box(
			{ border: "rounded", padding: [0, 1, 0, 1], width: 40, height: 4 },
			column({ gap: 0, height: 2 }, ...[
				text("Surface preview", { height: 1 }),
				text("Muted text here", { height: 1 }),
			]),
		);
		const primaryPreview = box(
			{ border: "single", padding: [0, 1, 0, 1], width: 40, height: 3 },
			text("Primary button", { height: 1 }),
		);
		const statusPreviews = row({ gap: 2, height: 1 }, ...[
			text("Success", { height: 1 }),
			text("Warning", { height: 1 }),
			text("Error", { height: 1 }),
			text("Info", { height: 1 }),
		]);

		function applyCurrentTheme() {
			const theme = ctx.getTheme();
			themeNameText.content = `Theme: ${theme.name}`;
			applyTheme(surfacePreview, { color: "surface.fg", bgColor: "surface.bg" }, theme);
			applyTheme(surfacePreview.children[0].children[0], "surface.fg", theme);
			applyTheme(surfacePreview.children[0].children[1], "surface.muted", theme);
			applyTheme(primaryPreview, { color: "primary.fg", bgColor: "primary.bg" }, theme);
			applyTheme(primaryPreview.children[0], "primary.fg", theme);
			const [s, w, e, i] = statusPreviews.children;
			applyTheme(s, "success.fg", theme);
			applyTheme(w, "warning.fg", theme);
			applyTheme(e, "error.fg", theme);
			applyTheme(i, "info.fg", theme);
		}
		applyCurrentTheme();

		// Capability degradation
		const degraded256 = resolveThemeForCapability(darkTheme, { depth: "256", noColor: false });
		const degraded16 = resolveThemeForCapability(darkTheme, { depth: "16", noColor: false });

		// Controls
		const controls = box(
			{ border: "rounded", padding: [0, 1, 0, 1], width: 45, height: 5, focusable: true },
			column({ gap: 0, height: 3 }, ...[
				text("Controls:", { bold: true, height: 1 }),
				text("  t  Cycle themes (dark/light/ocean)", { height: 1 }),
				text("  d  Dark  |  l  Light", { height: 1 }),
			]),
		);

		addEventListener(controls, "key", ((event: KeyEvent) => {
			if (event.key === "t") {
				themeIndex = (themeIndex + 1) % themes.length;
				ctx.setTheme(themes[themeIndex]);
				applyCurrentTheme();
			} else if (event.key === "d") {
				themeIndex = 0;
				ctx.setTheme(darkTheme);
				applyCurrentTheme();
			} else if (event.key === "l") {
				themeIndex = 1;
				ctx.setTheme(lightTheme);
				applyCurrentTheme();
			}
		}) as (event: TuiEvent) => void);

		ctx.subscribe(() => applyCurrentTheme());

		// Layout: 24 rows, padding [0,1,0,1], gap:1
		// header(1) + name(1) + surface(4) + primary(3) + status(1) + cap-box(5) + controls(5) + footer(1) = 21
		// Gaps: 7 × 1 = 7. Total: 21 + 7 = 28. Over!
		// Reduce: combine primary+status, remove separate cap text
		// header(1) + name(1) + surface(4) + primary(3) + status(1) + cap(3) + controls(5) + footer(1) = 19 + 7 gaps = 26. Still over.
		// Use fewer children:
		// header(1) + row[surface(4), primary(3)](4) + status(1) + cap-box(4) + controls(5) + footer(1) = 16 + 5 gaps = 21. Fits!

		const root = column({ width: "fill", height: "fill", gap: 1, padding: [0, 1, 0, 1] }, ...[
			text("=== Theme System Demo ===", { bold: true, color: "#00BFFF", height: 1 }),

			// Theme preview: surface + primary side by side
			row({ gap: 2, height: 4 }, ...[
				surfacePreview,
				column({ gap: 0, height: 4 }, ...[
					themeNameText,
					primaryPreview,
				]),
			]),

			statusPreviews,

			// Capability degradation: border(2) + 2 lines = 4
			box({ border: "single", padding: [0, 1, 0, 1], width: 50, height: 4 }, column({ gap: 0, height: 2 }, ...[
				text(`256-color primary: ${degraded256.primary.bg}`, { color: degraded256.primary.bg, height: 1 }),
				text(`16-color primary: ${degraded16.primary.bg}`, { color: degraded16.primary.bg, height: 1 }),
			])),

			controls,

			text("Press Ctrl+C to exit", { dim: true, height: 1 }),
		]);

		app.mount(root);
		await app.run();
	},
});
