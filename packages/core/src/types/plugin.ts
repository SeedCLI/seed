import type { Command } from "./command.js";
import type { ExtensionConfig } from "./extension.js";

/**
 * Plugin definition — the shape returned by `definePlugin()`.
 */
export interface PluginConfig {
	/** Plugin name (lowercase, alphanumeric, hyphens) */
	name: string;

	/** Human-readable description */
	description?: string;

	/** Plugin version (semver) */
	version: string;

	/** Seed CLI framework version range requirement (e.g. ">=1.0.0") */
	seedcli?: string;

	/** Peer plugin dependencies with version ranges */
	peerPlugins?: Record<string, string>;

	/** Commands contributed by this plugin */
	commands?: Command[];

	/** Extensions contributed by this plugin */
	extensions?: ExtensionConfig[];

	/** Path to templates directory */
	templates?: string;

	/** Default configuration values */
	defaults?: Record<string, unknown>;
}

/**
 * Define a plugin with type safety.
 *
 * ```ts
 * export default definePlugin({
 *   name: "deploy",
 *   version: "1.0.0",
 *   seedcli: ">=1.0.0",
 *   commands: [deployCmd],
 *   extensions: [deployExtension],
 * });
 * ```
 */
export function definePlugin(config: PluginConfig): PluginConfig {
	return config;
}
