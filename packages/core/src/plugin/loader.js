import { PluginLoadError } from "./errors.js";
/**
 * Load a single plugin from a source.
 * If source is a string, dynamic-imports it (expects default export).
 * If source is an object, uses it directly.
 */
export async function loadPlugin(source) {
    if (typeof source !== "string") {
        return source;
    }
    try {
        const mod = await import(source);
        const config = mod.default ?? mod;
        if (!config || typeof config !== "object") {
            throw new PluginLoadError(`Plugin "${source}" has an invalid export.\n\n  The default export is not a valid plugin definition.\n\n  A valid plugin must export a definePlugin() result:\n\n    export default definePlugin({\n      name: "my-plugin",\n      commands: [...],\n    });`, source);
        }
        return config;
    }
    catch (err) {
        if (err instanceof PluginLoadError) {
            throw err;
        }
        const message = err instanceof Error ? err.message : String(err);
        throw new PluginLoadError(`Plugin "${source}" not found.\n\n  Could not resolve the module "${source}".\n\n  Make sure it's installed:\n    bun add ${source}\n\n  Original error: ${message}`, source);
    }
}
/**
 * Load multiple plugins in parallel.
 */
export async function loadPlugins(sources) {
    return Promise.all(sources.map(loadPlugin));
}
//# sourceMappingURL=loader.js.map