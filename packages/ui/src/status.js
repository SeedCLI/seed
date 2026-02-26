import { colors } from "@seedcli/print";
const STATUS_CONFIG = {
    success: { icon: "✔", color: colors.green },
    fail: { icon: "✖", color: colors.red },
    skip: { icon: "◌", color: colors.gray },
    pending: { icon: "…", color: colors.yellow },
};
/**
 * Render a status line with an icon and color based on state.
 */
export function status(label, state) {
    const { icon, color } = STATUS_CONFIG[state];
    return color(`${icon} ${label}`);
}
//# sourceMappingURL=status.js.map