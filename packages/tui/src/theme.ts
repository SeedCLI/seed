import type { ColorCapability, TuiNode } from "@seedcli/tui-core";

// ─── Theme Token Interfaces ───

export type SurfaceTokens = {
	[key: string]: string;
	bg: string;
	fg: string;
	muted: string;
	subtle: string;
};

export type PrimaryTokens = {
	[key: string]: string;
	bg: string;
	fg: string;
	border: string;
};

export type SecondaryTokens = {
	[key: string]: string;
	bg: string;
	fg: string;
	border: string;
};

export type AccentTokens = {
	[key: string]: string;
	bg: string;
	fg: string;
};

export type StatusTokens = {
	[key: string]: string;
	bg: string;
	fg: string;
};

export type TextTokens = {
	[key: string]: string;
	primary: string;
	secondary: string;
	muted: string;
	disabled: string;
	inverse: string;
};

export type BorderTokens = {
	[key: string]: string;
	default: string;
	focus: string;
	active: string;
};

export interface Theme {
	[key: string]:
		| string
		| SurfaceTokens
		| PrimaryTokens
		| SecondaryTokens
		| AccentTokens
		| StatusTokens
		| TextTokens
		| BorderTokens;
	name: string;
	surface: SurfaceTokens;
	primary: PrimaryTokens;
	secondary: SecondaryTokens;
	accent: AccentTokens;
	success: StatusTokens;
	warning: StatusTokens;
	error: StatusTokens;
	info: StatusTokens;
	text: TextTokens;
	border: BorderTokens;
	focusRing: string;
}

// ─── Built-in Themes ───

export const darkTheme: Theme = {
	name: "dark",
	surface: {
		bg: "#1a1a2e",
		fg: "#e0e0e0",
		muted: "#2a2a3e",
		subtle: "#333350",
	},
	primary: {
		bg: "#4c6ef5",
		fg: "#ffffff",
		border: "#5c7cfa",
	},
	secondary: {
		bg: "#495057",
		fg: "#dee2e6",
		border: "#6c757d",
	},
	accent: {
		bg: "#f59f00",
		fg: "#1a1a2e",
	},
	success: {
		bg: "#40c057",
		fg: "#ffffff",
	},
	warning: {
		bg: "#fab005",
		fg: "#1a1a2e",
	},
	error: {
		bg: "#fa5252",
		fg: "#ffffff",
	},
	info: {
		bg: "#339af0",
		fg: "#ffffff",
	},
	text: {
		primary: "#e0e0e0",
		secondary: "#adb5bd",
		muted: "#868e96",
		disabled: "#495057",
		inverse: "#1a1a2e",
	},
	border: {
		default: "#495057",
		focus: "#5c7cfa",
		active: "#748ffc",
	},
	focusRing: "#5c7cfa",
};

export const lightTheme: Theme = {
	name: "light",
	surface: {
		bg: "#ffffff",
		fg: "#212529",
		muted: "#f1f3f5",
		subtle: "#e9ecef",
	},
	primary: {
		bg: "#4c6ef5",
		fg: "#ffffff",
		border: "#3b5bdb",
	},
	secondary: {
		bg: "#e9ecef",
		fg: "#495057",
		border: "#ced4da",
	},
	accent: {
		bg: "#f59f00",
		fg: "#ffffff",
	},
	success: {
		bg: "#40c057",
		fg: "#ffffff",
	},
	warning: {
		bg: "#fab005",
		fg: "#212529",
	},
	error: {
		bg: "#fa5252",
		fg: "#ffffff",
	},
	info: {
		bg: "#339af0",
		fg: "#ffffff",
	},
	text: {
		primary: "#212529",
		secondary: "#495057",
		muted: "#868e96",
		disabled: "#adb5bd",
		inverse: "#ffffff",
	},
	border: {
		default: "#ced4da",
		focus: "#3b5bdb",
		active: "#4c6ef5",
	},
	focusRing: "#3b5bdb",
};

// ─── Theme Creation ───

/** Deep-merge partial overrides into a base theme. */
export function createTheme(overrides: DeepPartial<Theme>, base: Theme = darkTheme): Theme {
	return deepMerge(structuredClone(base), overrides);
}

