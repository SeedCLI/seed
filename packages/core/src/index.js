/**
 * @seedcli/core — Core runtime for Seed CLI framework.
 *
 * @example
 * ```ts
 * import { command, arg, flag, definePlugin, defineExtension, defineConfig } from "@seedcli/core";
 * ```
 */
export { renderCommandHelp, renderGlobalHelp } from "./command/help.js";
// ─── Command System ───
export { ParseError, parse } from "./command/parser.js";
export { flattenCommands, route } from "./command/router.js";
// ─── Auto-Discovery ───
export { DiscoveryError, discover, discoverCommands, discoverExtensions, } from "./discovery/auto-discover.js";
// ─── Plugin System ───
export { ExtensionCycleError, ExtensionSetupError, PluginDependencyError, PluginError, PluginLoadError, PluginValidationError, } from "./plugin/errors.js";
export { loadPlugin, loadPlugins } from "./plugin/loader.js";
export { PluginRegistry } from "./plugin/registry.js";
export { topoSort } from "./plugin/topo-sort.js";
export { validatePeerDependencies, validatePlugin, validateSeedcliVersion, } from "./plugin/validator.js";
// ─── Runtime ───
export { build } from "./runtime/builder.js";
export { Runtime, run } from "./runtime/runtime.js";
// ─── Factory Functions ───
export { arg, flag } from "./types/args.js";
export { command } from "./types/command.js";
export { defineConfig } from "./types/config.js";
export { defineExtension } from "./types/extension.js";
export { definePlugin } from "./types/plugin.js";
//# sourceMappingURL=index.js.map