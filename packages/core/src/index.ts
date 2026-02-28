/**
 * @seedcli/core — Core runtime for Seed CLI framework.
 *
 * @example
 * ```ts
 * import { command, arg, flag, definePlugin, defineExtension, defineConfig } from "@seedcli/core";
 * ```
 */

export type { HelpOptions } from "./command/help.js";
export { renderCommandHelp, renderGlobalHelp } from "./command/help.js";
export type { ParseResult } from "./command/parser.js";
// ─── Command System ───
export { ParseError, parse } from "./command/parser.js";
export type { CommandSuggestion, RouteResult } from "./command/router.js";
export { flattenCommands, route } from "./command/router.js";
export type { AutoDiscoveryResult } from "./discovery/auto-discover.js";
// ─── Auto-Discovery ───
export {
	DiscoveryError,
	discover,
	discoverCommands,
	discoverExtensions,
} from "./discovery/auto-discover.js";
// ─── Plugin System ───
export {
	ExtensionCycleError,
	ExtensionSetupError,
	PluginDependencyError,
	PluginError,
	PluginLoadError,
	PluginValidationError,
} from "./plugin/errors.js";
export { loadPlugin, loadPlugins } from "./plugin/loader.js";
export { PluginRegistry } from "./plugin/registry.js";
export { topoSort } from "./plugin/topo-sort.js";
export {
	validatePeerDependencies,
	validatePlugin,
	validateSeedcliVersion,
} from "./plugin/validator.js";
export type { BuilderConfig, PluginScanOptions } from "./runtime/builder.js";
// ─── Runtime ───
export { Builder, build } from "./runtime/builder.js";
export type { RunConfig } from "./runtime/runtime.js";
export { Runtime, registerModule, run } from "./runtime/runtime.js";
// ─── Factory Functions ───
export { arg, flag } from "./types/args.js";
export { command } from "./types/command.js";
export { defineConfig } from "./types/config.js";
export { defineExtension } from "./types/extension.js";
// ─── Types ───
export type {
	ArgDef,
	// Args & Flags
	ArgType,
	// Commands
	Command,
	CommandConfig,
	// Config
	CompileTarget,
	// Extension
	ExtensionConfig,
	ExtensionSeed,
	FlagDef,
	FlagType,
	InferArgs,
	InferFlags,
	Middleware,
	// Plugin
	PluginConfig,
	// Modules
	PrintModule,
	ResolveArgType,
	ResolveFlagType,
	// Seed
	Seed,
	SeedConfig,
	SeedExtensions,
	StringsModule,
} from "./types/index.js";
export { definePlugin } from "./types/plugin.js";