type DeepPartial<T> = {
	[K in keyof T]?: T[K] extends Record<string, unknown> ? DeepPartial<T[K]> : T[K];
};

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Theme {
	for (const key of Object.keys(source)) {
		const sourceVal = source[key];
		const targetVal = target[key];

		if (
			sourceVal !== undefined &&
			typeof sourceVal === "object" &&
			sourceVal !== null &&
			!Array.isArray(sourceVal) &&
			typeof targetVal === "object" &&
			targetVal !== null &&
			!Array.isArray(targetVal)
		) {
			deepMerge(targetVal as Record<string, unknown>, sourceVal as Record<string, unknown>);
		} else if (sourceVal !== undefined) {
			target[key] = sourceVal;
		}
	}

	return target as unknown as Theme;
}

// ─── Capability-Based Theme Resolution ───

/**
 * Map of truecolor hex values to their closest ANSI 16-color names.
 * Used when downgrading themes for 16-color terminals.
 */
const ansi16ColorMap: Record<string, string> = {
	// Reds / warm
	"#fa5252": "red",
	"#fab005": "yellow",
	"#f59f00": "yellow",
	// Greens
	"#40c057": "green",
	// Blues
	"#4c6ef5": "blue",
	"#5c7cfa": "blue",
	"#3b5bdb": "blue",
	"#748ffc": "blue",
	"#339af0": "cyan",
	// Neutrals — dark
	"#1a1a2e": "black",
	"#212529": "black",
	"#2a2a3e": "black",
	"#333350": "black",
	"#495057": "black",
	// Neutrals — mid
	"#6c757d": "white",
	"#868e96": "white",
	"#adb5bd": "white",
	"#ced4da": "white",
	// Neutrals — light
	"#dee2e6": "white",
	"#e0e0e0": "white",
	"#e9ecef": "white",
	"#f1f3f5": "white",
	"#ffffff": "white",
};

/**
 * Attempt to map a hex color to its closest ANSI 16-color name.
 * Falls back to a luminance-based heuristic for unknown hex values.
 */
function hexToAnsi16(hex: string): string {
	if (!hex || !hex.startsWith("#")) return hex;

	const mapped = ansi16ColorMap[hex.toLowerCase()];
	if (mapped) return mapped;

	// Heuristic fallback based on luminance and hue
	const r = Number.parseInt(hex.slice(1, 3), 16);
	const g = Number.parseInt(hex.slice(3, 5), 16);
	const b = Number.parseInt(hex.slice(5, 7), 16);

	if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return hex;

	const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

	// Very dark or very bright
	if (luminance < 30) return "black";
	if (luminance > 225) return "white";

	// Determine dominant channel
	const max = Math.max(r, g, b);
	if (max === r && r > g * 1.4 && r > b * 1.4) return "red";
	if (max === g && g > r * 1.4 && g > b * 1.4) return "green";
	if (max === b && b > r * 1.2 && b > g * 1.2) return "blue";
	if (r > 180 && g > 180 && b < 100) return "yellow";
	if (r > 180 && b > 180 && g < 100) return "magenta";
	if (g > 180 && b > 180 && r < 100) return "cyan";

	return luminance > 128 ? "white" : "black";
}

/**
 * Convert a hex color to the closest ANSI 256 color index string.
 * Returns a string like "38" (color index) for use by renderers that
 * understand the 256-palette convention.
 */
function hexToAnsi256(hex: string): string {
	if (!hex || !hex.startsWith("#")) return hex;

	const r = Number.parseInt(hex.slice(1, 3), 16);
	const g = Number.parseInt(hex.slice(3, 5), 16);
	const b = Number.parseInt(hex.slice(5, 7), 16);

	if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return hex;

	// Check if it's close to a grayscale value (ANSI 232-255)
	if (r === g && g === b) {
		if (r < 8) return "16";
		if (r > 248) return "231";
		return String(Math.round(((r - 8) / 247) * 24) + 232);
	}

	// Map to the 6x6x6 color cube (ANSI 16-231)
	const ri = Math.round((r / 255) * 5);
	const gi = Math.round((g / 255) * 5);
	const bi = Math.round((b / 255) * 5);

	return String(16 + 36 * ri + 6 * gi + bi);
}

/**
 * Adapt a single color token for the given color capability depth.
 */
function adaptColor(color: string, depth: ColorCapability["depth"]): string {
	switch (depth) {
		case "truecolor":
			return color;
		case "256":
			return hexToAnsi256(color);
		case "16":
			return hexToAnsi16(color);
		case "none":
			return "";
	}
}

/**
 * Adapt all string values in a theme token group to the given color capability.
 */
