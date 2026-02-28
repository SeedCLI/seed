import type { Seed } from "./seed.js";

/**
 * The seed type exposed to extensions.
 * Extensions run before any command, so args/flags are not available.
 * All core modules (print, filesystem, etc.) and SeedExtensions are fully typed.
 */
export type ExtensionSeed = Omit<Seed, "args" | "flags">;

/**
 * Extension configuration — defines how a plugin extends the seed context.
 */
export interface ExtensionConfig {
	/** Extension name (must be unique across all plugins) */
	name: string;

	/** Human-readable description */
	description?: string;

	/** Other extensions this depends on (resolved via topological sort) */
	dependencies?: string[];

	/** Called during seed assembly, before any command runs */
	setup: (seed: ExtensionSeed) => Promise<void> | void;

	/** Called during cleanup, after command completes */
	teardown?: (seed: ExtensionSeed) => Promise<void> | void;
}

/**
 * Define an extension with type safety.
 *
 * ```ts
 * const authExtension = defineExtension({
 *   name: "auth",
 *   setup: async (seed) => {
 *     seed.auth = { getToken: () => "..." };
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
			`Extension "${config.name}" is missing a setup function. Provide setup in defineExtension({ setup: (seed) => { ... } }).`,
		);
	}
	return config;
}
