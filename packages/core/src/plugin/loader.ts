import type { PluginConfig } from "../types/plugin.js";
import { PluginLoadError } from "./errors.js";

/**
 * Load a single plugin from a source.
 * If source is a string, dynamic-imports it (expects default export).
 * If source is an object, uses it directly.
 */
export async function loadPlugin(source: string | PluginConfig): Promise<PluginConfig> {
	if (typeof source !== "string") {
		return source;
	}

	try {
		const mod = await import(source);
		const config = mod.default ?? mod;

		if (!config || typeof config !== "object") {
			throw new PluginLoadError(
				`Plugin "${source}" has an invalid export.\n\n  The default export is not a valid plugin definition.\n\n  A valid plugin must export a definePlugin() result:\n\n    export default definePlugin({\n      name: "my-plugin",\n      commands: [...],\n    });`,
				source,
			);
		}

		return config as PluginConfig;
	} catch (err) {
		if (err instanceof PluginLoadError) {
			throw err;
		}
		const message = err instanceof Error ? err.message : String(err);
		throw new PluginLoadError(
			`Plugin "${source}" not found.\n\n  Could not resolve the module "${source}".\n\n  Make sure it's installed:\n    bun add ${source}\n\n  Original error: ${message}`,
			source,
			{ cause: err },
		);
	}
}

/**
 * Load multiple plugins in parallel. Reports all errors at once rather than
 * failing on the first missing plugin.
 */
export async function loadPlugins(sources: Array<string | PluginConfig>): Promise<PluginConfig[]> {
	const results = await Promise.allSettled(sources.map(loadPlugin));
	const errors: Error[] = [];
	const loaded: PluginConfig[] = [];

	for (const result of results) {
		if (result.status === "fulfilled") {
			loaded.push(result.value);
		} else {
			errors.push(
				result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
			);
		}
	}

	if (errors.length > 0) {
		if (errors.length === 1) {
			throw errors[0];
		}
		throw new PluginLoadError(errors.map((e) => e.message).join("\n\n"), "multiple");
	}

	return loaded;
}
