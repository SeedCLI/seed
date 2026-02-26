import type { PluginConfig } from "../types/plugin.js";
/**
 * Validate a plugin configuration object.
 * Throws PluginValidationError if the config is invalid.
 */
export declare function validatePlugin(config: unknown): PluginConfig;
/**
 * Validate that a plugin's seedcli version requirement is satisfied.
 * Throws PluginValidationError if the running version doesn't satisfy the constraint.
 */
export declare function validateSeedcliVersion(plugin: PluginConfig, runtimeVersion: string): void;
/**
 * Validate that a plugin's peer dependencies are satisfied by the loaded plugins.
 * Throws PluginDependencyError if a peer is missing or incompatible.
 */
export declare function validatePeerDependencies(plugin: PluginConfig, loaded: Map<string, PluginConfig>): void;
//# sourceMappingURL=validator.d.ts.map