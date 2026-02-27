import type { ArgDef, FlagDef } from "../types/args.js";
import type { Command } from "../types/command.js";

// ─── ANSI helpers (zero-dependency) ───

const supportsColor =
	process.env.FORCE_COLOR !== undefined ||
	(process.stdout.isTTY === true && process.env.NO_COLOR === undefined);
const bold = (s: string) => (supportsColor ? `\x1b[1m${s}\x1b[0m` : s);
const dim = (s: string) => (supportsColor ? `\x1b[2m${s}\x1b[0m` : s);
const cyan = (s: string) => (supportsColor ? `\x1b[36m${s}\x1b[0m` : s);
const yellow = (s: string) => (supportsColor ? `\x1b[33m${s}\x1b[0m` : s);

// ─── Help Options ───

export interface HelpOptions {
	/** Custom header text */
	header?: string;
	/** Show command aliases (default: true) */
	showAliases?: boolean;
	/** Show hidden commands (default: false) */
	showHidden?: boolean;
	/** Alphabetical sort (default: true) */
	sortCommands?: boolean;
	/** CLI brand name */
	brand?: string;
	/** CLI version */
	version?: string;
	/** Whether --version flag is enabled (default: true) */
	versionEnabled?: boolean;
}

// ─── Help Renderer ───

/**
 * Generate help text for the entire CLI (global help).
 *
 * Output format:
 * ```
 * mycli v1.0.0
 *
 * USAGE
 *   mycli <command> [options]
 *
 * COMMANDS
 *   deploy    Deploy the application
 *   dev       Start development mode
 *   db        Database commands
 *
 * FLAGS
 *   --help, -h       Show help
 *   --version, -v    Show version
 * ```
 */
export function renderGlobalHelp(commands: Command[], options: HelpOptions = {}): string {
	const {
		header,
		showAliases = true,
		showHidden = false,
		sortCommands = true,
		brand = "cli",
		version,
	} = options;

	const lines: string[] = [];

	// Header
	if (header) {
		lines.push(bold(header));
	} else if (version) {
		lines.push(bold(`${brand} v${version}`));
	} else {
		lines.push(bold(brand));
	}
	lines.push("");

	// Usage
	lines.push(bold(yellow("USAGE")));
	lines.push(`  ${brand} <command> [options]`);
	lines.push("");

	// Commands
	const visibleCmds = commands.filter((cmd) => showHidden || !cmd.hidden);
	if (sortCommands) {
		visibleCmds.sort((a, b) => a.name.localeCompare(b.name));
	}

	if (visibleCmds.length > 0) {
		lines.push(bold(yellow("COMMANDS")));

		// Calculate padding for alignment
		const maxNameLen = Math.max(
			0,
			...visibleCmds.map((cmd) => formatCommandName(cmd, showAliases).length),
		);

		for (const cmd of visibleCmds) {
			const name = formatCommandName(cmd, showAliases);
			const padding = " ".repeat(Math.max(2, maxNameLen - name.length + 4));
			const desc = cmd.description ?? "";
			lines.push(`  ${cyan(name)}${padding}${dim(desc)}`);
		}
		lines.push("");
	}

	// Global flags
	lines.push(bold(yellow("FLAGS")));
	lines.push(`  ${cyan("--help, -h")}       Show help`);
	if (options.versionEnabled !== false) {
		lines.push(`  ${cyan("--version, -v")}    Show version`);
	}
	lines.push("");

	return lines.join("\n");
}

/**
 * Generate help text for a specific command.
 *
 * Output format:
 * ```
 * Deploy the application
 *
 * USAGE
 *   mycli deploy <environment> [options]
 *
 * ARGUMENTS
 *   environment    Target environment (required)
 *
 * FLAGS
 *   --force, -f          Force deployment (default: false)
 *   --replicas, -r <n>   Number of replicas
 *
 * SUBCOMMANDS
 *   rollback    Rollback the deployment
 * ```
 */
