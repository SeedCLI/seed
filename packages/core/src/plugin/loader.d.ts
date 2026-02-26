import type { PluginConfig } from "../types/plugin.js";
/**
 * Load a single plugin from a source.
 * If source is a string, dynamic-imports it (expects default export).
 * If source is an object, uses it directly.
 */
export declare function loadPlugin(source: string | PluginConfig): Promise<PluginConfig>;
/**
 * Load multiple plugins in parallel.
 */
export declare function loadPlugins(sources: Array<string | PluginConfig>): Promise<PluginConfig[]>;
//# sourceMappingURL=loader.d.ts.map