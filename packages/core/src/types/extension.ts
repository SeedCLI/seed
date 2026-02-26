import type { Toolbox } from "./toolbox.js";

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
	setup: (
		toolbox: Toolbox<Record<string, unknown>, Record<string, unknown>>,
	) => Promise<void> | void;

	/** Called during cleanup, after command completes */
	teardown?: (
		toolbox: Toolbox<Record<string, unknown>, Record<string, unknown>>,
	) => Promise<void> | void;
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
	return config;
}