function adaptTokenGroup<T extends { [key: string]: string }>(
	group: T,
	depth: ColorCapability["depth"],
): T {
	const result: { [key: string]: string } = {};

	for (const [key, value] of Object.entries(group)) {
		result[key] = adaptColor(value, depth);
	}

	return result as T;
}

/**
 * Resolve a theme for a given color capability, downgrading truecolor
 * tokens to 256-color, 16-color, or stripping them entirely.
 */
export function resolveThemeForCapability(theme: Theme, colorCapability: ColorCapability): Theme {
	const { depth } = colorCapability;

	// Truecolor passes through unchanged
	if (depth === "truecolor") return theme;

	return {
		name: theme.name,
		surface: adaptTokenGroup(theme.surface, depth),
		primary: adaptTokenGroup(theme.primary, depth),
		secondary: adaptTokenGroup(theme.secondary, depth),
		accent: adaptTokenGroup(theme.accent, depth),
		success: adaptTokenGroup(theme.success, depth),
		warning: adaptTokenGroup(theme.warning, depth),
		error: adaptTokenGroup(theme.error, depth),
		info: adaptTokenGroup(theme.info, depth),
		text: adaptTokenGroup(theme.text, depth),
		border: adaptTokenGroup(theme.border, depth),
		focusRing: adaptColor(theme.focusRing, depth),
	};
}

// ─── Token Resolution ───

/**
 * Token path type — dot-separated paths into the Theme structure.
 * For example: "surface.bg", "text.primary", "error.fg", "focusRing"
 */
export type TokenPath =
	| `surface.${keyof SurfaceTokens}`
	| `primary.${keyof PrimaryTokens}`
	| `secondary.${keyof SecondaryTokens}`
	| `accent.${keyof AccentTokens}`
	| `success.${keyof StatusTokens}`
	| `warning.${keyof StatusTokens}`
	| `error.${keyof StatusTokens}`
	| `info.${keyof StatusTokens}`
	| `text.${keyof TextTokens}`
	| `border.${keyof BorderTokens}`
	| "focusRing";

/**
 * Resolve a dot-path token to its color value from a theme.
 */
function resolveToken(theme: Theme, tokenPath: TokenPath): string {
	if (tokenPath === "focusRing") return theme.focusRing;

	const dotIndex = tokenPath.indexOf(".");
	if (dotIndex === -1) return "";

	const group = tokenPath.slice(0, dotIndex) as keyof Omit<Theme, "name" | "focusRing">;
	const key = tokenPath.slice(dotIndex + 1);

	const tokenGroup = theme[group];
	if (tokenGroup && typeof tokenGroup === "object" && key in tokenGroup) {
		return (tokenGroup as { [key: string]: string })[key];
	}

	return "";
}

/**
 * Apply a theme token (or token pair) to a TuiNode's style props.
 *
 * Accepts either:
 * - A single token path: sets `color` on the node
 * - An object `{ color?, bgColor? }` with token paths: sets both
 */
export function applyTheme(
	node: TuiNode,
	tokenName: TokenPath | { color?: TokenPath; bgColor?: TokenPath },
	theme: Theme,
): void {
	if (typeof tokenName === "string") {
		node.props.color = resolveToken(theme, tokenName);
	} else {
		if (tokenName.color) {
			node.props.color = resolveToken(theme, tokenName.color);
		}
		if (tokenName.bgColor) {
			node.props.bgColor = resolveToken(theme, tokenName.bgColor);
		}
	}

	// Mark dirty so the node re-renders with the new colors
	node.dirty = true;
}

// ─── Theme Context ───

export interface ThemeContext {
	/** Get the currently active theme. */
	getTheme(): Theme;
	/** Set the active theme, notifying all subscribers. */
	setTheme(theme: Theme): void;
	/** Subscribe to theme changes. Returns an unsubscribe function. */
	subscribe(cb: (theme: Theme) => void): () => void;
}

/**
 * Create a theme context — a simple holder for the current theme
 * with change notification support.
 */
export function createThemeContext(initial: Theme = darkTheme): ThemeContext {
	let current: Theme = initial;
	const subscribers = new Set<(theme: Theme) => void>();

	return {
		getTheme(): Theme {
			return current;
		},

		setTheme(theme: Theme): void {
			current = theme;
			for (const cb of subscribers) {
				cb(current);
			}
		},

		subscribe(cb: (theme: Theme) => void): () => void {
			subscribers.add(cb);
			return () => {
				subscribers.delete(cb);
			};
		},
	};
}
