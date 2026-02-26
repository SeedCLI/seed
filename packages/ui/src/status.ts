import { colors } from "@seedcli/print";
import type { StatusState } from "./types.js";

const STATUS_CONFIG: Record<StatusState, { icon: string; color: (s: string) => string }> = {
	success: { icon: "✔", color: colors.green },
	fail: { icon: "✖", color: colors.red },
	skip: { icon: "◌", color: colors.gray },
	pending: { icon: "…", color: colors.yellow },
};

/**
 * Render a status line with an icon and color based on state.
 */
export function status(label: string, state: StatusState): string {
	const { icon, color } = STATUS_CONFIG[state];
	return color(`${icon} ${label}`);
}
