import type { Command } from "../types/command.js";
import type { ExtensionConfig } from "../types/extension.js";
import type { PluginConfig } from "../types/plugin.js";
/**
 * In-memory registry for loaded and validated plugins.
 */
export declare class PluginRegistry {
    private plugins;
    /**
     * Register a plugin after validation.
     * Silently deduplicates if a plugin with the same name is already registered.
     * Validates command and extension name conflicts across all plugins.
     */
    register(plugin: PluginConfig): void;
    /** Get a plugin by name. */
    get(name: string): PluginConfig | undefined;
    /** Check if a plugin is registered. */
    has(name: string): boolean;
    /** Get all registered plugins. */
    all(): PluginConfig[];
    /** Aggregate all commands from all registered plugins. */
    commands(): Command[];
    /** Aggregate all extensions from all registered plugins. */
    extensions(): ExtensionConfig[];
    /** Validate peer dependencies across all registered plugins. */
    validateAll(): void;
    /** Find which plugin registered a given command name. */
    private findPluginByCommand;
    /** Find which plugin registered a given extension name. */
    private findPluginByExtension;
}
//# sourceMappingURL=registry.d.ts.map