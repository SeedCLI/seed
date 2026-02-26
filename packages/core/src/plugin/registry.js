import { PluginValidationError } from "./errors.js";
import { validatePeerDependencies, validatePlugin } from "./validator.js";
/**
 * In-memory registry for loaded and validated plugins.
 */
export class PluginRegistry {
    plugins = new Map();
    /**
     * Register a plugin after validation.
     * Silently deduplicates if a plugin with the same name is already registered.
     * Validates command and extension name conflicts across all plugins.
     */
    register(plugin) {
        const validated = validatePlugin(plugin);
        // Edge case #11: Duplicate plugin → silently deduplicate
        if (this.plugins.has(validated.name)) {
            return;
        }
        // Edge case #1: Command name/alias conflicts
        if (validated.commands) {
            const existingCommands = this.commands();
            for (const cmd of validated.commands) {
                const conflicting = existingCommands.find((existing) => existing.name === cmd.name ||
                    (cmd.alias && existing.alias && cmd.alias.some((a) => existing.alias?.includes(a))));
                if (conflicting) {
                    const conflictPlugin = this.findPluginByCommand(conflicting.name);
                    throw new PluginValidationError(`Command name conflict: Both "${conflictPlugin}" and "${validated.name}" define a command named "${cmd.name}". Rename one of the commands or use aliases to resolve the conflict.`, validated.name);
                }
            }
        }
        // Edge case #2: Extension name conflicts
        if (validated.extensions) {
            const existingExtensions = this.extensions();
            for (const ext of validated.extensions) {
                const conflicting = existingExtensions.find((existing) => existing.name === ext.name);
                if (conflicting) {
                    const conflictPlugin = this.findPluginByExtension(conflicting.name);
                    throw new PluginValidationError(`Extension name conflict: Both "${conflictPlugin}" and "${validated.name}" register an extension named "${ext.name}". Each extension must have a unique name.`, validated.name);
                }
            }
        }
        this.plugins.set(validated.name, validated);
    }
    /** Get a plugin by name. */
    get(name) {
        return this.plugins.get(name);
    }
    /** Check if a plugin is registered. */
    has(name) {
        return this.plugins.has(name);
    }
    /** Get all registered plugins. */
    all() {
        return [...this.plugins.values()];
    }
    /** Aggregate all commands from all registered plugins. */
    commands() {
        const cmds = [];
        for (const plugin of this.plugins.values()) {
            if (plugin.commands) {
                cmds.push(...plugin.commands);
            }
        }
        return cmds;
    }
    /** Aggregate all extensions from all registered plugins. */
    extensions() {
        const exts = [];
        for (const plugin of this.plugins.values()) {
            if (plugin.extensions) {
                exts.push(...plugin.extensions);
            }
        }
        return exts;
    }
    /** Validate peer dependencies across all registered plugins. */
    validateAll() {
        for (const plugin of this.plugins.values()) {
            validatePeerDependencies(plugin, this.plugins);
        }
    }
    /** Find which plugin registered a given command name. */
    findPluginByCommand(cmdName) {
        for (const plugin of this.plugins.values()) {
            if (plugin.commands?.some((c) => c.name === cmdName)) {
                return plugin.name;
            }
        }
        return undefined;
    }
    /** Find which plugin registered a given extension name. */
    findPluginByExtension(extName) {
        for (const plugin of this.plugins.values()) {
            if (plugin.extensions?.some((e) => e.name === extName)) {
                return plugin.name;
            }
        }
        return undefined;
    }
}
//# sourceMappingURL=registry.js.map