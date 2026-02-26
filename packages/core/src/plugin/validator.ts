import { satisfies, valid } from "@seedcli/semver";
import type { PluginConfig } from "../types/plugin.js";
import { PluginDependencyError, PluginValidationError } from "./errors.js";

const NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Validate a plugin configuration object.
 * Throws PluginValidationError if the config is invalid.
 */
export function validatePlugin(config: unknown): PluginConfig {
	if (!config || typeof config !== "object") {
		throw new PluginValidationError("Plugin config must be a non-null object", "unknown");
	}

	const c = config as Record<string, unknown>;

	if (typeof c.name !== "string" || c.name.length === 0) {
		throw new PluginValidationError(
			"Plugin must have a non-empty string 'name'.\n\nA valid plugin must export a definePlugin() result:\n\n  export default definePlugin({\n    name: \"my-plugin\",\n    commands: [...],\n  });",
			String(c.name ?? "unknown"),
		);
	}

	if (!NAME_PATTERN.test(c.name)) {
		throw new PluginValidationError(
			`Plugin name "${c.name}" is invalid. Must be lowercase alphanumeric and hyphens, cannot start with hyphen.`,
			c.name,
		);
	}

	if (typeof c.version !== "string" || !valid(c.version)) {
		throw new PluginValidationError(
			`Plugin "${c.name}" has invalid version "${String(c.version)}". Must be valid semver.`,
			c.name,
		);
	}

	if (c.commands !== undefined && !Array.isArray(c.commands)) {
		throw new PluginValidationError(`Plugin "${c.name}" commands must be an array`, c.name);
	}

	if (c.extensions !== undefined && !Array.isArray(c.extensions)) {
		throw new PluginValidationError(`Plugin "${c.name}" extensions must be an array`, c.name);
	}

	return config as PluginConfig;
}

/**
 * Validate that a plugin's seedcli version requirement is satisfied.
 * Throws PluginValidationError if the running version doesn't satisfy the constraint.
 */
export function validateSeedcliVersion(plugin: PluginConfig, runtimeVersion: string): void {
	if (!plugin.seedcli) return;

	if (!satisfies(runtimeVersion, plugin.seedcli)) {
		throw new PluginValidationError(
			`Plugin "${plugin.name}" requires Seed CLI ${plugin.seedcli}\n\n  Current Seed CLI version: ${runtimeVersion}\n  Required by plugin:       ${plugin.seedcli}\n\n  Upgrade Seed CLI:\n    bun update @seedcli/core`,
			plugin.name,
		);
	}
}

/**
 * Validate that a plugin's peer dependencies are satisfied by the loaded plugins.
 * Throws PluginDependencyError if a peer is missing or incompatible.
 */
export function validatePeerDependencies(
	plugin: PluginConfig,
	loaded: Map<string, PluginConfig>,
): void {
	if (!plugin.peerPlugins) return;

	for (const [peerName, versionRange] of Object.entries(plugin.peerPlugins)) {
		const peer = loaded.get(peerName);

		if (!peer) {
			throw new PluginDependencyError(
				`Plugin "${plugin.name}" requires peer plugin "${peerName}" but it is not loaded.\n\n  Install the required plugin:\n    bun add @mycli/plugin-${peerName}`,
				plugin.name,
				peerName,
			);
		}

		if (!satisfies(peer.version, versionRange)) {
			throw new PluginDependencyError(
				`Plugin "${plugin.name}" requires "${peerName}@${versionRange}" but found "${peer.version}".\n\n  Upgrade the plugin:\n    bun update @mycli/plugin-${peerName}`,
				plugin.name,
				peerName,
			);
		}
	}
}