export function renderCommandHelp(cmd: Command, options: HelpOptions = {}): string {
	const { brand = "cli", showAliases = true, showHidden = false } = options;

	const lines: string[] = [];

	// Description
	if (cmd.description) {
		lines.push(bold(cmd.description));
		lines.push("");
	}

	// Aliases
	if (showAliases && cmd.alias && cmd.alias.length > 0) {
		lines.push(bold(yellow("ALIASES")));
		lines.push(`  ${cmd.alias.join(", ")}`);
		lines.push("");
	}

	// Usage line
	lines.push(bold(yellow("USAGE")));
	lines.push(`  ${brand} ${buildUsageLine(cmd)}`);
	lines.push("");

	// Arguments
	const argEntries = Object.entries(cmd.args ?? {});
	if (argEntries.length > 0) {
		lines.push(bold(yellow("ARGUMENTS")));

		const maxNameLen = Math.max(0, ...argEntries.map(([name]) => name.length));

		for (const [name, def] of argEntries) {
			const padding = " ".repeat(Math.max(2, maxNameLen - name.length + 4));
			const meta = formatArgMeta(def);
			lines.push(`  ${cyan(name)}${padding}${dim(meta)}`);
		}
		lines.push("");
	}

	// Flags
	const flagEntries = Object.entries(cmd.flags ?? {}).filter(([, def]) => !def.hidden);
	if (flagEntries.length > 0) {
		lines.push(bold(yellow("FLAGS")));

		const formattedFlags = flagEntries.map(([name, def]) => ({
			label: formatFlagLabel(name, def),
			meta: formatFlagMeta(def),
		}));

		const maxLabelLen = Math.max(0, ...formattedFlags.map((f) => f.label.length));

		for (const { label, meta } of formattedFlags) {
			const padding = " ".repeat(Math.max(2, maxLabelLen - label.length + 4));
			lines.push(`  ${cyan(label)}${padding}${dim(meta)}`);
		}
		lines.push("");
	}

	// Subcommands
	const subcommands = (cmd.subcommands ?? []).filter((sub) => showHidden || !sub.hidden);
	if (subcommands.length > 0) {
		lines.push(bold(yellow("SUBCOMMANDS")));

		const maxNameLen = Math.max(0, ...subcommands.map((sub) => sub.name.length));

		for (const sub of subcommands) {
			const padding = " ".repeat(Math.max(2, maxNameLen - sub.name.length + 4));
			const desc = sub.description ?? "";
			lines.push(`  ${cyan(sub.name)}${padding}${dim(desc)}`);
		}
		lines.push("");
	}

	return lines.join("\n");
}

// ─── Formatting Helpers ───

function formatCommandName(cmd: Command, showAliases: boolean): string {
	let name = cmd.name;
	if (showAliases && cmd.alias && cmd.alias.length > 0) {
		name += ` (${cmd.alias.join(", ")})`;
	}
	return name;
}

function buildUsageLine(cmd: Command): string {
	const parts: string[] = [cmd.name];

	// Add positional args
	for (const [name, def] of Object.entries(cmd.args ?? {})) {
		if (def.required) {
			parts.push(`<${name}>`);
		} else {
			parts.push(`[${name}]`);
		}
	}

	// Add [options] if there are flags
	const flagCount = Object.keys(cmd.flags ?? {}).length;
	if (flagCount > 0) {
		parts.push("[options]");
	}

	return parts.join(" ");
}

function formatArgMeta(def: ArgDef): string {
	const parts: string[] = [];

	if (def.description) {
		parts.push(def.description);
	}

	const argMetaChoices = def.choices as readonly string[] | undefined;
	if (argMetaChoices && argMetaChoices.length > 0) {
		parts.push(`(${argMetaChoices.join(" | ")})`);
	}

	if (def.required) {
		parts.push("(required)");
	}

	if (def.default !== undefined) {
		parts.push(`(default: ${def.default})`);
	}

	return parts.join(" ");
}

function formatFlagLabel(name: string, def: FlagDef): string {
	let label = `--${name}`;
	if (def.alias) {
		label = `-${def.alias}, ${label}`;
	}

	// Add value placeholder
	if (def.type !== "boolean") {
		const placeholder = def.type === "number" || def.type === "number[]" ? "<n>" : "<value>";
		label += ` ${placeholder}`;
	}

	return label;
}

function formatFlagMeta(def: FlagDef): string {
	const parts: string[] = [];

	if (def.description) {
		parts.push(def.description);
	}

	const flagMetaChoices = def.choices as readonly string[] | undefined;
	if (flagMetaChoices && flagMetaChoices.length > 0) {
		parts.push(`(${flagMetaChoices.join(" | ")})`);
	}

	if (def.required) {
		parts.push("(required)");
	}

	if (def.default !== undefined) {
		parts.push(`(default: ${def.default})`);
	}

	return parts.join(" ");
}
