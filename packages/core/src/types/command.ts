import type { ArgDef, FlagDef, InferArgs, InferFlags } from "./args.js";
import type { Toolbox } from "./toolbox.js";

// ─── Middleware ───

export type Middleware = (
	toolbox: Toolbox<Record<string, unknown>, Record<string, unknown>>,
	next: () => Promise<void>,
) => Promise<void> | void;

// ─── Command Definition ───

export interface CommandConfig<
	TArgs extends Record<string, ArgDef> = Record<string, ArgDef>,
	TFlags extends Record<string, FlagDef> = Record<string, FlagDef>,
> {
	/** Command name (used for routing) */
	name: string;

	/** Human-readable description (shown in help) */
	description?: string;

	/** Alternative names for this command */
	alias?: string[];

	/** Hide from help output */
	hidden?: boolean;

	/** Positional argument definitions */
	args?: TArgs;

	/** Flag/option definitions */
	flags?: TFlags;

	/** Nested subcommands */
	subcommands?: Command[];

	/** Per-command middleware */
	middleware?: Middleware[];

	/** The command handler */
	run?: (toolbox: Toolbox<InferArgs<TArgs>, InferFlags<TFlags>>) => Promise<void> | void;
}

/**
 * A resolved command object (output of `command()`).
 */
export interface Command {
	name: string;
	description?: string;
	alias?: string[];
	hidden?: boolean;
	args?: Record<string, ArgDef>;
	flags?: Record<string, FlagDef>;
	subcommands?: Command[];
	middleware?: Middleware[];
	run?: (
		toolbox: Toolbox<Record<string, unknown>, Record<string, unknown>>,
	) => Promise<void> | void;
}

// ─── Command Factory ───

/**
 * Define a command with full type inference for args and flags.
 *
 * ```ts
 * const greet = command({
 *   name: "greet",
 *   args: {
 *     name: arg({ type: "string", required: true }),
 *   },
 *   flags: {
 *     loud: flag({ type: "boolean", default: false }),
 *   },
 *   run: async ({ args, flags, print }) => {
 *     // args.name: string (inferred as required)
 *     // flags.loud: boolean (inferred from default)
 *     const msg = `Hello, ${args.name}!`;
 *     print.info(flags.loud ? msg.toUpperCase() : msg);
 *   },
 * });
 * ```
 */
const COMMAND_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export function command<
	TArgs extends Record<string, ArgDef>,
	TFlags extends Record<string, FlagDef>,
>(config: CommandConfig<TArgs, TFlags>): Command {
	if (!config.name || config.name.trim() === "") {
		throw new Error("Command name cannot be empty");
	}
	if (!COMMAND_NAME_PATTERN.test(config.name)) {
		throw new Error(
			`Invalid command name "${config.name}". Command names must be lowercase alphanumeric with hyphens (e.g., "deploy", "db-migrate").`,
		);
	}
	if (!config.run && (!config.subcommands || config.subcommands.length === 0)) {
		console.warn(
			`[seedcli] Warning: command "${config.name}" has no "run" handler or "subcommands". It will do nothing when executed.`,
		);
	}
	return config as unknown as Command;
}
