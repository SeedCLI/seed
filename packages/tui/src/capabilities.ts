import type { CapabilityProfile, ColorCapability, TerminalCapabilities } from "@seedcli/tui-core";

/**
 * Detect terminal capabilities from the current environment.
 */
export function detectCapabilities(): TerminalCapabilities {
	const isTTY = Boolean(process.stdin.isTTY && process.stdout.isTTY);
	const color = detectColorCapability();
	const profile = resolveProfile(isTTY, color);

	return {
		isTTY,
		color,
		mouseTracking: isTTY, // Assume mouse tracking available if TTY
		alternateScreen: isTTY,
		unicode: detectUnicode(),
		profile,
	};
}

function detectColorCapability(): ColorCapability {
	// Check NO_COLOR convention
	if (process.env.NO_COLOR !== undefined) {
		return { depth: "none", noColor: true };
	}

	// Check FORCE_COLOR
	if (process.env.FORCE_COLOR !== undefined) {
		const level = Number.parseInt(process.env.FORCE_COLOR, 10);
		if (level >= 3) return { depth: "truecolor", noColor: false };
		if (level >= 2) return { depth: "256", noColor: false };
		if (level >= 1) return { depth: "16", noColor: false };
		return { depth: "none", noColor: true };
	}

	// Check COLORTERM
	const colorterm = process.env.COLORTERM;
	if (colorterm === "truecolor" || colorterm === "24bit") {
		return { depth: "truecolor", noColor: false };
	}

	// Check TERM
	const term = process.env.TERM ?? "";
	if (term.includes("256color")) {
		return { depth: "256", noColor: false };
	}
	if (term === "dumb") {
		return { depth: "none", noColor: true };
	}

	// Check stdout color depth (Node/Bun API)
	if (process.stdout.isTTY) {
		const depth = (process.stdout as NodeJS.WriteStream & { getColorDepth?: () => number })
			.getColorDepth?.();
		if (depth !== undefined) {
			if (depth >= 24) return { depth: "truecolor", noColor: false };
			if (depth >= 8) return { depth: "256", noColor: false };
			if (depth >= 4) return { depth: "16", noColor: false };
		}
		// Default TTY: assume 256 color
		return { depth: "256", noColor: false };
	}

	return { depth: "none", noColor: true };
}

function detectUnicode(): boolean {
	const lang = process.env.LANG ?? "";
	const lcAll = process.env.LC_ALL ?? "";
	return lang.includes("UTF-8") || lang.includes("utf-8") || lcAll.includes("UTF-8") || lcAll.includes("utf-8");
}

function resolveProfile(isTTY: boolean, color: ColorCapability): CapabilityProfile {
	if (!isTTY) {
		if (color.noColor) return "plain";
		return "stream";
	}

	if (color.noColor || color.depth === "none") return "reduced";

	return "full";
}
