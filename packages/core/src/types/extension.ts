import type { Toolbox } from "./toolbox.js";

/**
 * The toolbox type exposed to extensions.
 * Extensions run before any command, so args/flags are not available.
 * All core modules (print, filesystem, etc.) and ToolboxExtensions are fully typed.
 */
export type ExtensionToolbox = Omit<Toolbox, "args" | "flags">;

/**
 * Extension configuration — defines how a plugin extends the toolbox.
 */
export interface ExtensionConfig {
	/** Extension name (must be unique across all plugins) */
	name: string;

	/** Human-readable description */
	description?: string;

	/** Other extensions this depends on (resolved via topological sort) */
	dependencies?: string[];

	/** Called during toolbox assembly, before any command runs */
	setup: (toolbox: ExtensionToolbox) => Promise<void> | void;

	/** Called during cleanup, after command completes */
	teardown?: (toolbox: ExtensionToolbox) => Promise<void> | void;
}

/**
 * Define an extension with type safety.
 *
 * ```ts
 * const authExtension = defineExtension({
 *   name: "auth",
 *   setup: async (toolbox) => {
 *     toolbox.auth = { getToken: () => "..." };
 *   },
 * });
 * ```
 */
export function defineExtension(config: ExtensionConfig): ExtensionConfig {
	if (!config.name || config.name.trim() === "") {
		throw new Error(
			"Extension name cannot be empty. Provide a name in defineExtension({ name: '...' }).",
		);
	}
	if (typeof config.setup !== "function") {
		throw new Error(
			`Extension "${config.name}" is missing a setup function. Provide setup in defineExtension({ setup: (toolbox) => { ... } }).`,
		);
	}
	return config;
}
